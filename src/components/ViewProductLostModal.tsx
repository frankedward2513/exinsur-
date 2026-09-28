import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { ItemStatusLog } from '../types';
import {
  X,
  Search,
  CheckCircle,
  Package,
  Calendar,
  Plus,
  Trash2,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface ViewProductLostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogLostModal?: () => void;
}

export const ViewProductLostModal: React.FC<ViewProductLostModalProps> = ({
  isOpen,
  onClose,
  onOpenLogLostModal,
}) => {
  const { products, itemStatusLogs, updateItemStatusLog, deleteItemStatusLog, updateProduct } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  
  // State for updating a lost item as found
  const [selectedLogForUpdate, setSelectedLogForUpdate] = useState<ItemStatusLog | null>(null);
  const [foundQty, setFoundQty] = useState<number>(1);
  const [foundDate, setFoundDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [foundNotes, setFoundNotes] = useState<string>('');
  const [restoreStock, setRestoreStock] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If any logs are already marked as found or have 0 qty, automatically remove them from lost records
  useEffect(() => {
    const foundLogs = itemStatusLogs.filter(
      (log) => log.type === 'lost' && (log.status === 'found' || log.quantity <= 0)
    );
    if (foundLogs.length > 0) {
      foundLogs.forEach((l) => deleteItemStatusLog(l.id).catch(console.warn));
    }
  }, [itemStatusLogs, deleteItemStatusLog]);

  // Active lost logs only (if found, it is removed from lost)
  const lostLogs = useMemo(() => {
    return itemStatusLogs.filter(
      (log) => log.type === 'lost' && log.status !== 'found' && log.quantity > 0
    );
  }, [itemStatusLogs]);

  // Compute metrics for active lost items
  const metrics = useMemo(() => {
    let totalLostPieces = 0;
    let totalLostValue = 0;

    lostLogs.forEach((log) => {
      const prod = products.find((p) => p.id === log.productId);
      const price = prod ? prod.sellingPrice : 0;
      totalLostPieces += log.quantity;
      totalLostValue += price * log.quantity;
    });

    return {
      totalLostPieces,
      totalLostValue,
      totalRecords: lostLogs.length,
    };
  }, [lostLogs, products]);

  // Filtered logs based on search
  const filteredLogs = useMemo(() => {
    return lostLogs.filter((log) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const prod = products.find((p) => p.id === log.productId);
        const nameMatch = log.productName.toLowerCase().includes(q);
        const notesMatch = log.notes?.toLowerCase().includes(q) || false;
        const barcodeMatch = prod?.barcode?.toLowerCase().includes(q) || false;
        const dateMatch = log.date.includes(q);
        if (!nameMatch && !notesMatch && !barcodeMatch && !dateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [lostLogs, searchQuery, products]);

  if (!isOpen) return null;

  // Open update dialog
  const handleOpenUpdate = (log: ItemStatusLog) => {
    setSelectedLogForUpdate(log);
    setFoundQty(log.quantity);
    setFoundDate(new Date().toISOString().split('T')[0]);
    setFoundNotes('');
    setRestoreStock(true);
  };

  // Submit update as found -> removes it from lost and restores inventory stock
  const handleConfirmFound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogForUpdate) return;

    setIsUpdating(true);
    try {
      const prod = products.find((p) => p.id === selectedLogForUpdate.productId);
      const isFullyFound = foundQty >= selectedLogForUpdate.quantity;

      if (isFullyFound) {
        // Fully found: Restock to inventory if requested and remove completely from lost!
        if (restoreStock && prod) {
          const restoredQty = (prod.availableQuantity || 0) + foundQty;
          await updateProduct(prod.id, { availableQuantity: restoredQty });
        }
        await deleteItemStatusLog(selectedLogForUpdate.id);

        setSuccessMessage(
          `"${selectedLogForUpdate.productName}" recovered! Restored ${foundQty} pc(s) to inventory and removed from lost list.`
        );
      } else {
        // Partial found: Restock found pieces, deduct from lost quantity
        const remainingLost = selectedLogForUpdate.quantity - foundQty;
        if (restoreStock && prod) {
          const restoredQty = (prod.availableQuantity || 0) + foundQty;
          await updateProduct(prod.id, { availableQuantity: restoredQty });
        }
        await updateItemStatusLog(selectedLogForUpdate.id, {
          quantity: remainingLost,
          notes: `${selectedLogForUpdate.notes ? selectedLogForUpdate.notes + ' | ' : ''}Found ${foundQty} pcs on ${foundDate}${foundNotes ? ': ' + foundNotes : ''}`,
        });

        setSuccessMessage(
          `Restored ${foundQty} pc(s) of "${selectedLogForUpdate.productName}" to inventory. Remaining lost updated to ${remainingLost} pc(s).`
        );
      }

      setTimeout(() => setSuccessMessage(null), 4000);
      setSelectedLogForUpdate(null);
    } catch (err) {
      console.error('Failed to update lost item:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete log manually
  const handleDeleteLog = async (id: string, name: string) => {
    if (!window.confirm(`Delete lost item log for "${name}"?`)) return;
    try {
      await deleteItemStatusLog(id);
      setSuccessMessage(`Removed log entry for "${name}".`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete log:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-stone-900/95 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl text-stone-100 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Lost Products Ledger</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono font-semibold border border-amber-500/30">
                  {lostLogs.length} Missing
                </span>
              </h3>
              <p className="text-xs text-stone-400">
                Active missing items. When found, mark them to automatically restock inventory and remove from lost.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenLogLostModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogLostModal();
                }}
                className="hidden sm:flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Log New Lost</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Summary Stat Cards: Total Lost Items & Total Financial Loss */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
          <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 relative overflow-hidden">
            <span className="text-[11px] font-semibold uppercase text-stone-400">Total Lost Items</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
              {metrics.totalRecords} Product{metrics.totalRecords !== 1 ? 's' : ''}
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {metrics.totalLostPieces} missing piece{metrics.totalLostPieces !== 1 ? 's' : ''} currently unaccounted for
            </p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/80" />
          </div>

          <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 relative overflow-hidden">
            <span className="text-[11px] font-semibold uppercase text-stone-400">Total Financial Loss</span>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
              ₱{metrics.totalLostValue.toLocaleString()}
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">Estimated missing inventory value</p>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500/80" />
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lost products by name, barcode, notes, or date..."
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-stone-950/80 border border-stone-800 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-amber-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lost Items List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-stone-950 min-h-[220px]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-stone-950/40 border border-stone-800/80">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-stone-200">No lost items recorded</p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No lost products match your search query.'
                  : 'All missing items have been found and resolved! Any new lost items logged will appear here.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const prod = products.find((p) => p.id === log.productId);
              const price = prod ? prod.sellingPrice : 0;
              const totalVal = price * log.quantity;

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl border bg-stone-950/70 border-stone-800 hover:border-amber-500/30 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Product Details */}
                    <div className="flex items-start gap-3">
                      {prod?.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={log.productName}
                          className="w-12 h-12 rounded-xl object-cover border border-stone-800 shrink-0 bg-stone-900"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0 text-stone-500">
                          <Package className="w-5 h-5" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">{log.productName}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                            <span>Missing ({log.quantity} pcs)</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-stone-400 flex-wrap">
                          {prod?.barcode && (
                            <span className="font-mono bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800">
                              SKU: {prod.barcode}
                            </span>
                          )}
                          {prod?.category && (
                            <span className="text-stone-400">{prod.category}</span>
                          )}
                          {prod && (
                            <span className="text-stone-300">
                              Stock on shelf: <strong className="text-white font-mono">{prod.availableQuantity} pcs</strong>
                            </span>
                          )}
                          <span className="text-stone-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Logged: {log.date}
                          </span>
                        </div>

                        {/* Notes */}
                        {log.notes && (
                          <p className="text-xs text-stone-400 italic">
                            Log note: "{log.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Financial Value & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-800/80 shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="text-xs text-stone-400 font-sans">
                          {log.quantity} pc{log.quantity > 1 ? 's' : ''} × ₱{price.toLocaleString()}
                        </div>
                        <div className="text-sm sm:text-base font-bold text-amber-400 font-mono">
                          ₱{totalVal.toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenUpdate(log)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer active:scale-95"
                          title="Restock to inventory and remove from lost list"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Update if Found</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id, log.productName)}
                          title="Delete log entry"
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-3 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <span>
            Showing {filteredLogs.length} of {lostLogs.length} missing records
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold transition"
          >
            Close
          </button>
        </div>

        {/* Sub-modal: Update If Found Dialog */}
        {selectedLogForUpdate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-lg bg-stone-900 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl text-stone-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">Item Found Resolution</h4>
                    <p className="text-xs text-stone-400">
                      Recover "{selectedLogForUpdate.productName}"
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLogForUpdate(null)}
                  className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <p>
                  Found items will be <strong>restocked to active inventory</strong> and{' '}
                  <strong>removed from the lost list</strong>.
                </p>
              </div>

              <form onSubmit={handleConfirmFound} className="space-y-4">
                {/* Quantity Found */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Quantity Found (Max: {selectedLogForUpdate.quantity} pcs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedLogForUpdate.quantity}
                    value={foundQty}
                    onChange={(e) => setFoundQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Original missing quantity: {selectedLogForUpdate.quantity} pcs
                  </p>
                </div>

                {/* Date Found */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Date Recovered / Found
                  </label>
                  <input
                    type="date"
                    value={foundDate}
                    onChange={(e) => setFoundDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-sm text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                {/* Restock Checkbox */}
                <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="restoreStock"
                    checked={restoreStock}
                    onChange={(e) => setRestoreStock(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-stone-700 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-stone-900 accent-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="restoreStock" className="text-xs cursor-pointer select-none">
                    <span className="font-bold text-emerald-400 block">
                      Restock into Available Inventory (+{foundQty} pcs)
                    </span>
                    <span className="text-stone-400 text-[11px] block mt-0.5">
                      Automatically increases the product's on-shelf stock quantity so it can be sold again.
                    </span>
                  </label>
                </div>

                {/* Resolution Notes */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Found Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={foundNotes}
                    onChange={(e) => setFoundNotes(e.target.value)}
                    placeholder="e.g. Found behind shelf A, returned by staff..."
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-sm text-white placeholder-stone-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setSelectedLogForUpdate(null)}
                    disabled={isUpdating}
                    className="py-2 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="py-2 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
                  >
                    {isUpdating ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirm - Restock & Remove from Lost</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
