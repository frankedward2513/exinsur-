import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ExpenseAccount, Expense, Transaction } from '../types';
import {
  DollarSign,
  Receipt,
  History,
  Plus,
  Search,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  Upload,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export const FinanceManagementView: React.FC = () => {
  const {
    expenseAccounts,
    expenses,
    transactions,
    addExpenseAccount,
    updateExpenseAccount,
    deleteExpenseAccount,
    addExpense,
    deleteExpense,
    deleteTransaction,
  } = useStore();

  // 3 Tabs: 'accounts' | 'record' | 'history'
  const [activeTab, setActiveTab] = useState<'accounts' | 'record' | 'history'>('accounts');

  // ===================== 1. EXPENSE ACCOUNTS STATE =====================
  const [accountName, setAccountName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState<number | ''>('');
  const [accountDesc, setAccountDesc] = useState('');
  const [accountColor, setAccountColor] = useState('#f97316');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !monthlyBudget) return;

    if (editingAccountId) {
      await updateExpenseAccount(editingAccountId, {
        name: accountName,
        monthlyBudget: Number(monthlyBudget),
        description: accountDesc,
        color: accountColor,
      });
      setEditingAccountId(null);
    } else {
      await addExpenseAccount({
        name: accountName,
        monthlyBudget: Number(monthlyBudget),
        description: accountDesc,
        color: accountColor,
      });
    }

    setAccountName('');
    setMonthlyBudget('');
    setAccountDesc('');
    setAccountColor('#f97316');
  };

  const startEditAccount = (acc: ExpenseAccount) => {
    setEditingAccountId(acc.id);
    setAccountName(acc.name);
    setMonthlyBudget(acc.monthlyBudget);
    setAccountDesc(acc.description || '');
    setAccountColor(acc.color || '#f97316');
  };

  // ===================== 2. RECORD EXPENSE STATE =====================
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [disbursementAmount, setDisbursementAmount] = useState<number | ''>('');
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash' | 'bank_transfer' | 'card'>('gcash');
  const [receiptPhoto, setReceiptPhoto] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || !disbursementAmount) return;

    const acc = expenseAccounts.find((a) => a.id === selectedAccountId);
    const accName = acc ? acc.name : 'General Operations';

    await addExpense({
      accountId: selectedAccountId,
      accountName: accName,
      amount: Number(disbursementAmount),
      date: disbursementDate,
      paymentMethod,
      receiptUrl: receiptPhoto || undefined,
      description: expenseDesc || `Expense disbursement for ${accName}`,
    });

    // Reset Form & Switch to History to verify
    setDisbursementAmount('');
    setExpenseDesc('');
    setReceiptPhoto('');
    setActiveTab('history');
  };

  // ===================== 3. TRANSACTION HISTORY STATE =====================
  const [historySearch, setHistorySearch] = useState('');
  const [flowFilter, setFlowFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'last7' | 'this_month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return transactions.filter((tx) => {
      // Flow type filter
      if (flowFilter !== 'all' && tx.flowType !== flowFilter) return false;

      // Payment method filter
      if (paymentFilter !== 'all' && tx.paymentMethod !== paymentFilter) return false;

      // Search query
      if (historySearch) {
        const q = historySearch.toLowerCase();
        const match =
          tx.description.toLowerCase().includes(q) ||
          tx.account.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.paymentMethod.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Date filter
      const txDateStr = tx.date || tx.createdAt.split('T')[0];
      if (datePreset === 'today') {
        if (!txDateStr.startsWith(todayStr)) return false;
      } else if (datePreset === 'last7') {
        const past7 = new Date();
        past7.setDate(now.getDate() - 7);
        if (new Date(txDateStr) < past7) return false;
      } else if (datePreset === 'this_month') {
        const d = new Date(txDateStr);
        if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return false;
      } else if (datePreset === 'custom') {
        if (customStart && txDateStr < customStart) return false;
        if (customEnd && txDateStr > customEnd) return false;
      }

      return true;
    });
  }, [transactions, flowFilter, paymentFilter, historySearch, datePreset, customStart, customEnd]);

  // Total Inflow, Total Outflow, Net Operating Outflow/Inflow
  const summary = useMemo(() => {
    const totalInflow = filteredTransactions
      .filter((t) => t.flowType === 'inflow')
      .reduce((sum, t) => sum + (t.inflow || 0), 0);

    const totalOutflow = filteredTransactions
      .filter((t) => t.flowType === 'outflow')
      .reduce((sum, t) => sum + (t.outflow || 0), 0);

    const netOperating = totalInflow - totalOutflow;

    return { totalInflow, totalOutflow, netOperating };
  }, [filteredTransactions]);

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Date', 'Flow Type', 'Account / Category', 'Description', 'Payment Method', 'Inflow (PHP)', 'Outflow (PHP)'];
    const rows = filteredTransactions.map((t) => [
      `"${t.date || t.createdAt.split('T')[0]}"`,
      `"${t.flowType.toUpperCase()}"`,
      `"${t.account || t.category}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${t.paymentMethod.toUpperCase()}"`,
      t.inflow || 0,
      t.outflow || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EXINS_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 3 Finance Navigation Buttons */}
      <div className="p-3 rounded-2xl glass-panel flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'accounts'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-orange-400" />
          <span>Expense Accounts</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono">
            {expenseAccounts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('record')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'record'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <Receipt className="w-4 h-4 text-orange-400" />
          <span>Record Expense</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono">
            {expenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <History className="w-4 h-4 text-orange-400" />
          <span>Transaction History</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono">
            {transactions.length}
          </span>
        </button>
      </div>

      {/* ===================== TAB 1: EXPENSE ACCOUNTS ===================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-400" />
                <span>{editingAccountId ? 'Edit Expense Account' : 'New Expense Budget Account'}</span>
              </h2>
              {editingAccountId && (
                <button
                  onClick={() => setEditingAccountId(null)}
                  className="text-xs text-stone-400 hover:text-white"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Expense Account Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Novaliches Store Rent, Utilities, Packaging"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Monthly Budget Allocation (₱) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="15000"
                    value={monthlyBudget}
                    onChange={(e) =>
                      setMonthlyBudget(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Account Badge Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accountColor}
                      onChange={(e) => setAccountColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={accountColor}
                      onChange={(e) => setAccountColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-medium text-stone-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Monthly purpose, limits, authorization rules..."
                  value={accountDesc}
                  onChange={(e) => setAccountDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
              >
                {editingAccountId ? 'Update Expense Account' : 'Save Expense Account'}
              </button>
            </form>
          </div>

          {/* KPI Cards below as requested */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">Expense Budget Utilization</h3>
            {expenseAccounts.length === 0 ? (
              <div className="p-8 text-center rounded-3xl glass-panel text-xs text-stone-400">
                No expense accounts defined yet. Add accounts like "Store Rent", "Staff Wages", "Electricity" above!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {expenseAccounts.map((acc) => {
                  const spent = acc.totalSpent || 0;
                  const limit = acc.monthlyBudget || 1;
                  const percent = Math.round((spent / limit) * 100);
                  const isExceeded = spent > limit;

                  return (
                    <div
                      key={acc.id}
                      className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between border border-orange-500/20 space-y-4 group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-6 h-6 rounded-full shadow-md shrink-0 border border-white/20"
                              style={{ backgroundColor: acc.color || '#ea580c' }}
                            />
                            <div>
                              <h4 className="text-base font-bold text-white group-hover:text-orange-300 transition">
                                {acc.name}
                              </h4>
                              <p className="text-xs text-stone-400 line-clamp-2">
                                {acc.description || 'Monthly operational expense budget'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditAccount(acc)}
                              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteExpenseAccount(acc.id)}
                              className="p-1 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar & Status */}
                        <div className="space-y-1.5 pt-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-stone-300">Spent: ₱{spent.toLocaleString()}</span>
                            <span className="text-stone-400">Limit: ₱{limit.toLocaleString()}</span>
                          </div>

                          <div className="w-full h-2.5 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isExceeded
                                  ? 'bg-rose-500'
                                  : percent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(3, percent))}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span
                              className={`font-bold flex items-center gap-1 ${
                                isExceeded
                                  ? 'text-rose-400'
                                  : percent >= 80
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {isExceeded ? (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span>Exceeded by {(percent - 100)}%!</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>{percent}% of monthly budget</span>
                                </>
                              )}
                            </span>
                            <span className="font-mono text-stone-400">
                              Rem: ₱{Math.max(0, limit - spent).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: RECORD EXPENSE ===================== */}
      {activeTab === 'record' && (
        <div className="p-6 rounded-3xl glass-panel space-y-4 max-w-2xl mx-auto">
          <div className="pb-3 border-b border-orange-500/20">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-400" />
              <span>Record Expense Disbursement</span>
            </h2>
            <p className="text-xs text-stone-400">
              Disburse operational funds. This automatically creates an outflow in the financial ledger.
            </p>
          </div>

          <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
            {/* Expense Account Select */}
            <div>
              <label className="block font-medium text-stone-300 mb-1">Select Expense Account *</label>
              {expenseAccounts.length === 0 ? (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-orange-500/30 text-amber-200">
                  No expense accounts exist yet. Please create at least one expense account in Tab 1 first!
                </div>
              ) : (
                <select
                  required
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select Account Category</option>
                  {expenseAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Budget: ₱{a.monthlyBudget.toLocaleString()})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Disbursement Amount & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-stone-300 mb-1">Disbursement Amount (₱) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="3500"
                  value={disbursementAmount}
                  onChange={(e) =>
                    setDisbursementAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-300 mb-1">Disbursement Date *</label>
                <input
                  type="date"
                  required
                  value={disbursementDate}
                  onChange={(e) => setDisbursementDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block font-medium text-stone-300 mb-1">Payment Method *</label>
              <div className="grid grid-cols-4 gap-2">
                {(['cash', 'gcash', 'bank_transfer', 'card'] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-xl border text-center uppercase font-bold text-[11px] transition cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-orange-600 text-white border-orange-500 shadow-sm'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload for Receipt */}
            <div>
              <label className="block font-medium text-stone-300 mb-1">File Upload for Receipt</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-orange-500/40 hover:border-orange-500 bg-stone-950 text-stone-300 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-orange-400" />
                  <span>{receiptPhoto ? 'Change Receipt Photo' : 'Upload Receipt Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                </label>
                {receiptPhoto && (
                  <img
                    src={receiptPhoto}
                    alt="Receipt preview"
                    className="w-12 h-12 rounded-xl object-cover border border-orange-500/40"
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-medium text-stone-300 mb-1">Description / Purpose</label>
              <textarea
                rows={2}
                placeholder="Specific breakdown (e.g. Meralco bill #49281, packaging tapes, courier deposit)..."
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={expenseAccounts.length === 0}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-sm shadow-md shadow-orange-600/30 transition cursor-pointer disabled:opacity-50"
            >
              Record & Disburse Expense
            </button>
          </form>
        </div>
      )}

      {/* ===================== TAB 3: TRANSACTION HISTORY ===================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Summary KPI Cards: Total Inflow, Total Outflow, Net Operating Outflow/Inflow */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl glass-panel relative overflow-hidden">
              <span className="text-xs font-semibold uppercase text-stone-400">Total Inflow</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                ₱{summary.totalInflow.toLocaleString()}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Sales & revenue receipts</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
            </div>

            <div className="p-5 rounded-2xl glass-panel relative overflow-hidden">
              <span className="text-xs font-semibold uppercase text-stone-400">Total Outflow</span>
              <div className="text-2xl font-black text-rose-400 mt-1">
                ₱{summary.totalOutflow.toLocaleString()}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Disbursements & operating costs</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
            </div>

            <div className="p-5 rounded-2xl glass-panel relative overflow-hidden">
              <span className="text-xs font-semibold uppercase text-stone-400">
                Net Operating Outflow / Inflow
              </span>
              <div
                className={`text-2xl font-black mt-1 ${
                  summary.netOperating >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary.netOperating >= 0 ? '+' : ''}₱{summary.netOperating.toLocaleString()}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">Inflow minus Outflow</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500" />
            </div>
          </div>

          {/* Filters Bar & Export Button */}
          <div className="p-5 rounded-3xl glass-panel space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search button / input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search description, account, category, or payment method..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Export to Excel button */}
              <button
                onClick={handleExportExcel}
                className="py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border border-orange-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span>Export to Excel / CSV</span>
              </button>
            </div>

            {/* Filter Row: Flows, Payment Method, Date Range */}
            <div className="flex flex-wrap items-center gap-3 text-xs pt-1 border-t border-stone-800/80">
              {/* Flow selection */}
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                <span className="text-stone-400 px-2 font-medium">Flow:</span>
                <button
                  onClick={() => setFlowFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    flowFilter === 'all' ? 'bg-orange-600 text-white font-bold' : 'text-stone-400'
                  }`}
                >
                  All flows
                </button>
                <button
                  onClick={() => setFlowFilter('inflow')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    flowFilter === 'inflow' ? 'bg-emerald-600 text-white font-bold' : 'text-stone-400'
                  }`}
                >
                  Sales Inflow only
                </button>
                <button
                  onClick={() => setFlowFilter('outflow')}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    flowFilter === 'outflow' ? 'bg-rose-600 text-white font-bold' : 'text-stone-400'
                  }`}
                >
                  Expense Outflow only
                </button>
              </div>

              {/* Payment Method filter */}
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                <span className="text-stone-400 px-2 font-medium">Payment:</span>
                {['all', 'cash', 'gcash', 'bank_transfer', 'card'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentFilter(method)}
                    className={`px-2 py-1 rounded-lg capitalize transition ${
                      paymentFilter === method
                        ? 'bg-orange-600 text-white font-bold'
                        : 'text-stone-400'
                    }`}
                  >
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Date Presets */}
              <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
                <span className="text-stone-400 px-2 font-medium">Date:</span>
                <button
                  onClick={() => setDatePreset('all')}
                  className={`px-2 py-1 rounded-lg transition ${
                    datePreset === 'all' ? 'bg-orange-600 text-white font-bold' : 'text-stone-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setDatePreset('today')}
                  className={`px-2 py-1 rounded-lg transition ${
                    datePreset === 'today' ? 'bg-orange-600 text-white font-bold' : 'text-stone-400'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDatePreset('last7')}
                  className={`px-2 py-1 rounded-lg transition ${
                    datePreset === 'last7' ? 'bg-orange-600 text-white font-bold' : 'text-stone-400'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setDatePreset('this_month')}
                  className={`px-2 py-1 rounded-lg transition ${
                    datePreset === 'this_month' ? 'bg-orange-600 text-white font-bold' : 'text-stone-400'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setDatePreset('custom')}
                  className={`px-2 py-1 rounded-lg transition ${
                    datePreset === 'custom' ? 'bg-orange-600 text-white font-bold' : 'text-stone-400'
                  }`}
                >
                  Custom
                </button>
              </div>

              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 bg-stone-950 p-1.5 rounded-xl border border-stone-800 text-xs">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-transparent text-stone-200 focus:outline-none"
                  />
                  <span className="text-stone-500">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-transparent text-stone-200 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Database Table Below as requested */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h3 className="text-base font-bold text-white">Financial Transactions Ledger</h3>
              <span className="text-xs font-mono text-orange-400">
                {filteredTransactions.length} Transactions
              </span>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="text-center py-8 text-xs text-stone-400">
                No financial transactions recorded for this filter. Transactions from POS sales, shop orders, and expense disbursements will automatically appear here!
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-orange-500/20 text-stone-400 uppercase text-[11px]">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Flow Type</th>
                      <th className="py-3 px-3">Account / Category</th>
                      <th className="py-3 px-3">Description</th>
                      <th className="py-3 px-3">Payment Method</th>
                      <th className="py-3 px-3 text-right">Inflow (₱)</th>
                      <th className="py-3 px-3 text-right">Outflow (₱)</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 font-mono">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-stone-800/40 transition">
                        <td className="py-3.5 px-3 text-stone-300">
                          {tx.date || tx.createdAt.split('T')[0]}
                        </td>
                        <td className="py-3.5 px-3 font-sans">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              tx.flowType === 'inflow'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {tx.flowType}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-sans font-medium text-white">
                          {tx.account || tx.category}
                        </td>
                        <td className="py-3.5 px-3 font-sans text-stone-400 max-w-xs truncate">
                          {tx.description}
                        </td>
                        <td className="py-3.5 px-3 uppercase text-stone-300">
                          {tx.paymentMethod.replace('_', ' ')}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                          {tx.inflow ? `₱${tx.inflow.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3.5 px-3 text-right font-bold text-rose-400">
                          {tx.outflow ? `₱${tx.outflow.toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={() => deleteTransaction(tx.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
