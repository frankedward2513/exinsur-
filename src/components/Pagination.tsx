import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemName = 'items',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers window
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-orange-500/20 text-xs text-stone-400">
      <div>
        Showing <span className="font-semibold text-white font-mono">{startItem}</span> to{' '}
        <span className="font-semibold text-white font-mono">{endItem}</span> of{' '}
        <span className="font-semibold text-orange-400 font-mono">{totalItems}</span> {itemName}
      </div>

      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-stone-800 bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline text-[11px] pr-1">Prev</span>
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`min-w-8 h-8 px-2 rounded-lg font-mono font-bold text-xs transition cursor-pointer ${
              p === currentPage
                ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md shadow-orange-600/30 border border-orange-500/40'
                : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-stone-800 bg-stone-900 text-stone-300 hover:text-white hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-1"
          aria-label="Next Page"
        >
          <span className="hidden sm:inline text-[11px] pl-1">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
