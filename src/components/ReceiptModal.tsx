import React from 'react';
import { Order } from '../types';
import { Printer, X, CheckCircle, Package } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const isPos = order.orderSource === 'pos';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-stone-900 border border-orange-500/30 rounded-2xl shadow-2xl p-6 text-stone-100 max-h-[90vh] overflow-y-auto">
        {/* Header & Close */}
        <div className="flex items-center justify-between pb-4 border-b border-orange-500/20 no-print">
          <div className="flex items-center gap-2 text-orange-400 font-semibold text-lg">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>Official Transaction Receipt</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="py-4 space-y-4 font-mono text-sm">
          {/* Store Brand */}
          <div className="text-center space-y-1 border-b border-dashed border-stone-700 pb-4">
            <h2 className="text-2xl font-black tracking-wider text-orange-500 font-sans">EXINS</h2>
            <p className="text-xs uppercase tracking-widest text-stone-300">Jksur+ Novaliches Quezon City</p>
            <p className="text-xs text-stone-400 italic">“Your Next Favorite Outfit is Hiding Here.”</p>
            <p className="text-[11px] text-stone-400">Jksur+ Novaliches, Quezon City, Metro Manila</p>
            <p className="text-[11px] text-stone-400">Tel: +63 912 345 6789 | exins.novaliches@gmail.com</p>
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-1 text-xs border-b border-dashed border-stone-700 pb-3">
            <div className="flex justify-between">
              <span className="text-stone-400">Receipt No:</span>
              <span className="font-bold text-orange-400">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Date & Time:</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Customer:</span>
              <span className="font-medium">{order.customerName || 'Customer'}</span>
            </div>
            {order.contactNumber && order.contactNumber !== 'N/A' && (
              <div className="flex justify-between">
                <span className="text-stone-400">Contact:</span>
                <span>{order.contactNumber}</span>
              </div>
            )}
            {order.courier && (
              <div className="flex justify-between">
                <span className="text-stone-400">Courier:</span>
                <span className="uppercase font-bold text-orange-400">{order.courier}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-400">Channel / Type:</span>
              <span className="uppercase">{isPos ? 'In-Store POS' : 'Online Showcase'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Status:</span>
              <span className="uppercase font-semibold text-amber-400">{order.status}</span>
            </div>
          </div>

          {/* Purchased Items List */}
          <div className="space-y-2 border-b border-dashed border-stone-700 pb-3">
            <div className="text-xs font-bold text-stone-300 uppercase grid grid-cols-12">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-4 text-right">Amount</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {order.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 items-start">
                  <div className="col-span-6 pr-1">
                    <p className="font-medium text-stone-200 truncate">{item.name}</p>
                    <p className="text-[10px] text-stone-400">Size: {item.size}</p>
                  </div>
                  <div className="col-span-2 text-center text-stone-300">x{item.quantity}</div>
                  <div className="col-span-4 text-right font-medium text-stone-200">
                    ₱{(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculations */}
          <div className="space-y-1.5 text-xs border-b border-dashed border-stone-700 pb-3">
            {order.discount && order.discount > 0 ? (
              <div className="flex justify-between text-stone-300">
                <span>Discount Applied:</span>
                <span className="text-emerald-400">-₱{order.discount.toLocaleString()}</span>
              </div>
            ) : null}

            <div className="flex justify-between text-sm font-bold text-white pt-1">
              <span>Total Amount Due:</span>
              <span className="text-orange-400 text-base">₱{order.totalAmount.toLocaleString()}</span>
            </div>

            {order.paymentType === 'down_payment' ? (
              <>
                <div className="flex justify-between text-stone-300">
                  <span>Down Payment Paid:</span>
                  <span className="text-emerald-400 font-semibold">₱{order.downPaymentAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-300 font-semibold">
                  <span>Remaining Balance:</span>
                  <span>₱{order.remainingBalance.toLocaleString()}</span>
                </div>
              </>
            ) : null}

            {order.amountTendered !== undefined && order.amountTendered > 0 && (
              <>
                <div className="flex justify-between text-stone-300">
                  <span>Amount Tendered:</span>
                  <span>₱{order.amountTendered.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>Change:</span>
                  <span className="text-emerald-400 font-bold">₱{(order.changeAmount || 0).toLocaleString()}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-[11px] text-stone-400 pt-1">
              <span>Payment Mode:</span>
              <span className="uppercase">{order.paymentMethod || (order.paymentType === 'down_payment' ? 'Down Payment (GCash)' : 'Full Payment')}</span>
            </div>
          </div>

          {/* Shipping note if online */}
          {!isPos && (
            <div className="bg-amber-950/40 p-2.5 rounded-lg border border-orange-500/20 text-[11px] text-stone-300 flex items-start gap-2">
              <Package className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <span>
                <strong>Shipping Reminder:</strong> Shipping fee is paid directly by the customer to the courier upon delivery ({order.courier?.toUpperCase() || 'LBC/LALAMOVE/J&T'}).
              </span>
            </div>
          )}

          {/* Barcode representation */}
          <div className="text-center pt-2 space-y-1">
            <div className="inline-block px-4 py-1.5 bg-white text-black font-mono font-bold tracking-widest text-xs rounded">
              *{order.orderNumber}*
            </div>
            <p className="text-[11px] text-stone-400">Thank you for shopping with EXINS Jksur+ Novaliches!</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-orange-500/20 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold shadow-lg shadow-orange-600/30 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
