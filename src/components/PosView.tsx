import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Order } from '../types';
import { ReceiptModal } from './ReceiptModal';
import {
  Store,
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
} from 'lucide-react';

export const PosView: React.FC = () => {
  const { products, completePosSale } = useStore();

  // Fast type-in barcode / product code input (no scanner needed)
  const [codeInput, setCodeInput] = useState('');
  const [codeMessage, setCodeMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search product grid
  const [searchCatalog, setSearchCatalog] = useState('');

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

  const filteredCatalog = useMemo(() => {
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchCatalog.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchCatalog.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchCatalog.toLowerCase())
    );
  }, [products, searchCatalog]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in pb-16">
      {/* LEFT: Shop Catalog & Direct Code Entry (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Type-in Code Input Box (NO NEED FOR SCANNER) */}
        <div className="p-6 rounded-3xl glass-panel space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-orange-500/20">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Barcode className="w-5 h-5 text-orange-400" />
              <span>Type-in Product Code (Instant Add)</span>
            </h2>
            <span className="text-[11px] text-stone-400 font-mono">No scanner needed</span>
          </div>

          <form onSubmit={handleCodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Type product code (e.g. EX-123456) and press Enter..."
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value);
                  setCodeMessage(null);
                }}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-stone-950 border border-orange-500/30 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none font-mono"
              />
            </div>
            <button
              type="submit"
              className="py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Add Item
            </button>
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
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{codeMessage.text}</span>
            </div>
          )}
        </div>

        {/* Quick Item Selection Catalog */}
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-orange-500/20">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-400" />
              <span>Store Product Tiles (Click to Add)</span>
            </h3>

            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-stone-950 border border-orange-500/20 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {filteredCatalog.length === 0 ? (
            <p className="text-center py-8 text-xs text-stone-400">
              No products found. List items in Inventory Management first!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredCatalog.map((product) => {
                const isOut = product.availableQuantity <= 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={isOut}
                    onClick={() => addItemToCart(product, 1)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition group cursor-pointer ${
                      isOut
                        ? 'bg-stone-950/40 border-stone-800 opacity-50 cursor-not-allowed'
                        : 'bg-stone-950/70 border-orange-500/20 hover:border-orange-500 hover:bg-stone-900 shadow-sm'
                    }`}
                  >
                    <div className="space-y-1.5 w-full">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-24 object-cover rounded-xl bg-stone-900 mb-1"
                        />
                      ) : (
                        <div className="w-full h-24 rounded-xl bg-stone-900 flex items-center justify-center text-[10px] text-stone-500 mb-1">
                          Apparel
                        </div>
                      )}
                      <p className="text-xs font-bold text-white truncate group-hover:text-orange-300">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-stone-400">
                        Size: {product.size || 'M'} • Stock: {product.availableQuantity}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between w-full mt-2">
                      <span className="font-mono text-xs font-bold text-orange-400">
                        ₱{product.sellingPrice.toLocaleString()}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-mono">
                        +{product.barcode}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Current Cart Bag & Register Terminal (5 cols) */}
      <div className="lg:col-span-5 space-y-5">
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
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {posCart.length === 0 ? (
              <div className="text-center py-10 text-stone-400 text-xs space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto opacity-30 text-orange-400" />
                <p>Bag is currently empty.</p>
                <p>Type in product code above or click on tiles.</p>
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
                      onClick={() => handleRemoveItem(product.id)}
                      className="p-1 rounded-lg text-stone-500 hover:text-red-400"
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
    </div>
  );
};
