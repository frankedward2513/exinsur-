import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Package,
  Layers,
  Percent,
  Filter,
  Database,
} from 'lucide-react';

type DateFilterPreset = 'all' | 'today' | 'last7' | 'last30' | 'this_month' | 'custom';

export const DashboardView: React.FC = () => {
  const { orders, expenses, transactions, products, setShowRlsModal, rlsBlocked } = useStore();

  const [dateFilter, setDateFilter] = useState<DateFilterPreset>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Date filtering logic
  const filteredData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const isDateInRange = (dateStr: string) => {
      if (!dateStr) return true;
      const target = new Date(dateStr.split('T')[0]);

      if (dateFilter === 'today') {
        return dateStr.startsWith(todayStr);
      } else if (dateFilter === 'last7') {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        return target >= past7 && target <= now;
      } else if (dateFilter === 'last30') {
        const past30 = new Date();
        past30.setDate(now.getDate() - 30);
        return target >= past30 && target <= now;
      } else if (dateFilter === 'this_month') {
        return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
      } else if (dateFilter === 'custom') {
        if (customStart && target < new Date(customStart)) return false;
        if (customEnd && target > new Date(customEnd + 'T23:59:59')) return false;
        return true;
      }
      return true; // 'all'
    };

    const matchedOrders = orders.filter((o) => isDateInRange(o.createdAt));
    const matchedExpenses = expenses.filter((e) => isDateInRange(e.date || e.createdAt));
    const matchedTransactions = transactions.filter((t) => isDateInRange(t.date || t.createdAt));

    return {
      orders: matchedOrders,
      expenses: matchedExpenses,
      transactions: matchedTransactions,
    };
  }, [orders, expenses, transactions, dateFilter, customStart, customEnd]);

  // 6 KPIs Calculations
  const kpis = useMemo(() => {
    // 1. New Orders
    const newOrders = filteredData.orders.length;

    // 2. Total Sales (Inflows from transactions; fallback to orders if no transactions exist)
    const totalSalesFromTx = filteredData.transactions
      .filter((t) => t.flowType === 'inflow')
      .reduce((sum, t) => sum + (t.inflow || 0), 0);

    const totalSalesFromOrders = filteredData.orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalSales = transactions.length > 0 ? totalSalesFromTx : totalSalesFromOrders;

    // 3. Total Expenses (Outflows from transactions; fallback to expenses list if no transactions exist)
    const totalExpensesFromTx = filteredData.transactions
      .filter((t) => t.flowType === 'outflow')
      .reduce((sum, t) => sum + (t.outflow || 0), 0);

    const totalExpensesFromList = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = transactions.length > 0 ? totalExpensesFromTx : totalExpensesFromList;

    // 4. Gross Profit (Sales - Cost of Goods Sold)
    let cogs = 0;
    filteredData.orders
      .filter((o) => o.status !== 'cancelled')
      .forEach((order) => {
        order.items.forEach((item) => {
          cogs += (item.costPrice || 0) * item.quantity;
        });
      });
    const grossProfit = Math.max(0, totalSales - cogs);

    // 5. Net Profit (Gross Profit - Total Expenses or Sales - Expenses)
    const netProfit = totalSales - totalExpenses;

    // 6. Remaining Assets (Inventory remaining stock value)
    const remainingAssets = products.reduce(
      (sum, p) => sum + p.availableQuantity * (p.costPrice || p.sellingPrice * 0.5),
      0
    );

    return {
      newOrders,
      totalSales,
      totalExpenses,
      grossProfit,
      netProfit,
      remainingAssets,
    };
  }, [filteredData, products]);

  // Monthly performance breakdown data
  const monthlyBreakdown = useMemo(() => {
    const monthMap: Record<string, { monthKey: string; label: string; inflow: number; outflow: number }> = {};

    // Group transactions by YYYY-MM
    transactions.forEach((tx) => {
      const d = tx.date ? new Date(tx.date) : new Date(tx.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });

      if (!monthMap[key]) {
        monthMap[key] = { monthKey: key, label, inflow: 0, outflow: 0 };
      }
      if (tx.flowType === 'inflow') monthMap[key].inflow += tx.inflow;
      if (tx.flowType === 'outflow') monthMap[key].outflow += tx.outflow;
    });

    // Also factor in orders if transactions were empty
    if (Object.keys(monthMap).length === 0 && orders.length > 0) {
      orders.forEach((o) => {
        const d = new Date(o.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!monthMap[key]) monthMap[key] = { monthKey: key, label, inflow: 0, outflow: 0 };
        if (o.status !== 'cancelled') monthMap[key].inflow += o.totalAmount;
      });
    }

    const sorted = Object.values(monthMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    return sorted.map((item) => {
      const net = item.inflow - item.outflow;
      const margin = item.inflow > 0 ? (net / item.inflow) * 100 : 0;
      return {
        ...item,
        netProfit: net,
        margin: margin.toFixed(1),
      };
    });
  }, [transactions, orders]);

  // Graph points generation for the Line Graph (Sales Inflow vs Expense Outflow)
  const lineGraphData = useMemo(() => {
    // Generate chronological day intervals (last 14 or 7 points)
    const pointsCount = 10;
    const points: { label: string; dateStr: string; inflow: number; outflow: number }[] = [];
    const now = new Date();

    for (let i = pointsCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i * 2);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' });

      // Calculate totals for that day / slice
      const dayInflows = transactions
        .filter((t) => t.flowType === 'inflow' && (t.date === dateStr || t.createdAt.startsWith(dateStr)))
        .reduce((sum, t) => sum + t.inflow, 0);

      const dayOutflows = transactions
        .filter((t) => t.flowType === 'outflow' && (t.date === dateStr || t.createdAt.startsWith(dateStr)))
        .reduce((sum, t) => sum + t.outflow, 0);

      points.push({ label, dateStr, inflow: dayInflows, outflow: dayOutflows });
    }

    return points;
  }, [transactions]);

  // SVG dimensions & scaling
  const maxVal = Math.max(
    ...lineGraphData.map((p) => Math.max(p.inflow, p.outflow)),
    1000
  );
  const chartHeight = 220;
  const chartWidth = 720;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const graphW = chartWidth - padding.left - padding.right;
  const graphH = chartHeight - padding.top - padding.bottom;

  const getX = (idx: number) => padding.left + (idx / (lineGraphData.length - 1)) * graphW;
  const getY = (val: number) => padding.top + graphH - (val / maxVal) * graphH;

  const inflowPoints = lineGraphData.map((p, i) => `${getX(i)},${getY(p.inflow)}`).join(' ');
  const outflowPoints = lineGraphData.map((p, i) => `${getX(i)},${getY(p.outflow)}`).join(' ');

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Header & Date Range Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-panel">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Executive Performance Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-stone-300">
            Real-time financial, inventory & operational KPIs for EXINS Jksur+ Novaliches
          </p>
        </div>

        {/* Filters & Database Status */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowRlsModal(true)}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer shrink-0 ${
              rlsBlocked
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 hover:bg-amber-900 animate-pulse'
                : 'bg-stone-950/70 border-orange-500/20 hover:border-orange-500/50 text-stone-300 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-orange-400" />
            <span>{rlsBlocked ? 'RLS Policies Needed' : 'Supabase Status'}</span>
          </button>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-950/70 border border-orange-500/20 text-xs overflow-x-auto max-w-full">
            <Filter className="w-3.5 h-3.5 text-orange-400 ml-1.5 shrink-0" />
            <button
              onClick={() => setDateFilter('all')}
              className={`px-2 py-1 rounded-lg transition font-medium cursor-pointer shrink-0 ${
                dateFilter === 'all' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All time
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`px-2 py-1 rounded-lg transition font-medium cursor-pointer shrink-0 ${
                dateFilter === 'today' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('last7')}
              className={`px-2 py-1 rounded-lg transition font-medium cursor-pointer shrink-0 ${
                dateFilter === 'last7' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Last 7d
            </button>
            <button
              onClick={() => setDateFilter('last30')}
              className={`px-2 py-1 rounded-lg transition font-medium cursor-pointer shrink-0 ${
                dateFilter === 'last30' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Last 30d
            </button>
            <button
              onClick={() => setDateFilter('this_month')}
              className={`px-2 py-1 rounded-lg transition font-medium cursor-pointer shrink-0 ${
                dateFilter === 'this_month' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              This month
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-2 py-1 rounded-lg transition font-medium cursor-pointer shrink-0 ${
                dateFilter === 'custom' ? 'bg-orange-600 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Custom
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 text-xs bg-stone-950/80 p-1.5 rounded-xl border border-orange-500/30">
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-stone-200 text-xs focus:outline-none"
              />
              <span className="text-stone-500">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-stone-200 text-xs focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* 6 Key Performance Indicators (KPI Cards - 2 cols on mobile for balanced aesthetic) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-4">
        {/* New Orders */}
        <div className="p-3.5 sm:p-5 rounded-2xl glass-panel glass-panel-hover relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 truncate">New Orders</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-orange-500/20 text-orange-400 group-hover:scale-110 transition">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{kpis.newOrders}</div>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-1 truncate">Customer orders</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 opacity-60" />
        </div>

        {/* Total Sales */}
        <div className="p-3.5 sm:p-5 rounded-2xl glass-panel glass-panel-hover relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 truncate">Total Sales</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 truncate">₱{kpis.totalSales.toLocaleString()}</div>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-1 truncate">Revenue inflows</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60" />
        </div>

        {/* Total Expenses */}
        <div className="p-3.5 sm:p-5 rounded-2xl glass-panel glass-panel-hover relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 truncate">Total Expenses</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-rose-500/20 text-rose-400 group-hover:scale-110 transition">
              <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 truncate">₱{kpis.totalExpenses.toLocaleString()}</div>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-1 truncate">Operational costs</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600 opacity-60" />
        </div>

        {/* Gross Profit */}
        <div className="p-3.5 sm:p-5 rounded-2xl glass-panel glass-panel-hover relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 truncate">Gross Profit</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition">
              <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 truncate">₱{kpis.grossProfit.toLocaleString()}</div>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-1 truncate">Revenue minus COGS</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-500 opacity-60" />
        </div>

        {/* Net Profit */}
        <div className="p-3.5 sm:p-5 rounded-2xl glass-panel glass-panel-hover relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 truncate">Net Profit</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black truncate ${
              kpis.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            ₱{kpis.netProfit.toLocaleString()}
          </div>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-1 truncate">Net balance</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-60" />
        </div>

        {/* Remaining Assets */}
        <div className="p-3.5 sm:p-5 rounded-2xl glass-panel glass-panel-hover relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-stone-400 truncate">Remaining Assets</span>
            <div className="p-1.5 sm:p-2 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-110 transition">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-300 truncate">₱{kpis.remainingAssets.toLocaleString()}</div>
          <p className="text-[10px] sm:text-[11px] text-stone-400 mt-1 truncate">Stock asset value</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500 opacity-60" />
        </div>
      </div>

      {/* Sales and Expense Comparison in a Line Graph with Legend */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-orange-500/20">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <span>Sales and Expense Inflow/Outflow Comparison</span>
            </h2>
            <p className="text-xs text-stone-400">
              Interactive timeline trend comparing revenue inflows against expense outflows
            </p>
          </div>

          {/* Requested specific Legend */}
          <div className="flex items-center gap-5 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 inline-block" />
              <span className="text-emerald-400">Sales Inflow</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 inline-block" />
              <span className="text-rose-400">Expense Outflow</span>
            </div>
          </div>
        </div>

        {/* SVG Line Graph */}
        <div className="w-full overflow-x-auto pt-4">
          <div className="min-w-[680px]">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = padding.top + graphH * (1 - pct);
                const labelVal = Math.round(maxVal * pct);
                return (
                  <g key={idx}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="rgba(249, 115, 22, 0.15)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[10px] fill-stone-400 font-mono"
                    >
                      ₱{labelVal.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Inflow Line (Emerald) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={inflowPoints}
              />

              {/* Outflow Line (Rose) */}
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={outflowPoints}
              />

              {/* Data points & X Labels */}
              {lineGraphData.map((d, idx) => {
                const x = getX(idx);
                const yInflow = getY(d.inflow);
                const yOutflow = getY(d.outflow);

                return (
                  <g key={idx}>
                    {/* Inflow dot */}
                    <circle cx={x} cy={yInflow} r="5" fill="#10b981" stroke="#064e3b" strokeWidth="2" />
                    {/* Outflow dot */}
                    <circle cx={x} cy={yOutflow} r="5" fill="#f43f5e" stroke="#881337" strokeWidth="2" />

                    {/* X-axis label */}
                    <text
                      x={x}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      className="text-[10px] fill-stone-400 font-mono"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Monthly Performance Breakdown Summary Table */}
      <div className="p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-orange-500/20">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-400" />
              <span>Monthly Performance Breakdown Summary</span>
            </h2>
            <p className="text-xs text-stone-400">
              Historical review of monthly sales inflows, expense outflows, net operating profit & profit margin
            </p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono">
            {monthlyBreakdown.length} Recorded Months
          </span>
        </div>

        {monthlyBreakdown.length === 0 ? (
          <div className="text-center py-10 text-stone-400 space-y-2">
            <p className="text-sm">No monthly performance records yet.</p>
            <p className="text-xs text-stone-400">
              As you record sales in POS or Shop, and disbursements in Expenses, monthly breakdown summaries will automatically compute here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-orange-500/20 text-stone-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Period / Month</th>
                  <th className="py-3 px-4 text-right">Sales Inflow</th>
                  <th className="py-3 px-4 text-right">Expense Outflow</th>
                  <th className="py-3 px-4 text-right">Net Operating Profit</th>
                  <th className="py-3 px-4 text-right">Profit Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {monthlyBreakdown.map((row) => (
                  <tr key={row.monthKey} className="hover:bg-stone-800/40 transition">
                    <td className="py-3.5 px-4 font-sans font-semibold text-white">{row.label}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-400">
                      ₱{row.inflow.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-rose-400">
                      ₱{row.outflow.toLocaleString()}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-bold ${
                        row.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {row.netProfit >= 0 ? '+' : ''}₱{row.netProfit.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          Number(row.margin) >= 20
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : Number(row.margin) >= 0
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {row.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
