import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  itemName?: string;
  itemDetails?: { label: string; value: string | number }[];
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure you want to delete?',
  message = 'If you clicked this by accident, click Cancel to keep it. This action is permanent and cannot be undone.',
  itemName,
  itemDetails,
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl p-6 relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          title="Cancel and close"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0 text-rose-400 shadow-lg shadow-rose-500/10">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1 pr-6">
            <h3 className="text-lg font-bold text-white leading-snug">
              {title}
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Item Details Box (if provided) */}
        {(itemName || (itemDetails && itemDetails.length > 0)) && (
          <div className="mt-4 p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800/80 space-y-2 text-xs">
            {itemName && (
              <div className="font-semibold text-stone-100 flex items-center gap-2">
                <span className="text-stone-400 font-normal">Target:</span>
                <span className="truncate font-bold text-orange-400">{itemName}</span>
              </div>
            )}
            {itemDetails && itemDetails.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-800/60 font-mono text-[11px]">
                {itemDetails.map((detail, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <span className="text-stone-300 font-sans text-[10px] block">{detail.label}:</span>
                    <span className="text-stone-200 font-semibold truncate block">{detail.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions: Cancel vs Delete */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-semibold text-xs transition cursor-pointer text-center"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isLoading ? 'Deleting...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
