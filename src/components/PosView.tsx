import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Order } from '../types';
import { ReceiptModal } from './ReceiptModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  Search,
  Barcode,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Printer,
  DollarSign,
  Percent,
  CheckCircle,
  AlertCircle,
  Tag,
  Sparkles,
} from 'lucide-react';

export const PosView: React.FC = () => {
  const { products, completePosSale } = useStore();

  // Fast type-in barcode / product code input (no scanner needed)
  const [codeInput, setCodeInput] = useState('');
  const [codeMessage, setCodeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // POS Cart State
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number | ''>('');
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash'>('cash');
  const [amountTendered, setAmountTendered] = useState<number | ''>('');

  // Completed Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemToRemoveTarget, setItemToRemoveTarget] = useState<Product | null>(null);

  // Add product to POS Cart
  const addItemToCart = (prod: Product, qty = 1) => {
    if (prod.availableQuantity <= 0) {
      setCodeMessage({ text: `${prod.name} is out of stock!`, type: 'error' });
      return;
    }

    setPosCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === prod.id);
      if (idx > -1) {
        const currentQty = prev[idx].quantity;
        const newQty = currentQty + qty;
        if (newQty > prod.availableQuantity) {
          setCodeMessage({
            text: `Only ${prod.availableQuantity} in stock for ${prod.name}!`,
            type: 'error',
          });
          return prev;
        }
        setCodeMessage({ text: `Updated ${prod.name} (Qty: ${newQty})`, type: 'success' });
        return prev.map((item, i) => (i === idx ? { ...item, quantity: newQty } : item));
      } else {
        if (qty > prod.availableQuantity) {
          setCodeMessage({
            text: `Only ${prod.availableQuantity} in stock for ${prod.name}!`,
            type: 'error',
          });
          return prev;
        }
        setCodeMessage({ text: `Added ${prod.name} to cart.`, type: 'success' });
        return [...prev, { product: prod, quantity: qty }];
      }
    });
  };

  // Handle enter key or button on Code Input
  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;

    const query = codeInput.trim().toLowerCase();
    const matched = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === query) ||
        p.id.toLowerCase() === query ||
        p.name.toLowerCase() === query
    );

    if (matched) {
      addItemToCart(matched, 1);
      setCodeInput('');
    } else {
      setCodeMessage({
        text: `No product found matching code "${codeInput}". Please check code or search below.`,
        type: 'error',
      });
    }
  };

  // Adjust Cart Quantity
  const handleUpdateQty = (productId: string, newQty: number) => {
    if (newQty < 1) return;
    const target = products.find((p) => p.id === productId);
    const maxStock = target ? target.availableQuantity : 99;

    if (newQty > maxStock) {
      setCodeMessage({
        text: `Only ${maxStock} in stock for ${target?.name}!`,
        type: 'error',
      });
      return;
    }

    setPosCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: newQty } : item))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setPosCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Calculations
  const rawSubtotal = useMemo(
    () => posCart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0),
    [posCart]
  );

  const discountVal = Number(discountAmount) || 0;
  const totalAmountDue = Math.max(0, rawSubtotal - discountVal);
  const tenderedVal = Number(amountTendered) || 0;
  const changeAmount = Math.max(0, tenderedVal - totalAmountDue);

  // Confirm Transaction
  const handleConfirmTransaction = async () => {
    if (posCart.length === 0) return;
    if (tenderedVal < totalAmountDue) {
      setCodeMessage({
        text: `Amount tendered (₱${tenderedVal}) is less than total amount due (₱${totalAmountDue})!`,
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await completePosSale({
        items: posCart,
        customerName: customerName.trim() || 'Walk-in Customer',
        discount: discountVal,
        paymentMethod,
        amountTendered: tenderedVal,
      });

      // Clear POS cart & state
      setPosCart([]);
      setCustomerName('');
      setDiscountAmount('');
      setAmountTendered('');
      setShowDiscountInput(false);
      setCodeMessage({ text: 'Sale successfully completed and saved!', type: 'success' });
      setCompletedOrder(order);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real-time matching products while typing barcode or name
  const matchingProducts = useMemo(() => {
    if (!codeInput.trim()) return [];
    const q = codeInput.trim().toLowerCase();
    return products
      .filter(
        (p) =>
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [products, codeInput]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in pb-16">
      {/* LEFT: Direct Code Entry & Quick Terminal Tools (5 cols) */}
      <div className="lg:col-span-5 space-y-5">
        {/* Type-in Code Input Box (NO NEED FOR SCANNER) */}
        <div className="p-6 rounded-3xl glass-panel space-y-4 border border-orange-500/30">
          <div className="flex items-center justify-between pb-2 border-b border-orange-500/20">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Barcode className="w-5 h-5 text-orange-400" />
              <span>Type-in Product Code (Instant Add)</span>
            </h2>
            <span className="text-[11px] text-stone-400 font-mono">Press Enter</span>
          </div>

          <p className="text-xs text-stone-400">
            Type any barcode (e.g. EX-123456) or product name and press <strong>Enter</strong> to instantly add to the bag.
          </p>

          <form onSubmit={handleCodeSubmit} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Enter barcode or name..."
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value);
                    setCodeMessage(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-950 border border-orange-500/30 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none font-mono"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95 shrink-0"
              >
                Add Item
              </button>
            </div>
          </form>

          {codeMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                codeMessage.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
              }`}
            >
              {codeMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{codeMessage.text}</span>
            </div>
          )}

          {/* Real-time Match Suggestions while typing */}
          {codeInput.trim().length > 0 && matchingProducts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <span className="text-[11px] font-semibold uppercase text-stone-400">
                Matching Catalog ({matchingProducts.length}):
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {matchingProducts.map((p) => {
                  const isOutOfStock = p.availableQuantity <= 0;
                  return (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-stone-950/70 border border-stone-800 flex items-center justify-between gap-2 text-xs hover:border-orange-500/40 transition"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{p.name}</div>
                        <div className="text-[10px] text-stone-400 font-mono flex items-center gap-2">
                          <span className="text-orange-400 font-bold">₱{p.sellingPrice.toLocaleString()}</span>
                          <span>•</span>
                          <span>SKU: {p.barcode}</span>
                          <span>•</span>
                          <span className={isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}>
                            Stock: {p.availableQuantity}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => {
                          addItemToCart(p, 1);
                          setCodeInput('');
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                          isOutOfStock
                            ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                            : 'bg-orange-500 hover:bg-orange-400 text-stone-950 shadow-sm'
                        }`}
                      >
                        + Add
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick Cashier Guide */}
        <div className="p-5 rounded-3xl glass-panel space-y-3 text-xs text-stone-400 border border-stone-800">
          <h4 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
            <CheckCircle className="w-4 h-4 text-orange-400" />
            <span>Fast POS Checkout Guide</span>
          </h4>
          <ul className="space-y-1.5 list-disc list-inside text-[11px] leading-relaxed">
            <li>Type any product barcode number or product name and press <strong>Enter</strong>.</li>
            <li>Adjust quantities or remove items directly in the cart bag.</li>
            <li>Choose <strong>Cash</strong> or <strong>GCash</strong>, enter tendered amount, and change will auto-compute.</li>
            <li>Click <strong>Confirm Transaction</strong> to deduct stock and generate an official receipt.</li>
          </ul>
        </div>
      </div>

      {/* RIGHT: Current Cart Bag & Register Terminal (7 cols) */}
      <div className="lg:col-span-7 space-y-5">
        <div className="p-6 rounded-3xl glass-panel space-y-4 border border-orange-500/30">
          <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">Current Cart Bag</h2>
            </div>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold">
              {posCart.length} items
            </span>
          </div>

          {/* Customer Name (Optional as requested) */}
          <div className="text-xs">
            <label className="block font-medium text-stone-300 mb-1">
              Customer Name <span className="text-stone-500">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Maria Santos / Walk-in"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 text-xs focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* List All Items */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {posCart.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto opacity-30 text-orange-400" />
                <p className="font-semibold text-stone-300">Bag is currently empty.</p>
                <p>Type product code or name on the left and press Enter.</p>
              </div>
            ) : (
              posCart.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="p-3 rounded-2xl bg-stone-950/80 border border-stone-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-10 h-10 rounded-xl object-cover bg-stone-900 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center text-[10px] shrink-0">
                        Item
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{product.name}</p>
                      <p className="text-[10px] text-stone-400">
                        Size: {product.size} • ₱{product.sellingPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-stone-900 px-1.5 py-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(product.id, quantity - 1)}
                        className="p-0.5 text-stone-300 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono font-bold text-white px-1">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(product.id, quantity + 1)}
                        className="p-0.5 text-stone-300 hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setItemToRemoveTarget(product)}
                      className="p-1 rounded-lg text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing & Discount */}
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2.5 text-xs">
            <div className="flex justify-between text-stone-300">
              <span>Subtotal Amount:</span>
              <span className="font-mono font-semibold">₱{rawSubtotal.toLocaleString()}</span>
            </div>

            {/* Add Discount Button & Field as requested */}
            <div>
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowDiscountInput(!showDiscountInput)}
                  className="text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{showDiscountInput ? 'Hide Discount' : '+ Add Discount'}</span>
                </button>
                {discountVal > 0 && (
                  <span className="text-emerald-400 font-mono font-bold">
                    -₱{discountVal.toLocaleString()}
                  </span>
                )}
              </div>

              {showDiscountInput && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter discount amount (₱)..."
                    value={discountAmount}
                    onChange={(e) =>
                      setDiscountAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-orange-500/30 text-stone-100 text-xs font-mono focus:outline-none"
                  />
                  {discountVal > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiscountAmount('')}
                      className="text-stone-400 hover:text-white text-xs px-2"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Total Amount Due */}
            <div className="pt-2 border-t border-stone-800 flex justify-between items-center text-sm font-bold text-white">
              <span>Total Amount Due:</span>
              <span className="text-xl font-black text-orange-400 font-mono">
                ₱{totalAmountDue.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment Method & Amount Tendered */}
          <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3 text-xs">
            <div>
              <label className="block font-medium text-stone-300 mb-1.5">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-xl border text-center font-bold text-xs uppercase cursor-pointer transition ${
                    paymentMethod === 'cash'
                      ? 'bg-orange-600 text-white border-orange-500'
                      : 'bg-stone-900 border-stone-800 text-stone-400'
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('gcash')}
                  className={`py-2 px-3 rounded-xl border text-center font-bold text-xs uppercase cursor-pointer transition ${
                    paymentMethod === 'gcash'
                      ? 'bg-orange-600 text-white border-orange-500'
                      : 'bg-stone-900 border-stone-800 text-stone-400'
                  }`}
                >
                  GCash
                </button>
              </div>
            </div>

            {/* Amount Tendered */}
            <div>
              <label className="block font-medium text-stone-300 mb-1">Amount Tendered (₱) *</label>
              <input
                type="number"
                min="0"
                placeholder={totalAmountDue.toString()}
                value={amountTendered}
                onChange={(e) =>
                  setAmountTendered(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-orange-500/20 text-stone-100 font-mono text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Automatically Calculates Change as requested */}
            <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 flex justify-between items-center text-xs">
              <span className="text-stone-300 font-medium">Calculated Change:</span>
              <span
                className={`font-mono font-black text-base ${
                  tenderedVal >= totalAmountDue ? 'text-emerald-400' : 'text-stone-500'
                }`}
              >
                ₱{changeAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Confirm Transaction & Print Receipt */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              disabled={isSubmitting || posCart.length === 0}
              onClick={handleConfirmTransaction}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                posCart.length === 0 || isSubmitting
                  ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white shadow-orange-600/30'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirm Transaction</span>
            </button>
          </div>
        </div>
      </div>

      {/* Official Receipt Modal */}
      {completedOrder && (
        <ReceiptModal order={completedOrder} onClose={() => setCompletedOrder(null)} />
      )}

      {/* Item Removal Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(itemToRemoveTarget)}
        onClose={() => setItemToRemoveTarget(null)}
        onConfirm={() => {
          if (itemToRemoveTarget) {
            handleRemoveItem(itemToRemoveTarget.id);
            setItemToRemoveTarget(null);
          }
        }}
        title="Remove Item from Cart?"
        message="Are you sure you want to remove this item from the active POS transaction? If you clicked this by accident, click Cancel to keep it."
        itemName={itemToRemoveTarget?.name}
        itemDetails={
          itemToRemoveTarget
            ? [
                { label: 'Barcode', value: itemToRemoveTarget.barcode },
                { label: 'Price', value: `₱${itemToRemoveTarget.sellingPrice.toLocaleString()}` },
              ]
            : undefined
        }
        confirmText="Yes, Remove"
        cancelText="Cancel"
      />
    </div>
  );
};
