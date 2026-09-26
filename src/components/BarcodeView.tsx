import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import {
  Barcode as BarcodeIcon,
  Printer,
  CheckSquare,
  Square,
  Sparkles,
  CheckCircle,
  RotateCcw,
  Tag,
  Filter,
} from 'lucide-react';

export const BarcodeView: React.FC = () => {
  const { products, updateProduct, toggleProductBarcodeStatus } = useStore();

  // 2 Filter Buttons: "New Code" vs "Old Code" (Done)
  const [filterMode, setFilterMode] = useState<'new' | 'done'>('new');

  // Multi-select for printing
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Filtered products list
  const currentList = useMemo(() => {
    return products.filter((p) => (p.barcodeStatus || 'new') === filterMode);
  }, [products, filterMode]);

  // Handle Select All
  const isAllSelected =
    currentList.length > 0 && currentList.every((p) => selectedProductIds.includes(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds((prev) =>
        prev.filter((id) => !currentList.some((p) => p.id === id))
      );
    } else {
      const allCurrentIds = currentList.map((p) => p.id);
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...allCurrentIds])));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Generate or regenerate codes for all products
  const handleGenerateAllCodes = async () => {
    for (const p of products) {
      if (!p.barcode || p.barcode.startsWith('EX-') === false) {
        const newCode = `EX-${Math.floor(100000 + Math.random() * 900000)}`;
        await updateProduct(p.id, { barcode: newCode });
      }
    }
  };

  // Mark selected as Done (Old Code)
  const handleMarkSelectedAsDone = async () => {
    const targetStatus = filterMode === 'new' ? 'done' : 'new';
    for (const id of selectedProductIds) {
      await updateProduct(id, { barcodeStatus: targetStatus });
    }
    setSelectedProductIds([]);
  };

  // Trigger Print
  const handlePrintLabels = () => {
    window.print();
  };

  const printableProducts = useMemo(() => {
    return products.filter((p) => selectedProductIds.includes(p.id));
  }, [products, selectedProductIds]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header & Actions (hidden in print) */}
      <div className="p-6 rounded-3xl glass-panel space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-orange-500/20">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <BarcodeIcon className="w-6 h-6 text-orange-400" />
              <span>Barcode & Label Generation Center</span>
            </h1>
            <p className="text-xs text-stone-400">
              Template: EXINS JKSUR+ with product name and scannable alphanumeric codes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerateAllCodes}
              className="py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-orange-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Generate Codes for All</span>
            </button>

            <button
              onClick={handlePrintLabels}
              disabled={selectedProductIds.length === 0}
              className={`py-2.5 px-5 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                selectedProductIds.length === 0
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-orange-600/30'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Print Selected Labels ({selectedProductIds.length})</span>
            </button>
          </div>
        </div>

        {/* 2 Buttons for New Code vs Old Code (Done) as requested */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setFilterMode('new');
                setSelectedProductIds([]);
              }}
              className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                filterMode === 'new'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>New Code ({products.filter((p) => (p.barcodeStatus || 'new') === 'new').length})</span>
            </button>

            <button
              onClick={() => {
                setFilterMode('done');
                setSelectedProductIds([]);
              }}
              className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                filterMode === 'done'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                  : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Old Code / Done ({products.filter((p) => p.barcodeStatus === 'done').length})</span>
            </button>
          </div>

          {/* Bulk Selection and Status Change Action */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={toggleSelectAll}
              className="py-1.5 px-3 rounded-lg bg-stone-950/80 border border-stone-800 text-stone-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-orange-400" />
              ) : (
                <Square className="w-4 h-4 text-stone-500" />
              )}
              <span>Select All in {filterMode === 'new' ? 'New' : 'Old'}</span>
            </button>

            {selectedProductIds.length > 0 && (
              <button
                onClick={handleMarkSelectedAsDone}
                className="py-1.5 px-3 rounded-lg bg-amber-600/30 border border-amber-500/50 text-amber-300 hover:bg-amber-600/50 font-semibold cursor-pointer"
              >
                Mark Selected as {filterMode === 'new' ? 'Done (Old Code)' : 'New Code'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Product Barcode Preview Cards (Screen and Print Optimized) */}
      {currentList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl glass-panel text-stone-400 text-xs no-print">
          No items found in "{filterMode === 'new' ? 'New Code' : 'Old Code'}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentList.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);

            return (
              <div
                key={product.id}
                className={`relative p-5 rounded-2xl border transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-stone-900 border-orange-500 shadow-lg shadow-orange-500/10'
                    : 'bg-stone-950/70 border-stone-800 opacity-90'
                }`}
              >
                {/* Checkbox & Status toggle (no-print) */}
                <div className="flex items-center justify-between pb-3 border-b border-stone-800 no-print">
                  <button
                    onClick={() => toggleSelectOne(product.id)}
                    className="flex items-center gap-2 text-xs font-semibold text-stone-300 cursor-pointer"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-orange-400" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-600" />
                    )}
                    <span>Select for Print</span>
                  </button>

                  <button
                    onClick={() => toggleProductBarcodeStatus(product.id)}
                    className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300 hover:text-orange-400"
                  >
                    Set to {product.barcodeStatus === 'done' ? 'New' : 'Done'}
                  </button>
                </div>

                {/* The EXACT requested template:
                    EXINS JKSUR+
                    The name of the product
                    The auto-generated code
                */}
                <div className="py-4 text-center space-y-2">
                  <p className="text-[11px] font-black tracking-widest uppercase text-orange-500 font-sans">
                    EXINS JKSUR+
                  </p>

                  <h3 className="text-sm font-bold text-white truncate px-2">{product.name}</h3>

                  <p className="text-xs text-stone-300">
                    Size: <span className="font-bold text-orange-400">{product.size || 'Free Size'}</span> • ₱{product.sellingPrice.toLocaleString()}
                  </p>

                  {/* Visual Barcode pattern */}
                  <div className="py-2 flex flex-col items-center">
                    <div className="h-10 flex items-center justify-center gap-[2px] bg-white px-3 py-1 rounded">
                      {[1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 4, 1, 2, 1, 3, 1, 2].map((w, i) => (
                        <div
                          key={i}
                          className="h-full bg-black"
                          style={{ width: `${w * 1.5}px` }}
                        />
                      ))}
                    </div>
                    {/* Auto-generated code */}
                    <p className="font-mono text-xs font-bold text-orange-400 tracking-widest mt-1.5">
                      *{product.barcode || 'EX-999999'}*
                    </p>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-stone-800/60 text-[10px] text-stone-500 font-mono">
                  EXINS QC • Apparel Tag
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden container specifically styled for print */}
      <div className="hidden print:block print:w-full print:p-2">
        <div className="grid grid-cols-3 gap-4">
          {printableProducts.map((product) => (
            <div
              key={product.id}
              className="border-2 border-black p-4 text-center rounded text-black font-sans space-y-2 break-inside-avoid"
            >
              <h2 className="text-sm font-black tracking-widest uppercase">EXINS JKSUR+</h2>
              <p className="text-xs font-bold leading-tight truncate">{product.name}</p>
              <p className="text-[11px]">
                Size: <strong>{product.size || 'Free Size'}</strong> | ₱{product.sellingPrice.toLocaleString()}
              </p>
              <div className="h-9 flex items-center justify-center gap-[2px] py-1">
                {[1, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2, 4, 1, 2, 1, 3, 1, 2].map((w, i) => (
                  <div key={i} className="h-full bg-black" style={{ width: `${w * 1.5}px` }} />
                ))}
              </div>
              <p className="font-mono text-xs font-black tracking-widest">
                *{product.barcode || 'EX-999999'}*
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
