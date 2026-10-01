import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import {
  TrendingUp,
  Calendar,
  Filter,
  Sliders,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';

export const ForecastingView: React.FC = () => {
  const { orders, transactions, categories, products } = useStore();

  // ===================== EWMA SALES FORECASTING STATE =====================
  const [alpha, setAlpha] = useState<number>(0.3); // alpha factor (0.1 to 0.9)
  const [forecastHorizon, setForecastHorizon] = useState<1 | 3 | 7>(3); // 1, 3, or 7 days ahead
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Scrolling & Responsive width refs
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const chartScrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(850);
  const [hoveredPoint, setHoveredPoint] = useState<{
    dateStr: string;
    label: string;
    dayOfWeek: string;
    actual: number;
    predicted: number;
    isForecast?: boolean;
    forecastDayNumber?: number;
    idx: number;
  } | null>(null);

  // Measure container width for responsive point spacing
  useEffect(() => {
    if (!chartWrapperRef.current) return;
    const updateWidth = () => {
      if (chartWrapperRef.current) {
        const w = chartWrapperRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Historical daily sales data (30 days total to enable horizontal scroll look back)
  const ewmaData = useMemo(() => {
    const totalHistoryDays = 30; // 30 days historical data
    const history: { dateStr: string; label: string; dayOfWeek: string; actual: number }[] = [];
    const now = new Date();

    for (let i = totalHistoryDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      const dayOfWeek = d.toLocaleDateString('default', { weekday: 'short' });

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

      history.push({ dateStr, label, dayOfWeek, actual: daySales });
    }

    // Compute EWMA: S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
    const computedPoints: {
      dateStr: string;
      label: string;
      dayOfWeek: string;
      actual: number;
      predicted: number;
      isForecast?: boolean;
      forecastDayNumber?: number;
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
        dayOfWeek: pt.dayOfWeek,
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
      const dayOfWeek = futureDate.toLocaleDateString('default', { weekday: 'short' });
      futureForecasts.push({
        dateStr: futureDate.toISOString().split('T')[0],
        label,
        dayOfWeek,
        actual: 0,
        predicted: Math.round(currentS),
        isForecast: true,
        forecastDayNumber: h,
      });
    }

    return {
      historyPoints: computedPoints,
      forecastPoints: futureForecasts,
      allPoints: [...computedPoints, ...futureForecasts],
      currentSmoothedLevel: Math.round(currentS),
      totalHistoryDays,
    };
  }, [orders, transactions, products, selectedCategory, alpha, forecastHorizon]);

  // Auto-scroll to latest (showing 7 actual days + forecast horizon)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (chartScrollRef.current) {
        chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [forecastHorizon, selectedCategory, containerWidth]);

  // Visible dates count = 7 actual sales + forecast horizon (1 => 8, 3 => 10, 7 => 14)
  const visibleDatesCount = 7 + forecastHorizon;

  // SVG dimensions for EWMA line graph
  const maxSales = Math.max(
    ...ewmaData.allPoints.map((p) => Math.max(p.actual, p.predicted)),
    1000
  );
  const chartH = 260;
  const pad = { top: 30, right: 45, bottom: 45, left: 30 };
  const gH = chartH - pad.top - pad.bottom;

  // Available plot width excluding the pinned 68px Y-axis on the left
  const availablePlotWidth = Math.max(340, containerWidth - 76);

  // Column gap so that exactly visibleDatesCount dates fit the visible window
  // 1 day ahead => 8 dates visible; 3 days ahead => 10 dates visible; 7 days ahead => 14 dates visible
  const pointGap = Math.max(
    76,
    Math.floor((availablePlotWidth - pad.left - pad.right) / Math.max(1, visibleDatesCount - 1))
  );

  const totalChartW = pad.left + pad.right + (ewmaData.allPoints.length - 1) * pointGap;

  const getEwmaX = (idx: number) => pad.left + idx * pointGap;
  const getEwmaY = (val: number) => pad.top + gH - (val / maxSales) * gH;

  const actualPointsString = ewmaData.historyPoints
    .map((p, i) => `${getEwmaX(i)},${getEwmaY(p.actual)}`)
    .join(' ');

  const predictedPointsString = ewmaData.allPoints
    .map((p, i) => `${getEwmaX(i)},${getEwmaY(p.predicted)}`)
    .join(' ');

  const lastHistoryIdx = ewmaData.historyPoints.length - 1;
  const dividerX = getEwmaX(lastHistoryIdx) + pointGap / 2;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Controls Bar: Alpha factor, Forecast Horizon, Category Filter */}
      <div className="p-6 rounded-3xl glass-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-500/20">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <span>Sales Forecast (EWMA Momentum Model)</span>
            </h2>
            <p className="text-xs text-stone-400 font-mono">
              Sₜ = α·Yₜ + (1 - α)·Sₜ₋₁ (Predicts upcoming store sales using historical momentum)
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
          <div ref={chartWrapperRef} className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-orange-500/20">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                  <span>Sales Forecast Graph (Actual vs Predicted EWMA)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Showing 7 days actual sales + {forecastHorizon} forecast day{forecastHorizon > 1 ? 's' : ''} ({visibleDatesCount} dates total).
                  Use the horizontal scrollbar to look back up to 30 days of past sales.
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500 inline-block shadow-sm shadow-orange-500/50" />
                  <span className="text-orange-400">Actual Historical Sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400/50" />
                  <span className="text-cyan-400">Predicted (EWMA) & +{forecastHorizon}d Forecast</span>
                </div>
              </div>
            </div>

            {/* Pinned Y-Axis + Horizontally Scrollable Plot Area */}
            <div className="relative rounded-2xl bg-stone-950/80 border border-stone-800/80 overflow-hidden">
              {/* Header Status Bar inside plot */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-stone-900/60 border-b border-stone-800/80 text-[11px]">
                <div className="flex items-center gap-2 text-stone-300">
                  <Info className="w-3.5 h-3.5 text-orange-400" />
                  <span>
                    Viewing: <strong className="text-white">7 Days Actual + {forecastHorizon}d Forecast</strong> ({visibleDatesCount} visible dates)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                  <span>Scroll horizontal ← → to look back</span>
                </span>
              </div>

              <div className="flex items-stretch relative">
                {/* Fixed Y-Axis Scale on Left */}
                <div className="w-16 shrink-0 flex flex-col justify-between py-6 text-right pr-2 select-none border-r border-stone-800/80 z-10 bg-stone-950/90 backdrop-blur-sm">
                  {[1, 0.75, 0.5, 0.25, 0].map((pct, idx) => {
                    const val = Math.round(maxSales * pct);
                    return (
                      <div key={idx} className="text-[10px] font-mono text-stone-400">
                        ₱{val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : val}
                      </div>
                    );
                  })}
                </div>

                {/* Horizontally Scrollable SVG Chart */}
                <div
                  ref={chartScrollRef}
                  className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-orange-500/40 hover:scrollbar-thumb-orange-500 scrollbar-track-stone-900 pb-3 pt-2"
                >
                  <div style={{ width: `${totalChartW}px` }}>
                    <svg
                      viewBox={`0 0 ${totalChartW} ${chartH}`}
                      className="w-full h-auto overflow-visible select-none"
                    >
                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                        const y = pad.top + gH * (1 - pct);
                        return (
                          <line
                            key={idx}
                            x1={0}
                            y1={y}
                            x2={totalChartW}
                            y2={y}
                            stroke="rgba(249, 115, 22, 0.12)"
                            strokeDasharray="4 4"
                          />
                        );
                      })}

                      {/* Forecast Region Background Shade */}
                      {ewmaData.forecastPoints.length > 0 && (
                        <>
                          <rect
                            x={dividerX}
                            y={pad.top}
                            width={totalChartW - dividerX}
                            height={gH}
                            fill="rgba(6, 182, 212, 0.08)"
                          />
                          <line
                            x1={dividerX}
                            y1={pad.top}
                            x2={dividerX}
                            y2={pad.top + gH}
                            stroke="#06b6d4"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={dividerX + 8}
                            y={pad.top + 14}
                            className="text-[10px] fill-cyan-400 font-mono font-bold"
                          >
                            Forecast Zone ({forecastHorizon}d) →
                          </text>
                        </>
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
                        const isHovered = hoveredPoint?.idx === idx;

                        return (
                          <g
                            key={idx}
                            onMouseEnter={() => setHoveredPoint({ ...pt, idx })}
                            onMouseLeave={() => setHoveredPoint(null)}
                            className="cursor-pointer"
                          >
                            {/* Hover Guide Line */}
                            {isHovered && (
                              <line
                                x1={x}
                                y1={pad.top}
                                x2={x}
                                y2={pad.top + gH}
                                stroke="rgba(255, 255, 255, 0.25)"
                                strokeDasharray="2 2"
                              />
                            )}

                            {/* Actual dot (history only) */}
                            {!pt.isForecast && (
                              <circle
                                cx={x}
                                cy={yActual}
                                r={isHovered ? '6' : '4.5'}
                                fill="#f97316"
                                stroke="#431407"
                                strokeWidth="2"
                                className="transition-all"
                              />
                            )}

                            {/* Predicted dot */}
                            <circle
                              cx={x}
                              cy={yPred}
                              r={pt.isForecast ? (isHovered ? '7' : '5.5') : isHovered ? '5' : '3.5'}
                              fill={pt.isForecast ? '#22d3ee' : '#06b6d4'}
                              stroke="#083344"
                              strokeWidth="2"
                              className="transition-all"
                            />

                            {/* X-axis date label */}
                            <text
                              x={x}
                              y={chartH - 22}
                              textAnchor="middle"
                              className={`text-[10px] font-mono font-bold ${
                                pt.isForecast ? 'fill-cyan-400' : 'fill-stone-300'
                              }`}
                            >
                              {pt.label}
                            </text>
                            <text
                              x={x}
                              y={chartH - 9}
                              textAnchor="middle"
                              className={`text-[9px] font-mono ${
                                pt.isForecast ? 'fill-cyan-500 font-semibold' : 'fill-stone-500'
                              }`}
                            >
                              {pt.dayOfWeek}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Hover Tooltip Details Banner */}
            {hoveredPoint && (
              <div className="p-3 rounded-2xl bg-stone-900 border border-orange-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-fade-in shadow-lg">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      hoveredPoint.isForecast ? 'bg-cyan-400 animate-pulse' : 'bg-orange-500'
                    }`}
                  />
                  <div>
                    <span className="font-bold text-white text-sm">
                      {hoveredPoint.label} ({hoveredPoint.dayOfWeek})
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-stone-950 text-stone-300 border border-stone-800">
                      {hoveredPoint.isForecast ? `Forecast Day +${hoveredPoint.forecastDayNumber}` : 'Historical Actual'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-mono">
                  {!hoveredPoint.isForecast ? (
                    <div>
                      <span className="text-stone-400 text-[11px] block">Actual Sales:</span>
                      <span className="font-black text-white text-sm">
                        ₱{hoveredPoint.actual.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-cyan-400 text-[11px] block">Projected Sales:</span>
                      <span className="font-black text-cyan-300 text-sm">
                        ₱{hoveredPoint.predicted.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-stone-400 text-[11px] block">EWMA Smoothed:</span>
                    <span className="font-bold text-stone-200 text-sm">
                      ₱{hoveredPoint.predicted.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
  );
};
