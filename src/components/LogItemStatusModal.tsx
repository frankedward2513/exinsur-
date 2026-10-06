import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  Search,
  CheckCircle,
  HelpCircle,
  Plus,
  Minus,
} from 'lucide-react';

interface LogItemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProductId?: string;
}

export const LogItemStatusModal: React.FC<LogItemStatusModalProps> = ({
  isOpen,
  onClose,
  preselectedProductId,
}) => {
  const { products, categories, logItemStatus } = useStore();

  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProductId || '');
  const logType: 'lost' = 'lost';
  const [logQty, setLogQty] = useState<number>(1);
  const [logNotes, setLogNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & category filter states to easily find products
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Filtered products list for fast selection
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (
        selectedCategory !== 'all' &&
        p.category?.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }

      // Search query (code, name, category, size)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCode = p.barcode?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        const matchSize = p.size?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchCat && !matchSize) return false;
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || logQty <= 0) return;

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setIsSubmitting(true);
    try {
      await logItemStatus({
        productId: prod.id,
        productName: prod.name,
        type: logType,
        quantity: logQty,
        notes: logNotes.trim(),
        adjustStock: true,
      });

      // Reset and close
      setSelectedProductId('');
      setLogNotes('');
      setLogQty(1);
      onClose();
    } catch (err) {
      console.error('Error logging lost item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-stone-900/95 border border-purple-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl text-stone-100 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-purple-500/20 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <HelpCircle className="w-3 h-3" />
              <span>Lost Item Tracking</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              Log Lost Item
            </h3>
            <p className="text-xs text-stone-400">
              Record missing or lost inventory to deduct stock and maintain accurate records
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* 1. PRODUCT SELECTION SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-stone-200 uppercase tracking-wider">
                1. Select Product *
              </label>
              {selectedProduct && (
                <button
                  type="button"
                  onClick={() => setSelectedProductId('')}
                  className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold underline cursor-pointer"
                >
                  Change Selected Product
                </button>
              )}
            </div>

            {selectedProduct ? (
              // Selected product card summary
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-950/60 to-amber-950/40 border border-orange-500/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedProduct.imageUrl ? (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      className="w-12 h-12 rounded-xl object-cover border border-orange-500/30 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center text-[10px] text-stone-400 shrink-0">
                      No Pic
                    </div>
                  )}
                  <div className="truncate">
                    <p className="font-bold text-white text-sm truncate">{selectedProduct.name}</p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-300 mt-0.5">
                      <span className="font-mono text-orange-400 font-bold bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                        {selectedProduct.barcode}
                      </span>
                      <span>{selectedProduct.category}</span>
                      <span>Size: {selectedProduct.size}</span>
                      <span className="text-emerald-400 font-mono">
                        In Stock: {selectedProduct.availableQuantity} pcs
                      </span>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-950/80 px-2.5 py-1.5 rounded-xl border border-emerald-500/40">
                  <CheckCircle className="w-4 h-4" />
                  <span>Selected</span>
                </div>
              </div>
            ) : (
              // Search & filter tools like Product Inventory Management
              <div className="space-y-2.5">
                {/* Search Bar with Fast Filter & Code Match */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search by Code (e.g. EX-123456), Product Name, or Category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filteredProducts.length > 0) {
                            setSelectedProductId(filteredProducts[0].id);
                          }
                        }
                      }}
                      className="w-full pl-10 pr-16 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 placeholder:text-stone-500 text-xs sm:text-sm focus:outline-none focus:border-orange-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white text-xs cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {filteredProducts.length > 0 && searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => setSelectedProductId(filteredProducts[0].id)}
                      className="px-3.5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Select Match</span>
                    </button>
                  )}
                </div>

                {/* Category Filter Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer text-xs ${
                      selectedCategory === 'all'
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    All Categories ({products.length})
                  </button>
                  {categories.map((c) => {
                    const count = products.filter(
                      (p) => p.category?.toLowerCase() === c.name?.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategory(c.name)}
                        className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer text-xs flex items-center gap-1.5 ${
                          selectedCategory.toLowerCase() === c.name.toLowerCase()
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

                {/* Product Select List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-stone-800 rounded-2xl p-2 bg-stone-950/50">
                  {filteredProducts.length === 0 ? (
                    <p className="text-center py-6 text-xs text-stone-400">
                      No products match your search or filter.
                    </p>
                  ) : (
                    filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProductId(p.id)}
                        className="p-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800/80 border border-stone-800/80 hover:border-orange-500/50 flex items-center justify-between gap-3 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg object-cover border border-stone-800 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-stone-800 flex items-center justify-center text-[9px] text-stone-400 shrink-0">
                              Item
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-white text-xs truncate">{p.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400">
                              <span className="font-mono text-orange-400 font-bold">
                                {p.barcode}
                              </span>
                              <span>{p.category}</span>
                              <span>₱{p.sellingPrice.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              p.availableQuantity <= 0
                                ? 'bg-rose-950/80 text-rose-300'
                                : 'bg-emerald-950/80 text-emerald-300'
                            }`}
                          >
                            {p.availableQuantity} in stock
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. EVENT TYPE: LOST */}
          <div>
            <label className="block text-xs font-bold text-stone-200 uppercase tracking-wider mb-2">
              2. Disposition Type
            </label>
            <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-purple-300">Lost Item</span>
                  <p className="text-[11px] text-stone-400">Automatically deducts stock from inventory</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-purple-400 bg-purple-900/40 px-2.5 py-1 rounded-lg border border-purple-500/30">
                -Deducts Stock
              </span>
            </div>
          </div>

          {/* 3. QUANTITY & REASON */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs font-bold text-stone-200 uppercase tracking-wider mb-1.5">
                Quantity (Pieces) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLogQty((q) => Math.max(1, q - 1))}
                  className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 hover:bg-stone-800 transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  required
                  value={logQty}
                  onChange={(e) => setLogQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 py-2 px-3 text-center rounded-xl bg-stone-950 border border-orange-500/25 text-white font-mono font-bold text-base focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setLogQty((q) => q + 1)}
                  className="p-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 hover:bg-stone-800 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-200 uppercase tracking-wider mb-1.5">
                Reason / Loss Note
              </label>
              <input
                type="text"
                placeholder="e.g. Missing from store rack, transit loss, miscount..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-stone-950 border border-orange-500/25 text-stone-100 placeholder:text-stone-500 text-xs focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={!selectedProductId || isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-3"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Confirm & Log Lost Item</span>
          </button>
        </form>
      </div>
    </div>
  );
};
