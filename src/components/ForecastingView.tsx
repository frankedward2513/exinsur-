import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import {
  TrendingUp,
  Award,
  PieChart,
  Calendar,
  Filter,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const ForecastingView: React.FC = () => {
  const { orders, transactions, categories, products, itemStatusLogs, logItemStatus } = useStore();

  // 3 Tabs / Buttons
  const [activeTab, setActiveTab] = useState<'ewma' | 'top_customers' | 'status_breakdown'>('ewma');

  // ===================== 1. EWMA FORECASTING STATE =====================
  const [alpha, setAlpha] = useState<number>(0.3); // alpha factor (0.1 to 0.9)
  const [forecastHorizon, setForecastHorizon] = useState<1 | 3 | 7>(3); // 1, 3, or 7 days ahead
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Historical daily sales data (aggregating past 14 days)
  const ewmaData = useMemo(() => {
    const daysCount = 14;
    const history: { dateStr: string; label: string; actual: number }[] = [];
    const now = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });

      // Calculate actual sales for this date
      let daySales = 0;

      // Filter from orders
      orders.forEach((o) => {
        if (o.status !== 'cancelled' && o.createdAt.startsWith(dateStr)) {
          if (selectedCategory === 'all') {
            daySales += o.totalAmount;
          } else {
            o.items.forEach((it) => {
              const prod = products.find((p) => p.id === it.productId);
              if (prod?.category?.toLowerCase() === selectedCategory.toLowerCase()) {
                daySales += it.price * it.quantity;
              }
            });
          }
        }
      });

      // Also filter from transactions if orders were not matched
      if (daySales === 0 && selectedCategory === 'all') {
        const txInflows = transactions
          .filter((t) => t.flowType === 'inflow' && (t.date === dateStr || t.createdAt.startsWith(dateStr)))
          .reduce((sum, t) => sum + t.inflow, 0);
        daySales = txInflows;
      }

      history.push({ dateStr, label, actual: daySales });
    }

    // Compute EWMA: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
    const computedPoints: {
      dateStr: string;
      label: string;
      actual: number;
      predicted: number;
      isForecast?: boolean;
    }[] = [];

    let currentS = history[0].actual;

    history.forEach((pt, idx) => {
      if (idx === 0) {
        currentS = pt.actual;
      } else {
        currentS = alpha * pt.actual + (1 - alpha) * currentS;
      }
      computedPoints.push({
        dateStr: pt.dateStr,
        label: pt.label,
        actual: pt.actual,
        predicted: Math.round(currentS),
      });
    });

    // Generate forecast horizon points (1 day ahead, 3 days ahead, or 7 days ahead)
    const futureForecasts: typeof computedPoints = [];
    for (let h = 1; h <= forecastHorizon; h++) {
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + h);
      const label = `+${h}d (${futureDate.toLocaleDateString('default', { month: 'short', day: 'numeric' })})`;
      futureForecasts.push({
        dateStr: futureDate.toISOString().split('T')[0],
        label,
        actual: 0,
        predicted: Math.round(currentS),
        isForecast: true,
      });
    }

    return {
      historyPoints: computedPoints,
      forecastPoints: futureForecasts,
      allPoints: [...computedPoints, ...futureForecasts],
      currentSmoothedLevel: Math.round(currentS),
    };
  }, [orders, transactions, products, selectedCategory, alpha, forecastHorizon]);

  // SVG dimensions for EWMA line graph
  const maxSales = Math.max(
    ...ewmaData.allPoints.map((p) => Math.max(p.actual, p.predicted)),
    1000
  );
  const chartW = 750;
  const chartH = 240;
  const pad = { top: 25, right: 40, bottom: 40, left: 60 };
  const gW = chartW - pad.left - pad.right;
  const gH = chartH - pad.top - pad.bottom;

  const getEwmaX = (idx: number) => pad.left + (idx / (ewmaData.allPoints.length - 1)) * gW;
  const getEwmaY = (val: number) => pad.top + gH - (val / maxSales) * gH;

  const actualPointsString = ewmaData.historyPoints
    .map((p, i) => `${getEwmaX(i)},${getEwmaY(p.actual)}`)
    .join(' ');

  const predictedPointsString = ewmaData.allPoints
    .map((p, i) => `${getEwmaX(i)},${getEwmaY(p.predicted)}`)
    .join(' ');

  // ===================== 2. TOP 10 CUSTOMER SPENDERS =====================
  const top10Customers = useMemo(() => {
    const customerMap: Record<string, { name: string; totalOrders: number; totalSpent: number }> = {};

    orders.forEach((o) => {
      if (o.status !== 'cancelled') {
        const name = o.customerName?.trim() || 'Online Customer';
        if (!customerMap[name]) {
          customerMap[name] = { name, totalOrders: 0, totalSpent: 0 };
        }
        customerMap[name].totalOrders += 1;
        customerMap[name].totalSpent += o.totalAmount;
      }
    });

    const list = Object.values(customerMap);
    list.sort((a, b) => b.totalSpent - a.totalSpent);
    return list.slice(0, 10);
  }, [orders]);

  // ===================== 3. TRANSACTIONS BREAKDOWN: SOLD, RETURNED, DAMAGED, LOST =====================
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logProductId, setLogProductId] = useState('');
  const [logType, setLogType] = useState<'returned' | 'damaged' | 'lost'>('returned');
  const [logQty, setLogQty] = useState<number>(1);
  const [logNotes, setLogNotes] = useState('');

  const statusStats = useMemo(() => {
    let soldCount = 0;
    let returnedCount = 0;
    let damagedCount = 0;
    let lostCount = 0;

    // From completed orders
    orders.forEach((o) => {
      if (o.status === 'completed' || o.status === 'dropped_to_courier' || o.status === 'preparing') {
        o.items.forEach((it) => {
          soldCount += it.quantity;
        });
      } else if (o.status === 'cancelled') {
        o.items.forEach((it) => {
          returnedCount += it.quantity;
        });
      }
    });

    // From explicit item status logs
    itemStatusLogs.forEach((log) => {
      if (log.type === 'sold') soldCount += log.quantity;
      else if (log.type === 'returned') returnedCount += log.quantity;
      else if (log.type === 'damaged') damagedCount += log.quantity;
      else if (log.type === 'lost') lostCount += log.quantity;
    });

    const total = soldCount + returnedCount + damagedCount + lostCount;
    const calcPct = (cnt: number) => (total > 0 ? ((cnt / total) * 100).toFixed(1) : '0.0');

    return {
      sold: { count: soldCount, pct: calcPct(soldCount) },
      returned: { count: returnedCount, pct: calcPct(returnedCount) },
      damaged: { count: damagedCount, pct: calcPct(damagedCount) },
      lost: { count: lostCount, pct: calcPct(lostCount) },
      total,
    };
  }, [orders, itemStatusLogs]);

  const handleCreateStatusLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logProductId || logQty <= 0) return;

    const prod = products.find((p) => p.id === logProductId);
    if (!prod) return;

    await logItemStatus({
      productId: prod.id,
      productName: prod.name,
      type: logType,
      quantity: logQty,
      notes: logNotes,
      adjustStock: true,
    });

    setLogModalOpen(false);
    setLogNotes('');
    setLogQty(1);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 3 Main Tabs */}
      <div className="p-3 rounded-2xl glass-panel flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('ewma')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'ewma'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <span>EWMA Sales Forecasting</span>
        </button>

        <button
          onClick={() => setActiveTab('top_customers')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'top_customers'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <Award className="w-4 h-4 text-orange-400" />
          <span>Top 10 Customer Spenders</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono">
            {top10Customers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('status_breakdown')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'status_breakdown'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <PieChart className="w-4 h-4 text-orange-400" />
          <span>Transactions: Sold, Returned, Damaged, Lost</span>
        </button>
      </div>

      {/* ===================== TAB 1: EWMA SALES FORECASTING ===================== */}
      {activeTab === 'ewma' && (
        <div className="space-y-6">
          {/* Controls Bar: Alpha factor, Forecast Horizon, Category Filter */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-500/20">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  <span>Exponentially Weighted Moving Average (EWMA) Sales Model</span>
                </h2>
                <p className="text-xs text-stone-400 font-mono">
                  Sₜ = α·Yₜ + (1 - α)·Sₜ₋₁ (Weights recent sales momentum smoothly)
                </p>
              </div>

              {/* Smoothed Forecast Summary Badge */}
              <div className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-right">
                <p className="text-[10px] text-stone-400 uppercase font-mono">Current Predicted Level</p>
                <p className="text-lg font-black text-orange-400 font-mono">
                  ₱{ewmaData.currentSmoothedLevel.toLocaleString()} / day
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
              {/* Alpha Factor Selection */}
              <div className="space-y-1.5 bg-stone-950/70 p-3 rounded-2xl border border-orange-500/20">
                <div className="flex justify-between font-medium">
                  <span className="text-stone-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-orange-400" />
                    Smoothing Factor (Alpha α):
                  </span>
                  <span className="font-mono font-bold text-orange-400 text-sm">{alpha}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>0.1 (Smoother / Stable)</span>
                  <span>0.9 (Reactive / Agile)</span>
                </div>
              </div>

              {/* Forecast Horizon: 1, 3, or 7 days ahead */}
              <div className="space-y-1.5 bg-stone-950/70 p-3 rounded-2xl border border-orange-500/20">
                <label className="block text-stone-300 font-medium">
                  Forecast Horizon (Days Ahead):
                </label>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[1, 3, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setForecastHorizon(days as any)}
                      className={`py-1.5 px-2 rounded-xl font-bold text-xs transition cursor-pointer ${
                        forecastHorizon === days
                          ? 'bg-orange-600 text-white shadow-sm'
                          : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                      }`}
                    >
                      {days} {days === 1 ? 'Day' : 'Days'} Ahead
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-1.5 bg-stone-950/70 p-3 rounded-2xl border border-orange-500/20">
                <label className="block text-stone-300 font-medium">Per Category Forecast:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-orange-500/20 text-stone-100 text-xs focus:border-orange-500 focus:outline-none"
                >
                  <option value="all">All Store Categories Combined</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Line Graph of Actual vs Predicted EWMA Sales */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-orange-500/20">
              <h3 className="text-base font-bold text-white">
                Sales Forecast Graph (Actual vs Predicted EWMA)
              </h3>

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-orange-500 inline-block" />
                  <span className="text-orange-400">Actual Historical Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 inline-block" />
                  <span className="text-cyan-400">Predicted (EWMA) & {forecastHorizon}d Forecast</span>
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto pt-4">
              <div className="min-w-[700px]">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto overflow-visible">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = pad.top + gH * (1 - pct);
                    const val = Math.round(maxSales * pct);
                    return (
                      <g key={idx}>
                        <line
                          x1={pad.left}
                          y1={y}
                          x2={chartW - pad.right}
                          y2={y}
                          stroke="rgba(249, 115, 22, 0.15)"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={pad.left - 10}
                          y={y + 4}
                          textAnchor="end"
                          className="text-[10px] fill-stone-400 font-mono"
                        >
                          ₱{val.toLocaleString()}
                        </text>
                      </g>
                    );
                  })}

                  {/* Forecast Region Background Shade */}
                  {ewmaData.forecastPoints.length > 0 && (
                    <rect
                      x={getEwmaX(ewmaData.historyPoints.length - 1)}
                      y={pad.top}
                      width={chartW - pad.right - getEwmaX(ewmaData.historyPoints.length - 1)}
                      height={gH}
                      fill="rgba(6, 182, 212, 0.08)"
                      stroke="rgba(6, 182, 212, 0.2)"
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Actual Sales Line (Orange) */}
                  <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={actualPointsString}
                  />

                  {/* Predicted Line (Cyan) */}
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={predictedPointsString}
                  />

                  {/* Points */}
                  {ewmaData.allPoints.map((pt, idx) => {
                    const x = getEwmaX(idx);
                    const yActual = getEwmaY(pt.actual);
                    const yPred = getEwmaY(pt.predicted);

                    return (
                      <g key={idx}>
                        {/* Actual dot (history only) */}
                        {!pt.isForecast && (
                          <circle cx={x} cy={yActual} r="4.5" fill="#f97316" stroke="#431407" strokeWidth="2" />
                        )}

                        {/* Predicted dot */}
                        <circle
                          cx={x}
                          cy={yPred}
                          r={pt.isForecast ? '5.5' : '3.5'}
                          fill={pt.isForecast ? '#22d3ee' : '#06b6d4'}
                          stroke="#083344"
                          strokeWidth="2"
                        />

                        {/* X-axis label */}
                        <text
                          x={x}
                          y={chartH - 12}
                          textAnchor="middle"
                          className={`text-[9px] font-mono ${
                            pt.isForecast ? 'fill-cyan-400 font-bold' : 'fill-stone-400'
                          }`}
                        >
                          {pt.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: TOP 10 CUSTOMER SPENDERS ===================== */}
      {activeTab === 'top_customers' && (
        <div className="p-6 rounded-3xl glass-panel space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-orange-400" />
                <span>Top 10 Valued Customer Spenders</span>
              </h2>
              <p className="text-xs text-stone-400">
                Ranked by total expenditure across all sales channels. Top 3 receive special VIP recognition badges.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono">
              {top10Customers.length} Spenders
            </span>
          </div>

          {top10Customers.length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-2">
              <Award className="w-12 h-12 mx-auto text-stone-600" />
              <p className="text-sm">No customer purchase records recorded yet.</p>
              <p className="text-xs">
                As customers place orders or shop via POS, top spenders will automatically be calculated and awarded #1, #2, #3 badges here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {top10Customers.map((cust, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;

                return (
                  <div
                    key={cust.name}
                    className={`p-4 rounded-2xl flex items-center justify-between border transition ${
                      rank === 1
                        ? 'bg-gradient-to-r from-amber-950/70 via-stone-900 to-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-500/10'
                        : rank === 2
                        ? 'bg-stone-900/90 border-stone-500/50'
                        : rank === 3
                        ? 'bg-stone-900/90 border-amber-700/50'
                        : 'bg-stone-950/60 border-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Rank Badge: #1, #2, #3 */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-md ${
                          rank === 1
                            ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-stone-950 font-black'
                            : rank === 2
                            ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-stone-950 font-black'
                            : rank === 3
                            ? 'bg-gradient-to-br from-amber-700 to-amber-900 text-white font-black'
                            : 'bg-stone-800 text-stone-400 font-mono'
                        }`}
                      >
                        #{rank}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{cust.name}</h4>
                          {isTop3 && (
                            <span className="text-xs">
                              {rank === 1 ? '🥇 VIP Gold' : rank === 2 ? '🥈 Silver' : '🥉 Bronze'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400">
                          {cust.totalOrders} {cust.totalOrders === 1 ? 'order' : 'orders'} completed
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] uppercase text-stone-400 font-mono">Total Spent</p>
                      <p className="text-base font-black text-orange-400 font-mono">
                        ₱{cust.totalSpent.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 3: TRANSACTIONS BREAKDOWN: SOLD, RETURNED, DAMAGED, LOST ===================== */}
      {activeTab === 'status_breakdown' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl glass-panel space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-500/20">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-orange-400" />
                  <span>Item Disposition Breakdown: Sold, Returned, Damaged, Lost</span>
                </h2>
                <p className="text-xs text-stone-400">
                  Comprehensive audit of item status percentages with visual progress bars
                </p>
              </div>

              {/* Log Event Button */}
              <button
                onClick={() => setLogModalOpen(true)}
                className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                + Log Return / Damage / Loss
              </button>
            </div>

            {/* 4 Progress Bar Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sold */}
              <div className="p-5 rounded-2xl glass-panel border border-emerald-500/30 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold uppercase tracking-wider text-emerald-400">Sold Items</span>
                  <span className="font-mono font-bold text-white">{statusStats.sold.count} pcs</span>
                </div>
                <div className="w-full h-3 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, Number(statusStats.sold.pct))}%` }}
                  />
                </div>
                <p className="text-right text-xs font-mono font-bold text-emerald-400">
                  {statusStats.sold.pct}% of total
                </p>
              </div>

              {/* Returned */}
              <div className="p-5 rounded-2xl glass-panel border border-amber-500/30 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold uppercase tracking-wider text-amber-400">Returned</span>
                  <span className="font-mono font-bold text-white">{statusStats.returned.count} pcs</span>
                </div>
                <div className="w-full h-3 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, Number(statusStats.returned.pct))}%` }}
                  />
                </div>
                <p className="text-right text-xs font-mono font-bold text-amber-400">
                  {statusStats.returned.pct}% of total
                </p>
              </div>

              {/* Damaged */}
              <div className="p-5 rounded-2xl glass-panel border border-rose-500/30 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold uppercase tracking-wider text-rose-400">Damaged</span>
                  <span className="font-mono font-bold text-white">{statusStats.damaged.count} pcs</span>
                </div>
                <div className="w-full h-3 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-red-600 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, Number(statusStats.damaged.pct))}%` }}
                  />
                </div>
                <p className="text-right text-xs font-mono font-bold text-rose-400">
                  {statusStats.damaged.pct}% of total
                </p>
              </div>

              {/* Lost */}
              <div className="p-5 rounded-2xl glass-panel border border-purple-500/30 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold uppercase tracking-wider text-purple-400">Lost</span>
                  <span className="font-mono font-bold text-white">{statusStats.lost.count} pcs</span>
                </div>
                <div className="w-full h-3 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, Number(statusStats.lost.pct))}%` }}
                  />
                </div>
                <p className="text-right text-xs font-mono font-bold text-purple-400">
                  {statusStats.lost.pct}% of total
                </p>
              </div>
            </div>

            {/* Total items tracked info */}
            <div className="p-4 rounded-2xl bg-stone-950/70 border border-orange-500/20 text-xs text-stone-300 flex items-center justify-between">
              <span>Total Inventory Dispositions Tracked:</span>
              <span className="font-mono font-bold text-orange-400 text-sm">
                {statusStats.total} units
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Log Return / Damage / Loss Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-stone-900 border border-orange-500/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl text-stone-100">
            <button
              onClick={() => setLogModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              Log Inventory Disposition Event
            </h3>

            <form onSubmit={handleCreateStatusLog} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-stone-300 mb-1">Select Product *</label>
                <select
                  required
                  value={logProductId}
                  onChange={(e) => setLogProductId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:outline-none"
                >
                  <option value="">Select Product Item</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (In Stock: {p.availableQuantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-stone-300 mb-1">Event Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['returned', 'damaged', 'lost'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLogType(t)}
                      className={`py-2 px-3 rounded-xl border uppercase font-bold text-[11px] capitalize cursor-pointer transition ${
                        logType === t
                          ? 'bg-orange-600 text-white border-orange-500'
                          : 'bg-stone-950 border-stone-800 text-stone-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-300 mb-1">Quantity (pcs) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={logQty}
                  onChange={(e) => setLogQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-300 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Size didn't fit, zipper damaged during transit..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Record Disposition & Adjust Stock
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
