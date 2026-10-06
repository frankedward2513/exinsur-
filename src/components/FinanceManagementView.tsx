import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ExpenseAccount } from '../types';
import {
  DollarSign,
  Receipt,
  History,
  Search,
  Download,
  Filter,
  Calendar,
  Upload,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Store,
  ShoppingBag,
  Layers,
  RotateCcw,
  X,
  Check,
  ArrowUpDown,
  ChevronDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { LogItemStatusModal } from './LogItemStatusModal';
import { ViewProductLostModal } from './ViewProductLostModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const FinanceManagementView: React.FC = () => {
  const {
    expenseAccounts,
    expenses,
    transactions,
    orders,
    itemStatusLogs,
    products,
    categories,
    addExpenseAccount,
    updateExpenseAccount,
    deleteExpenseAccount,
    addExpense,
    deleteTransaction,
  } = useStore();

  // 3 Tabs: 'accounts' | 'record' | 'history'
  const [activeTab, setActiveTab] = useState<'accounts' | 'record' | 'history'>('accounts');

  // Deletion confirmation state to prevent accidental deletes
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'transaction' | 'expense_account';
    id: string;
    title: string;
    message: string;
    itemName: string;
    details?: { label: string; value: string | number }[];
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'transaction') {
        await deleteTransaction(deleteTarget.id);
      } else if (deleteTarget.type === 'expense_account') {
        await deleteExpenseAccount(deleteTarget.id);
      }
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

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
  const [channelFilter, setChannelFilter] = useState<'all' | 'pos' | 'online' | 'disbursement'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'last7' | 'this_month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isViewLostModalOpen, setIsViewLostModalOpen] = useState(false);

  // Product Filter State (to easily filter transactions by product code or name without scrolling)
  const [selectedProductFilterId, setSelectedProductFilterId] = useState<string | null>(null);
  const [isProductFilterModalOpen, setIsProductFilterModalOpen] = useState(false);
  const [productModalSearch, setProductModalSearch] = useState('');
  const [productModalCategory, setProductModalCategory] = useState('all');

  // 4 Dropdown state for Transaction History (Channel, Flow, Payment Method, Date)
  const [openDropdown, setOpenDropdown] = useState<'channel' | 'flow' | 'payment' | 'date' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getChannelLabel = () => {
    if (channelFilter === 'all') return 'Channel: All';
    if (channelFilter === 'pos') return 'Channel: POS';
    if (channelFilter === 'online') return 'Channel: Online';
    if (channelFilter === 'disbursement') return 'Channel: Disbursements';
    return 'Channel';
  };

  const getFlowLabel = () => {
    if (flowFilter === 'all') return 'Flow: All';
    if (flowFilter === 'inflow') return 'Flow: Inflow';
    if (flowFilter === 'outflow') return 'Flow: Outflow';
    return 'Flow';
  };

  const getPaymentLabel = () => {
    if (paymentFilter === 'all') return 'Payment: All';
    if (paymentFilter === 'cash') return 'Payment: Cash';
    if (paymentFilter === 'gcash') return 'Payment: GCash';
    if (paymentFilter === 'bank_transfer') return 'Payment: Bank Transfer';
    if (paymentFilter === 'card') return 'Payment: Card';
    return `Payment: ${paymentFilter}`;
  };

  const getDateLabel = () => {
    if (datePreset === 'all') return 'Date: All Time';
    if (datePreset === 'today') return 'Date: Today';
    if (datePreset === 'last7') return 'Date: Last 7 Days';
    if (datePreset === 'this_month') return 'Date: This Month';
    if (datePreset === 'custom') {
      if (customStart && customEnd) return `Date: ${customStart} → ${customEnd}`;
      if (customStart) return `Date: From ${customStart}`;
      if (customEnd) return `Date: Up to ${customEnd}`;
      return 'Date: Custom Range';
    }
    return 'Date';
  };

  const isAnyFilterActive =
    flowFilter !== 'all' ||
    paymentFilter !== 'all' ||
    datePreset !== 'all' ||
    channelFilter !== 'all' ||
    selectedProductFilterId !== null ||
    historySearch.trim() !== '' ||
    customStart !== '' ||
    customEnd !== '';

  const handleResetFilters = () => {
    setFlowFilter('all');
    setPaymentFilter('all');
    setDatePreset('all');
    setChannelFilter('all');
    setSelectedProductFilterId(null);
    setHistorySearch('');
    setCustomStart('');
    setCustomEnd('');
    setOpenDropdown(null);
  };

  // Selected product object
  const selectedProductFilter = useMemo(
    () => products.find((p) => p.id === selectedProductFilterId),
    [products, selectedProductFilterId]
  );

  // Filtered products list for product selector modal
  const modalFilteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (
        productModalCategory !== 'all' &&
        p.category?.toLowerCase() !== productModalCategory.toLowerCase()
      ) {
        return false;
      }
      if (productModalSearch.trim()) {
        const q = productModalSearch.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCode = p.barcode?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCat) return false;
      }
      return true;
    });
  }, [products, productModalCategory, productModalSearch]);

  // Sales Breakdown Metrics: POS (Face-to-Face), Online Showcase, Combined Total Sold, and Net (after Returns, Damaged, Lost)
  const salesMetrics = useMemo(() => {
    // 1. POS Face-to-Face Sales (Only active orders that have not been deleted from transaction ledger)
    const posOrders = orders.filter((o) => {
      if (o.orderSource !== 'pos' || o.status === 'cancelled') return false;
      if (transactions.length > 0) {
        const hasTx = transactions.some(
          (t) => t.orderId === o.id || (t.description && t.description.includes(o.orderNumber))
        );
        if (!hasTx) return false;
      }
      return true;
    });
    const posOrdersCount = posOrders.length;
    let posPiecesSold = 0;
    let posRevenue = 0;
    posOrders.forEach((o) => {
      posRevenue += o.totalAmount || 0;
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          posPiecesSold += it.quantity || 1;
        });
      }
    });

    // 2. Online Showcase Sales (Only active orders that have not been deleted from transaction ledger)
    const onlineOrders = orders.filter((o) => {
      if (o.orderSource === 'pos' || o.status === 'cancelled') return false;
      if (transactions.length > 0) {
        const hasTx = transactions.some(
          (t) => t.orderId === o.id || (t.description && t.description.includes(o.orderNumber))
        );
        if (!hasTx) return false;
      }
      return true;
    });
    const onlineOrdersCount = onlineOrders.length;
    let onlinePiecesSold = 0;
    let onlineRevenue = 0;
    onlineOrders.forEach((o) => {
      onlineRevenue += o.totalAmount || 0;
      if (Array.isArray(o.items)) {
        o.items.forEach((it) => {
          onlinePiecesSold += it.quantity || 1;
        });
      }
    });

    // 3. Combined Total Sold (POS + Online)
    const combinedOrdersCount = posOrdersCount + onlineOrdersCount;
    const combinedPiecesSold = posPiecesSold + onlinePiecesSold;
    const combinedGrossRevenue = posRevenue + onlineRevenue;

    // 4. Returns, Damaged, Lost from itemStatusLogs
    let returnedCount = 0;
    let damagedCount = 0;
    let lostCount = 0;
    let lossDeductionValue = 0;

    itemStatusLogs.forEach((log) => {
      const prod = products.find((p) => p.id === log.productId);
      const price = prod ? prod.sellingPrice : 0;
      if (log.type === 'returned') {
        returnedCount += log.quantity;
      } else if (log.type === 'damaged') {
        damagedCount += log.quantity;
        lossDeductionValue += price * log.quantity;
      } else if (log.type === 'lost') {
        lostCount += log.quantity;
        lossDeductionValue += price * log.quantity;
      }
    });

    const totalDispositions = returnedCount + damagedCount + lostCount;
    const netPiecesSold = Math.max(0, combinedPiecesSold - (returnedCount + damagedCount + lostCount));
    const netRevenue = Math.max(0, combinedGrossRevenue - lossDeductionValue);

    return {
      posOrdersCount,
      posPiecesSold,
      posRevenue,
      onlineOrdersCount,
      onlinePiecesSold,
      onlineRevenue,
      combinedOrdersCount,
      combinedPiecesSold,
      combinedGrossRevenue,
      returnedCount,
      damagedCount,
      lostCount,
      totalDispositions,
      netPiecesSold,
      netRevenue,
      lossDeductionValue,
    };
  }, [orders, itemStatusLogs, products]);

  // Filtered transactions sorted current date to past date (newest on top)
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const filtered = transactions.filter((tx) => {
      // Flow type filter
      if (flowFilter !== 'all' && tx.flowType !== flowFilter) return false;

      // Channel filter: POS vs Online vs Disbursement
      if (channelFilter === 'pos') {
        const order = tx.orderId ? orders.find((o) => o.id === tx.orderId) : null;
        const isPos =
          order?.orderSource === 'pos' ||
          tx.category === 'POS Sales' ||
          tx.account?.toLowerCase().includes('counter');
        if (!isPos) return false;
      } else if (channelFilter === 'online') {
        const order = tx.orderId ? orders.find((o) => o.id === tx.orderId) : null;
        const isOnline =
          (order && order.orderSource !== 'pos') ||
          tx.category === 'Showcase Sales' ||
          tx.account?.toLowerCase().includes('order');
        if (!isOnline) return false;
      } else if (channelFilter === 'disbursement') {
        if (tx.flowType !== 'outflow' && tx.category !== 'Disbursement') return false;
      }

      // Payment method filter
      if (paymentFilter !== 'all' && tx.paymentMethod !== paymentFilter) return false;

      // Product filter by specific Product Code / Name / ID
      if (selectedProductFilterId) {
        const prod = products.find((p) => p.id === selectedProductFilterId);
        if (prod) {
          const prodCode = prod.barcode?.toLowerCase();
          const prodName = prod.name.toLowerCase();
          let matched = false;

          // Check related order items
          if (tx.orderId) {
            const ord = orders.find((o) => o.id === tx.orderId);
            if (ord && Array.isArray(ord.items)) {
              matched = ord.items.some(
                (it) =>
                  it.productId === prod.id ||
                  it.name?.toLowerCase().includes(prodName) ||
                  (prod.baleCode && it.baleCode === prod.baleCode)
              );
            }
          }

          // Check transaction description
          if (!matched && tx.description) {
            const desc = tx.description.toLowerCase();
            if (desc.includes(prodName) || (prodCode && desc.includes(prodCode))) {
              matched = true;
            }
          }

          if (!matched) return false;
        }
      }

      // Search query: checks description, account, category, payment method, order number, product code, product name
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase().trim();
        let match =
          tx.description.toLowerCase().includes(q) ||
          tx.account.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.paymentMethod.toLowerCase().includes(q);

        // Check if related order has matching customer, order number, or items
        if (!match && tx.orderId) {
          const ord = orders.find((o) => o.id === tx.orderId);
          if (ord) {
            if (
              ord.orderNumber.toLowerCase().includes(q) ||
              ord.customerName?.toLowerCase().includes(q) ||
              (ord.items &&
                ord.items.some(
                  (it) =>
                    it.name?.toLowerCase().includes(q) ||
                    (it.baleCode && it.baleCode.toLowerCase().includes(q))
                ))
            ) {
              match = true;
            }
          }
        }

        // Check if any product code matches
        if (!match) {
          const matchedProd = products.find(
            (p) => p.barcode?.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
          );
          if (matchedProd && tx.orderId) {
            const ord = orders.find((o) => o.id === tx.orderId);
            if (ord?.items?.some((it) => it.productId === matchedProd.id)) {
              match = true;
            }
          }
        }

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

    // Sort descending: Current date down to past date (strictly newest on top)
    return filtered.sort((a, b) => {
      const dateA = a.date || a.createdAt.split('T')[0];
      const dateB = b.date || b.createdAt.split('T')[0];
      // Compare calendar date first (newest date first)
      if (dateB !== dateA) {
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      }
      // If same calendar date, sort by full createdAt timestamp descending (newest on top)
      const createdTimeA = new Date(a.createdAt || 0).getTime();
      const createdTimeB = new Date(b.createdAt || 0).getTime();
      return createdTimeB - createdTimeA;
    });
  }, [
    transactions,
    flowFilter,
    channelFilter,
    selectedProductFilterId,
    paymentFilter,
    historySearch,
    datePreset,
    customStart,
    customEnd,
    orders,
    products,
  ]);

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

  // Lost Products Metrics & Financial Valuation (Active lost items; if found, removed from lost)
  const lostMetrics = useMemo(() => {
    const lostLogs = itemStatusLogs.filter(
      (log) => log.type === 'lost' && log.status !== 'found' && log.quantity > 0
    );
    let totalLostPieces = 0;
    let totalLostValue = 0;

    lostLogs.forEach((log) => {
      const prod = products.find((p) => p.id === log.productId);
      const price = prod ? prod.sellingPrice : 0;
      totalLostPieces += log.quantity;
      totalLostValue += price * log.quantity;
    });

    return {
      totalRecords: lostLogs.length,
      activeRecords: lostLogs.length,
      totalLostPieces,
      activeLostPieces: totalLostPieces,
      totalLostValue,
      activeLostValue: totalLostValue,
    };
  }, [itemStatusLogs, products]);

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
                              type="button"
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'expense_account',
                                  id: acc.id,
                                  title: 'Delete Expense Account?',
                                  message: 'Are you sure you want to delete this expense account budget? If you clicked this by accident, click Cancel to keep it.',
                                  itemName: acc.name,
                                  details: [
                                    { label: 'Monthly Budget', value: `₱${limit.toLocaleString()}` },
                                    { label: 'Current Spent', value: `₱${spent.toLocaleString()}` },
                                  ],
                                });
                              }}
                              className="p-1 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition"
                              title="Delete Expense Account"
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
          {/* Sales Channels Breakdown & Combined Totals (POS vs Online vs Combined) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>Sales Breakdown: POS Face-to-Face vs Online Showcase</span>
                </h3>
                <p className="text-xs text-stone-400">
                  Track volume sold per channel and combined total sales
                </p>
              </div>

              {/* Fast Action to Log Lost Item */}
              <button
                type="button"
                onClick={() => setIsLogModalOpen(true)}
                className="self-start sm:self-auto py-2 px-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-purple-400 hover:text-purple-300 border border-purple-500/30 text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                <span>+ Log Lost Item</span>
              </button>
            </div>

            {/* Single KPI Card formatted as a Table (POS, Online Showcase, Combined Total) */}
            <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-orange-500/25 relative overflow-hidden bg-gradient-to-br from-stone-900/90 via-stone-900/95 to-stone-950 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-stone-800 gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Store className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                      Sales Channels & Revenue Summary
                    </h4>
                    <p className="text-[11px] text-stone-400">
                      Channel performance and combined sales totals
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] font-mono font-bold border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Combined: ₱{salesMetrics.combinedGrossRevenue.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[480px] sm:min-w-0">
                  <thead>
                    <tr className="border-b border-stone-800/80 text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-400 font-semibold bg-stone-950/40">
                      <th className="py-2.5 px-3.5 rounded-l-lg">Sales Channel</th>
                      <th className="py-2.5 px-3.5 text-center">Volume Sold</th>
                      <th className="py-2.5 px-3.5 text-center">Transactions</th>
                      <th className="py-2.5 px-3.5 text-right rounded-r-lg">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/50 text-xs font-sans">
                    {/* 1. POS */}
                    <tr className="hover:bg-stone-800/30 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 shrink-0" />
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-100 text-xs sm:text-sm">POS</span>
                            <span className="text-[10px] sm:text-xs text-stone-400 font-normal">
                              (Face-to-Face Counter)
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">
                        <span className="font-bold text-stone-100">{salesMetrics.posPiecesSold}</span>
                        <span className="text-[11px] text-stone-400 ml-1">pcs</span>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono text-stone-300 text-xs">
                        {salesMetrics.posOrdersCount} <span className="text-[10px] text-stone-400">txns</span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                        ₱{salesMetrics.posRevenue.toLocaleString()}
                      </td>
                    </tr>

                    {/* 2. Online Showcase */}
                    <tr className="hover:bg-stone-800/30 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50 shrink-0" />
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-100 text-xs sm:text-sm">Online Showcase</span>
                            <span className="text-[10px] sm:text-xs text-stone-400 font-normal">
                              (Customer Orders)
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono">
                        <span className="font-bold text-stone-100">{salesMetrics.onlinePiecesSold}</span>
                        <span className="text-[11px] text-stone-400 ml-1">pcs</span>
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono text-stone-300 text-xs">
                        {salesMetrics.onlineOrdersCount} <span className="text-[10px] text-stone-400">orders</span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400 text-xs sm:text-sm">
                        ₱{salesMetrics.onlineRevenue.toLocaleString()}
                      </td>
                    </tr>

                    {/* 3. Combined Total */}
                    <tr className="bg-emerald-950/20 font-bold border-t-2 border-stone-700/80">
                      <td className="py-3.5 px-3.5 rounded-l-lg">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 shrink-0" />
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-emerald-300 uppercase tracking-wider text-xs sm:text-sm">
                              Total
                            </span>
                            <span className="text-[10px] sm:text-xs text-stone-400 font-normal">
                              (Combined Sales)
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-mono">
                        <span className="font-black text-emerald-300">{salesMetrics.combinedPiecesSold}</span>
                        <span className="text-[11px] text-emerald-400/80 ml-1">pcs</span>
                      </td>
                      <td className="py-3.5 px-3.5 text-center font-mono text-emerald-300 text-xs">
                        {salesMetrics.combinedOrdersCount} <span className="text-[10px] text-stone-400">total</span>
                      </td>
                      <td className="py-3.5 px-3.5 text-right font-mono font-black text-emerald-400 text-sm sm:text-base rounded-r-lg">
                        ₱{salesMetrics.combinedGrossRevenue.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Decorative Accent Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-sky-500 to-emerald-500" />
            </div>
          </div>

          {/* Cash Flow Summary KPI Cards: Total Inflow, Total Outflow, Net Operating Outflow/Inflow, Lost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* KPI Card: Lost */}
            <div className="p-5 rounded-2xl glass-panel relative overflow-hidden flex flex-col justify-between group hover:border-amber-500/40 transition">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-stone-400">Lost</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                    {lostMetrics.activeLostPieces} pcs missing
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  ₱{lostMetrics.activeLostValue.toLocaleString()}
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  {lostMetrics.totalLostPieces > 0
                    ? 'Active missing inventory valuation'
                    : 'No unaccounted missing items'}
                </p>
              </div>

              <div className="pt-3 mt-2 border-t border-stone-800/80">
                <button
                  type="button"
                  onClick={() => setIsViewLostModalOpen(true)}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-amber-500/30 cursor-pointer active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Product Lost</span>
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
            </div>
          </div>

          {/* Filters Bar & Export Button */}
          <div className="p-5 rounded-3xl glass-panel space-y-4 relative z-30">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search code, product name, order #, description, or payment method..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Action Buttons: Filter by Product & Export to Excel */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Filter by Product Button (like Product Inventory Management) */}
                <button
                  type="button"
                  onClick={() => setIsProductFilterModalOpen(true)}
                  className={`py-2.5 px-4 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0 ${
                    selectedProductFilterId
                      ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/30'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border-orange-500/30'
                  }`}
                >
                  <Filter className="w-4 h-4 text-orange-400" />
                  <span>
                    {selectedProductFilter
                      ? `Filter: ${selectedProductFilter.barcode}`
                      : 'Filter by Product'}
                  </span>
                </button>

                {/* Export to Excel button */}
                <button
                  onClick={handleExportExcel}
                  className="py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-white border border-orange-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4 text-orange-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Active Product Filter Chip */}
            {selectedProductFilter && (
              <div className="flex items-center justify-between p-2.5 px-3 rounded-2xl bg-gradient-to-r from-orange-950/60 to-amber-950/40 border border-orange-500/40 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-orange-400 font-bold bg-stone-900 px-2 py-0.5 rounded border border-orange-500/30 shrink-0">
                    {selectedProductFilter.barcode}
                  </span>
                  <span className="text-white font-semibold truncate">
                    {selectedProductFilter.name}
                  </span>
                  <span className="text-stone-400 hidden sm:inline">
                    ({selectedProductFilter.category})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProductFilterId(null)}
                  className="text-stone-400 hover:text-white flex items-center gap-1 text-[11px] font-semibold hover:underline shrink-0 ml-2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Filter</span>
                </button>
              </div>
            )}

            {/* Filter Controls Row: 4 Clean Dropdown Buttons (Channel, Flow, Payment Method, Date) */}
            <div
              ref={dropdownRef}
              className="flex flex-wrap items-center gap-2.5 text-xs pt-2 border-t border-stone-800/80 relative z-30"
            >
              {/* 1. CHANNEL DROPDOWN BUTTON */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
                    channelFilter === 'pos'
                      ? 'bg-orange-950/50 text-orange-300 border-orange-500/60 shadow-sm'
                      : channelFilter === 'online'
                      ? 'bg-sky-950/50 text-sky-300 border-sky-500/60 shadow-sm'
                      : channelFilter === 'disbursement'
                      ? 'bg-rose-950/50 text-rose-300 border-rose-500/60 shadow-sm'
                      : openDropdown === 'channel'
                      ? 'bg-stone-900 text-white border-orange-500'
                      : 'bg-stone-950 hover:bg-stone-900 text-stone-200 hover:text-white border-stone-800'
                  }`}
                >
                  {channelFilter === 'pos' ? (
                    <Store className="w-3.5 h-3.5 text-orange-400" />
                  ) : channelFilter === 'online' ? (
                    <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
                  ) : channelFilter === 'disbursement' ? (
                    <Receipt className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Layers className="w-3.5 h-3.5 text-orange-400" />
                  )}
                  <span>{getChannelLabel()}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                      openDropdown === 'channel' ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>

                {/* Channel Dropdown Menu */}
                {openDropdown === 'channel' && (
                  <div className="absolute left-0 top-full mt-1.5 w-60 rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl p-1.5 z-50 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Channel Selection
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setChannelFilter('all');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        channelFilter === 'all'
                          ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-orange-400" />
                        <div>
                          <div>All Channels</div>
                          <div className="text-[10px] text-stone-400 font-normal">POS, Online & Disbursements</div>
                        </div>
                      </div>
                      {channelFilter === 'all' && <Check className="w-4 h-4 text-orange-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChannelFilter('pos');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        channelFilter === 'pos'
                          ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-orange-400" />
                        <div>
                          <div>POS (Face-to-Face)</div>
                          <div className="text-[10px] text-stone-400 font-normal">Physical in-store register sales</div>
                        </div>
                      </div>
                      {channelFilter === 'pos' && <Check className="w-4 h-4 text-orange-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChannelFilter('online');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        channelFilter === 'online'
                          ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
                        <div>
                          <div>Online Orders</div>
                          <div className="text-[10px] text-stone-400 font-normal">Digital showcase & web orders</div>
                        </div>
                      </div>
                      {channelFilter === 'online' && <Check className="w-4 h-4 text-sky-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChannelFilter('disbursement');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        channelFilter === 'disbursement'
                          ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Receipt className="w-3.5 h-3.5 text-rose-400" />
                        <div>
                          <div>Disbursements</div>
                          <div className="text-[10px] text-stone-400 font-normal">Operating costs & money out</div>
                        </div>
                      </div>
                      {channelFilter === 'disbursement' && <Check className="w-4 h-4 text-rose-400" />}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. FLOW DROPDOWN BUTTON */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'flow' ? null : 'flow')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
                    flowFilter === 'inflow'
                      ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/60 shadow-sm'
                      : flowFilter === 'outflow'
                      ? 'bg-rose-950/50 text-rose-300 border-rose-500/60 shadow-sm'
                      : openDropdown === 'flow'
                      ? 'bg-stone-900 text-white border-orange-500'
                      : 'bg-stone-950 hover:bg-stone-900 text-stone-200 hover:text-white border-stone-800'
                  }`}
                >
                  <ArrowUpDown
                    className={`w-3.5 h-3.5 ${
                      flowFilter === 'inflow'
                        ? 'text-emerald-400'
                        : flowFilter === 'outflow'
                        ? 'text-rose-400'
                        : 'text-orange-400'
                    }`}
                  />
                  <span>{getFlowLabel()}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                      openDropdown === 'flow' ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>

                {/* Flow Dropdown Menu */}
                {openDropdown === 'flow' && (
                  <div className="absolute left-0 top-full mt-1.5 w-56 rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl p-1.5 z-50 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Cash Flow Type
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFlowFilter('all');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        flowFilter === 'all'
                          ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="w-3.5 h-3.5 text-orange-400" />
                        <span>All Flows</span>
                      </div>
                      {flowFilter === 'all' && <Check className="w-4 h-4 text-orange-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFlowFilter('inflow');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        flowFilter === 'inflow'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                        <div>
                          <div>Inflow (Money In)</div>
                          <div className="text-[10px] text-stone-400 font-normal">POS sales, online orders</div>
                        </div>
                      </div>
                      {flowFilter === 'inflow' && <Check className="w-4 h-4 text-emerald-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFlowFilter('outflow');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        flowFilter === 'outflow'
                          ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                        <div>
                          <div>Outflow (Money Out)</div>
                          <div className="text-[10px] text-stone-400 font-normal">Expenses, disbursements</div>
                        </div>
                      </div>
                      {flowFilter === 'outflow' && <Check className="w-4 h-4 text-rose-400" />}
                    </button>
                  </div>
                )}
              </div>

              {/* 3. PAYMENT METHOD DROPDOWN BUTTON */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'payment' ? null : 'payment')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
                    paymentFilter !== 'all'
                      ? 'bg-orange-950/50 text-orange-300 border-orange-500/60 shadow-sm'
                      : openDropdown === 'payment'
                      ? 'bg-stone-900 text-white border-orange-500'
                      : 'bg-stone-950 hover:bg-stone-900 text-stone-200 hover:text-white border-stone-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                  <span>{getPaymentLabel()}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                      openDropdown === 'payment' ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>

                {/* Payment Dropdown Menu */}
                {openDropdown === 'payment' && (
                  <div className="absolute left-0 top-full mt-1.5 w-52 rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl p-1.5 z-50 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Payment Method
                    </div>
                    {[
                      { id: 'all', label: 'All Payment Methods' },
                      { id: 'cash', label: 'Cash' },
                      { id: 'gcash', label: 'GCash' },
                      { id: 'bank_transfer', label: 'Bank Transfer' },
                      { id: 'card', label: 'Debit / Credit Card' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPaymentFilter(item.id);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          paymentFilter === item.id
                            ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30'
                            : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                        }`}
                      >
                        <span>{item.label}</span>
                        {paymentFilter === item.id && <Check className="w-4 h-4 text-orange-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. DATE DROPDOWN BUTTON */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition cursor-pointer ${
                    datePreset !== 'all'
                      ? 'bg-amber-950/50 text-amber-300 border-amber-500/60 shadow-sm'
                      : openDropdown === 'date'
                      ? 'bg-stone-900 text-white border-orange-500'
                      : 'bg-stone-950 hover:bg-stone-900 text-stone-200 hover:text-white border-stone-800'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-orange-400" />
                  <span>{getDateLabel()}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
                      openDropdown === 'date' ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </button>

                {/* Date Dropdown Menu */}
                {openDropdown === 'date' && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-72 rounded-2xl bg-stone-900 border border-stone-700 shadow-2xl p-2.5 z-50 space-y-2">
                    <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      Date Range Presets
                    </div>
                    <div className="space-y-1">
                      {[
                        { id: 'all', label: 'All Time' },
                        { id: 'today', label: 'Today (Current Day)' },
                        { id: 'last7', label: 'Last 7 Days' },
                        { id: 'this_month', label: 'This Month' },
                        { id: 'custom', label: 'Custom Date Range...' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setDatePreset(item.id as any);
                            if (item.id !== 'custom') {
                              setOpenDropdown(null);
                            }
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                            datePreset === item.id
                              ? 'bg-orange-500/20 text-orange-300 font-bold border border-orange-500/30'
                              : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                          }`}
                        >
                          <span>{item.label}</span>
                          {datePreset === item.id && <Check className="w-4 h-4 text-orange-400" />}
                        </button>
                      ))}
                    </div>

                    {/* Custom Range Inputs (displayed when custom preset is selected) */}
                    {datePreset === 'custom' && (
                      <div className="pt-2 mt-1 border-t border-stone-800 space-y-2 bg-stone-950/70 p-2.5 rounded-xl border border-stone-800">
                        <div className="text-[11px] font-semibold text-stone-300 flex items-center justify-between">
                          <span>Specify Range</span>
                          {(customStart || customEnd) && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomStart('');
                                setCustomEnd('');
                              }}
                              className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[10px] text-stone-400 mb-0.5">From</label>
                            <input
                              type="date"
                              value={customStart}
                              onChange={(e) => setCustomStart(e.target.value)}
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-stone-100 focus:outline-none focus:border-orange-500 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-stone-400 mb-0.5">To</label>
                            <input
                              type="date"
                              value={customEnd}
                              onChange={(e) => setCustomEnd(e.target.value)}
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2 py-1 text-stone-100 focus:outline-none focus:border-orange-500 text-xs"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(null)}
                          className="w-full mt-1 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition cursor-pointer text-center"
                        >
                          Apply Range
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reset Filters Button if any filter is active */}
              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-2.5 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 border border-stone-800 flex items-center gap-1.5 transition cursor-pointer"
                  title="Reset all active filters"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Database Table Below: Scrollable if more than 20 rows, Current date to past date at top */}
          <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-3.5 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-orange-500/20">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>Financial Transactions Ledger</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Newest First (Current Date → Past)
                  </span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Transactions sorted chronologically from current date to past. Max 20 rows visible before scrolling.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-orange-400 bg-stone-950 px-3 py-1.5 rounded-xl border border-orange-500/20">
                  {filteredTransactions.length} Transactions
                  {filteredTransactions.length > 20 && ' (20 visible • Scroll for more)'}
                </span>
                {filteredTransactions.length > 20 && (
                  <span className="text-[10px] text-stone-400 bg-stone-900/80 px-2 py-1 rounded-lg border border-stone-800 hidden sm:flex items-center gap-1 font-mono">
                    <ArrowUpDown className="w-3 h-3 text-orange-400" />
                    <span>Scrollbar Active</span>
                  </span>
                )}
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="text-center py-10 text-xs text-stone-400">
                No financial transactions recorded for this filter. Transactions from POS sales, shop orders, and expense disbursements will automatically appear here!
              </p>
            ) : (
              <>
                {/* Mobile Touch Cards View (visible on < md) with max 20 scrollbar */}
                <div className="block md:hidden max-h-[750px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-orange-500/60 scrollbar-track-stone-950">
                  {filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-stone-400 font-mono text-[11px]">
                          {tx.date || tx.createdAt.split('T')[0]}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tx.flowType === 'inflow'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {tx.flowType}
                        </span>
                      </div>

                      <div>
                        <p className="font-semibold text-white text-xs">{tx.account || tx.category}</p>
                        <p className="text-[11px] text-stone-400 truncate mt-0.5">{tx.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-stone-800/80 text-xs">
                        <span className="text-[11px] text-stone-400 uppercase font-mono">
                          {tx.paymentMethod.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-sm ${
                              tx.flowType === 'inflow' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {tx.flowType === 'inflow'
                              ? `+₱${(tx.inflow || 0).toLocaleString()}`
                              : `-₱${(tx.outflow || 0).toLocaleString()}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget({
                                type: 'transaction',
                                id: tx.id,
                                title: 'Delete Financial Transaction?',
                                message: 'Are you sure you want to delete this transaction record? If you clicked this by accident, click Cancel to keep it.',
                                itemName: `${tx.flowType.toUpperCase()}: ${tx.account || tx.category}`,
                                details: [
                                  { label: 'Date', value: tx.date || tx.createdAt.split('T')[0] },
                                  { label: 'Amount', value: `₱${((tx.inflow || 0) + (tx.outflow || 0)).toLocaleString()}` },
                                  { label: 'Payment Method', value: tx.paymentMethod.replace('_', ' ').toUpperCase() },
                                  { label: 'Description', value: tx.description || 'N/A' },
                                ],
                              });
                            }}
                            className="p-1 rounded-lg text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Full Table View (visible on md+) with max 20 rows height & scrollbar if too long */}
                <div className="hidden md:block overflow-x-auto max-h-[860px] overflow-y-auto rounded-2xl border border-stone-800 scrollbar-thin scrollbar-thumb-orange-500/60 scrollbar-track-stone-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-stone-900 border-b border-orange-500/20 shadow-sm backdrop-blur-md">
                      <tr className="text-stone-400 uppercase text-[11px]">
                        <th className="py-3 px-3">Date (Current→Past)</th>
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
                              type="button"
                              onClick={() => {
                                setDeleteTarget({
                                  type: 'transaction',
                                  id: tx.id,
                                  title: 'Delete Financial Transaction?',
                                  message: 'Are you sure you want to delete this transaction record? If you clicked this by accident, click Cancel to keep it.',
                                  itemName: `${tx.flowType.toUpperCase()}: ${tx.account || tx.category}`,
                                  details: [
                                    { label: 'Date', value: tx.date || tx.createdAt.split('T')[0] },
                                    { label: 'Amount', value: `₱${((tx.inflow || 0) + (tx.outflow || 0)).toLocaleString()}` },
                                    { label: 'Payment Method', value: tx.paymentMethod.replace('_', ' ').toUpperCase() },
                                    { label: 'Description', value: tx.description || 'N/A' },
                                  ],
                                });
                              }}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
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
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal to Log Return, Damaged, or Lost with Product Search & Filter */}
      <LogItemStatusModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
      />

      {/* Modal to View Lost Products and Update if Found */}
      <ViewProductLostModal
        isOpen={isViewLostModalOpen}
        onClose={() => setIsViewLostModalOpen(false)}
        onOpenLogLostModal={() => setIsLogModalOpen(true)}
      />

      {/* Modal to Filter Ledger by Product (Like Product Inventory Management) */}
      {isProductFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl bg-stone-900/95 border border-orange-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl text-stone-100 max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20 shrink-0">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
                  <Filter className="w-3 h-3" />
                  <span>Product Inventory Filter</span>
                </div>
                <h3 className="text-lg font-bold text-white">Filter Ledger by Product</h3>
                <p className="text-xs text-stone-400">
                  Search item code or name to instantly isolate transaction history without scrolling
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductFilterModalOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-3.5 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search Product Code (e.g. EX-123456), Name, or Category..."
                  value={productModalSearch}
                  onChange={(e) => setProductModalSearch(e.target.value)}
                  className="w-full pl-10 pr-16 py-2.5 rounded-xl bg-stone-950 border border-orange-500/30 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-orange-500"
                />
                {productModalSearch && (
                  <button
                    type="button"
                    onClick={() => setProductModalSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setProductModalCategory('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer text-xs ${
                    productModalCategory === 'all'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  All ({products.length})
                </button>
                {categories.map((c) => {
                  const count = products.filter(
                    (p) => p.category?.toLowerCase() === c.name?.toLowerCase()
                  ).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setProductModalCategory(c.name)}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer text-xs flex items-center gap-1.5 ${
                        productModalCategory.toLowerCase() === c.name.toLowerCase()
                          ? 'bg-orange-600 text-white shadow-md'
                          : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Product Match List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-stone-800 rounded-2xl p-2 bg-stone-950/60 scrollbar-thin scrollbar-thumb-orange-500/50">
                {modalFilteredProducts.length === 0 ? (
                  <p className="text-center py-8 text-xs text-stone-400">
                    No products found matching "{productModalSearch}". Try searching product code (e.g. EX-...) or name.
                  </p>
                ) : (
                  modalFilteredProducts.map((p) => {
                    const isSelected = selectedProductFilterId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProductFilterId(p.id);
                          setIsProductFilterModalOpen(false);
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-orange-950/70 border-orange-500 text-white'
                            : 'bg-stone-900/80 hover:bg-stone-800/80 border-stone-800 hover:border-orange-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover border border-stone-800 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center text-[10px] text-stone-400 shrink-0">
                              Item
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-white text-xs truncate">{p.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                              <span className="font-mono text-orange-400 font-bold bg-stone-950 px-1.5 py-0.5 rounded border border-stone-800">
                                {p.barcode}
                              </span>
                              <span>{p.category}</span>
                              <span className="text-emerald-400 font-mono">
                                ₱{p.sellingPrice.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-[10px] text-stone-400 font-mono">
                            {p.availableQuantity} in stock
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center gap-1 border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2 shrink-0">
              {selectedProductFilterId ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductFilterId(null);
                    setIsProductFilterModalOpen(false);
                  }}
                  className="py-2 px-3.5 rounded-xl border border-red-500/30 bg-red-950/40 hover:bg-red-900/50 text-red-300 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Active Filter</span>
                </button>
              ) : (
                <span className="text-xs text-stone-500">Click any product to isolate in ledger</span>
              )}
              <button
                type="button"
                onClick={() => setIsProductFilterModalOpen(false)}
                className="py-2 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to prevent accidental deletions */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.title || 'Are you sure you want to delete?'}
        message={deleteTarget?.message || 'If you clicked this by accident, click Cancel to keep it. This action cannot be undone.'}
        itemName={deleteTarget?.itemName}
        itemDetails={deleteTarget?.details}
        isLoading={isDeleting}
      />
    </div>
  );
};
