import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, Order } from '../types';
import { ReceiptModal } from './ReceiptModal';
import {
  Search,
  ShoppingBag,
  ExternalLink,
  Plus,
  Minus,
  Trash2,
  CheckSquare,
  Square,
  Upload,
  Clock,
  Printer,
  XCircle,
  Truck,
  MapPin,
  Phone,
  Mail,
  Filter,
  CheckCircle2,
  AlertCircle,
  User,
} from 'lucide-react';

interface ShowcaseShopViewProps {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  onOpenAuth: () => void;
}

export const ShowcaseShopView: React.FC<ShowcaseShopViewProps> = ({
  isCartOpen,
  setIsCartOpen,
  onOpenAuth,
}) => {
  const {
    products,
    categories,
    currentUser,
    orders,
    cart,
    addToCart,
    updateCartQuantity,
    toggleCartItemSelect,
    toggleSelectAllCart,
    removeFromCart,
    clearSelectedCart,
    cartNotification,
    clearCartNotification,
    createOrder,
    updateOrderStatus,
    cancelOrder,
  } = useStore();

  const isGuest = currentUser.role === 'guest' || currentUser.isGuest || !currentUser.email;

  // Mode: 'browse' | 'orders'
  const [activeMode, setActiveMode] = useState<'browse' | 'orders'>('browse');

  // Search & Category Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState(currentUser.displayName || '');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState(currentUser.email || '');
  const [address, setAddress] = useState('');
  const [paymentType, setPaymentType] = useState<'pay_now' | 'down_payment'>('pay_now');
  const [courier, setCourier] = useState<'lbc' | 'lalamove' | 'jnt'>('jnt');
  const [receiptPhoto, setReceiptPhoto] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completed Receipt Modal
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat =
        selectedCategory === 'all' ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Selected Cart Items for Checkout
  const selectedCartItems = useMemo(() => cart.filter((item) => item.selected), [cart]);
  const selectedCartTotal = useMemo(
    () => selectedCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedCartItems]
  );
  const allCartSelected = cart.length > 0 && cart.every((item) => item.selected);

  // Orders to display (Customer sees their own or all if owner/staff)
  const displayOrders = useMemo(() => {
    if (currentUser.role === 'customer') {
      return orders.filter(
        (o) =>
          o.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
          o.customerName?.toLowerCase() === currentUser.displayName?.toLowerCase()
      );
    }
    return orders;
  }, [orders, currentUser]);

  // Handle Photo Upload
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

  // Submit Order Checkout
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCartItems.length === 0) return;
    setIsSubmitting(true);

    const downPaymentAmount = 100;
    const remainingBalance =
      paymentType === 'down_payment' ? Math.max(0, selectedCartTotal - 100) : 0;

    try {
      const created = await createOrder({
        customerName: customerName.trim() || 'Online Customer',
        contactNumber: contactNumber.trim() || 'N/A',
        email: email.trim() || currentUser.email || 'customer@exins.shop',
        address: address.trim() || 'Store Pickup / Standard Delivery',
        items: selectedCartItems.map((item) => ({
          productId: item.productId,
          name: item.name,
          size: item.size,
          price: item.price,
          costPrice: item.costPrice,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
          baleCode: item.baleCode,
        })),
        totalAmount: selectedCartTotal,
        paymentType,
        downPaymentAmount: paymentType === 'down_payment' ? downPaymentAmount : 0,
        remainingBalance,
        receiptUrl: receiptPhoto || undefined,
        courier,
        shippingNote: 'Customer shoulders shipping fee directly upon courier delivery.',
        orderSource: 'online',
        paymentMethod: 'gcash',
      });

      // Remove only the checked out items from cart
      clearSelectedCart();
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setReceiptOrder(created);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Toast Notification for Stock Alert */}
      {cartNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl bg-amber-950/95 border border-orange-500/50 shadow-2xl text-stone-100 max-w-sm backdrop-blur-xl animate-bounce">
          <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
          <p className="text-xs font-medium flex-1">{cartNotification}</p>
          <button
            onClick={clearCartNotification}
            className="text-stone-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Online Showcase Store Header */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-widest uppercase">
              Curated Thrift & Fashion Showcase
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              EXINS Jksur+ Novaliches Quezon City
            </h1>
            <p className="text-lg sm:text-xl font-medium text-amber-300 italic">
              “Your Next Favorite Outfit is Hiding Here.”
            </p>

            {/* Store Contact details */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300 pt-2">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                Jksur+ Novaliches, Quezon City, Metro Manila
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-orange-400" />
                +63 912 345 6789
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-orange-400" />
                exins.novaliches@gmail.com
              </span>
            </div>
          </div>

          {/* Action Buttons based on User Role */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {currentUser.role === 'owner' ? (
              <>
                <button
                  onClick={() => setActiveMode('browse')}
                  className={`px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer ${
                    activeMode === 'browse'
                      ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-orange-600/30'
                      : 'bg-stone-900/80 text-stone-300 hover:text-white border border-orange-500/20'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Browse Clothing</span>
                </button>
                <button
                  onClick={() => setActiveMode('orders')}
                  className={`px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer ${
                    activeMode === 'orders'
                      ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-orange-600/30'
                      : 'bg-stone-900/80 text-stone-300 hover:text-white border border-orange-500/20'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>New Orders ({orders.length})</span>
                </button>
              </>
            ) : isGuest ? (
              <>
                <button
                  onClick={() => setActiveMode('browse')}
                  className={`px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer ${
                    activeMode === 'browse'
                      ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-orange-600/30'
                      : 'bg-stone-900/80 text-stone-300 hover:text-white border border-orange-500/20'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Browse Clothing</span>
                </button>
                <button
                  onClick={onOpenAuth}
                  className="px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white shadow-orange-600/30"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In / Sign Up</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveMode('browse')}
                  className={`px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer ${
                    activeMode === 'browse'
                      ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-orange-600/30'
                      : 'bg-stone-900/80 text-stone-300 hover:text-white border border-orange-500/20'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Browse Clothing</span>
                </button>
                <button
                  onClick={() => setActiveMode('orders')}
                  className={`px-5 py-3 rounded-2xl font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer ${
                    activeMode === 'orders'
                      ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-orange-600/30'
                      : 'bg-stone-900/80 text-stone-300 hover:text-white border border-orange-500/20'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>My Orders ({displayOrders.length})</span>
                </button>
              </>
            )}

            {/* Quick Bag Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="p-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="hidden sm:inline">Bag</span>
              {cart.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-stone-950 text-orange-400 text-xs font-mono">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {activeMode === 'browse' ? (
        <>
          {/* Guest Browsing Friendly Notification Banner */}
          {isGuest && (
            <div className="p-4 sm:p-5 rounded-2xl glass-panel border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Browsing as Guest</h4>
                  <p className="text-stone-300 text-xs">
                    You can browse all outfits, sizes, prices, and links freely. To add items to your shopping bag and make a purchase, please sign in or create an account.
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md transition cursor-pointer whitespace-nowrap"
              >
                Sign In / Sign Up
              </button>
            </div>
          )}

          {/* Search Bar & Category Filters */}
          <div className="p-4 sm:p-5 rounded-2xl glass-panel space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Find an item (e.g. Vintage Leather Jacket, Cargo Pants, Nike Shoes)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-stone-950/70 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700"
                >
                  Clear Search
                </button>
              )}
            </div>

            {/* Category Filter Pills (Shoes, Jackets, Caps, etc.) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-stone-400 font-semibold flex items-center gap-1 shrink-0 pr-1">
                <Filter className="w-3.5 h-3.5 text-orange-400" />
                Categories:
              </span>
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-full font-medium transition shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-stone-900/80 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                All Items
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3.5 py-1.5 rounded-full font-medium transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.name.toLowerCase()
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-stone-900/80 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color || '#ea580c' }}
                  />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl glass-panel space-y-3">
              <div className="w-16 h-16 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">No Products Available</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                {products.length === 0
                  ? 'No products have been listed in the inventory yet. As the owner or staff, head to "Inventory Management" -> "Product List" to list new items!'
                  : 'No products match your current search and category filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.availableQuantity <= 0;
                return (
                  <div
                    key={product.id}
                    className="group rounded-3xl glass-panel glass-panel-hover overflow-hidden flex flex-col border border-orange-500/20"
                  >
                    {/* Image Area with Size Badge */}
                    <div className="relative aspect-[4/3] w-full bg-stone-950 overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-600 bg-stone-900">
                          <ShoppingBag className="w-10 h-10 mb-2 opacity-50" />
                          <span className="text-xs">EXINS Fashion</span>
                        </div>
                      )}

                      {/* Size Badge */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-stone-950/80 backdrop-blur-md border border-orange-500/30 text-orange-400 text-xs font-bold font-mono">
                        Size: {product.size || 'Free Size'}
                      </div>

                      {/* Stock Status Badge */}
                      <div className="absolute top-3 right-3">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-950/90 text-rose-300 text-xs font-bold border border-rose-500/30">
                            Sold Out
                          </span>
                        ) : product.availableQuantity <= 3 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-950/90 text-amber-300 text-xs font-bold border border-amber-500/30 animate-pulse">
                            Only {product.availableQuantity} Left!
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                            {product.availableQuantity} in stock
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                            {product.category || 'Apparel'}
                          </span>
                          {product.productLink && (
                            <a
                              href={product.productLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stone-400 hover:text-orange-400 text-xs flex items-center gap-1 transition"
                              title="Visit Link in new tab"
                            >
                              <span>Visit Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-orange-300 transition">
                          {product.name}
                        </h3>

                        <p className="text-xs text-stone-400 line-clamp-2">
                          {product.description || 'Exclusive premium apparel from EXINS Jksur+ Novaliches store.'}
                        </p>
                      </div>

                      {/* Price and Add to Bag */}
                      <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] text-stone-400 uppercase font-mono">Price</p>
                          <p className="text-lg font-black text-orange-400 font-mono">
                            ₱{product.sellingPrice.toLocaleString()}
                          </p>
                        </div>

                        <button
                          onClick={() => addToCart(product, 1)}
                          disabled={isOutOfStock}
                          className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                            isOutOfStock
                              ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white shadow-md shadow-orange-600/20'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Add to Bag</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Orders View (Customer or Owner / Staff) */
        <div className="p-6 rounded-3xl glass-panel space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-orange-500/20">
            <div>
              <h2 className="text-xl font-bold text-white">
                {currentUser.role === 'customer' ? 'My Order History' : 'All Customer Orders Management'}
              </h2>
              <p className="text-xs text-stone-400">
                Track status: Pending → Preparing the order → Drop to courier → Completed
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono">
              {displayOrders.length} Orders
            </span>
          </div>

          {displayOrders.length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto opacity-40 text-orange-400" />
              <p className="text-sm">No orders found.</p>
              <p className="text-xs">Browse the clothing showcase and add items to your bag to place an order.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayOrders.map((ord) => {
                const canCancel = currentUser.role === 'customer' && ord.status === 'pending';
                const isOwnerOrStaff = currentUser.role === 'owner' || currentUser.role === 'staff';

                return (
                  <div
                    key={ord.id}
                    className="p-5 rounded-2xl bg-stone-950/60 border border-orange-500/20 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-orange-400 text-sm">{ord.orderNumber}</span>
                          <span className="text-xs text-stone-400">• {new Date(ord.createdAt).toLocaleDateString()}</span>
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded font-mono bg-stone-800 text-stone-300">
                            {ord.orderSource}
                          </span>
                        </div>
                        <p className="text-xs text-stone-300 mt-0.5">
                          Customer: <span className="font-semibold text-white">{ord.customerName}</span> ({ord.contactNumber})
                        </p>
                        <p className="text-xs text-stone-400">Address: {ord.address}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={`text-xs uppercase font-bold px-3 py-1 rounded-full border ${
                            ord.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : ord.status === 'preparing'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : ord.status === 'dropped_to_courier'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : ord.status === 'cancelled'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                          }`}
                        >
                          {ord.status.replace(/_/g, ' ')}
                        </span>

                        {/* Print Receipt button */}
                        <button
                          onClick={() => setReceiptOrder(ord)}
                          className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Items in order */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-900/60 text-xs">
                          {it.imageUrl ? (
                            <img src={it.imageUrl} alt={it.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center text-[10px]">
                              Apparel
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-semibold text-white truncate">{it.name}</p>
                            <p className="text-[11px] text-stone-400">
                              Size {it.size} • x{it.quantity} • ₱{it.price.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Financial details & courier note */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-800 text-xs">
                      <div className="space-y-0.5">
                        <p className="text-stone-300">
                          Total: <span className="font-bold text-white">₱{ord.totalAmount.toLocaleString()}</span>
                          {ord.paymentType === 'down_payment' && (
                            <span className="text-amber-400 ml-2">
                              (Down Payment: ₱100 | Bal: ₱{ord.remainingBalance.toLocaleString()})
                            </span>
                          )}
                        </p>
                        {ord.courier && (
                          <p className="text-stone-400 text-[11px]">
                            Courier: <span className="uppercase text-orange-400 font-semibold">{ord.courier}</span> (Customer will pay shipping directly upon delivery)
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {canCancel && (
                          <button
                            onClick={() => cancelOrder(ord.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/30 text-rose-300 hover:bg-rose-900 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Order</span>
                          </button>
                        )}

                        {/* Owner / Staff status switcher */}
                        {isOwnerOrStaff && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-stone-400">Change Status:</span>
                            <select
                              value={ord.status}
                              onChange={(e) => updateOrderStatus(ord.id, e.target.value as any)}
                              className="px-2 py-1 rounded-lg bg-stone-900 border border-orange-500/30 text-xs text-orange-400 font-medium focus:outline-none"
                            >
                              <option value="pending">Pending</option>
                              <option value="preparing">Preparing the order</option>
                              <option value="dropped_to_courier">Drop to the courier</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Cart / Bag Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-stone-900/95 border-l border-orange-500/30 p-6 flex flex-col h-full shadow-2xl backdrop-blur-2xl text-stone-100">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-4 border-b border-orange-500/20">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">Your Shopping Bag</h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Select All Checkbox */}
            {cart.length > 0 && (
              <div className="py-2.5 px-3 bg-stone-950/60 rounded-xl my-3 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => toggleSelectAllCart(!allCartSelected)}
                  className="flex items-center gap-2 text-stone-300 hover:text-white cursor-pointer font-medium"
                >
                  {allCartSelected ? (
                    <CheckSquare className="w-4 h-4 text-orange-400" />
                  ) : (
                    <Square className="w-4 h-4 text-stone-500" />
                  )}
                  <span>Select All ({cart.length})</span>
                </button>
                <span className="text-[11px] text-stone-400">
                  {selectedCartItems.length} selected for checkout
                </span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-stone-400 space-y-3">
                  <ShoppingBag className="w-12 h-12 mx-auto text-stone-600" />
                  <p className="text-sm font-medium">Your bag is currently empty.</p>
                  <p className="text-xs">Browse the apparel collection and pick your favorite pieces.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className={`p-3 rounded-2xl border transition flex items-center gap-3 ${
                      item.selected
                        ? 'bg-stone-950/80 border-orange-500/40 shadow-sm'
                        : 'bg-stone-950/40 border-stone-800 opacity-60'
                    }`}
                  >
                    {/* Item Select Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleCartItemSelect(item.productId)}
                      className="cursor-pointer text-orange-400"
                    >
                      {item.selected ? (
                        <CheckSquare className="w-4 h-4 text-orange-400" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-600" />
                      )}
                    </button>

                    {/* Image */}
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover bg-stone-900 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-stone-800 flex items-center justify-center text-xs text-stone-500 shrink-0">
                        Item
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{item.name}</p>
                      <p className="text-[11px] text-stone-400">Size: {item.size}</p>
                      <p className="text-xs font-mono font-bold text-orange-400">
                        ₱{item.price.toLocaleString()}
                      </p>

                      {/* Quantity Controls (- or +) with max check */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-200 transition"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold font-mono px-1">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-200 transition"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] text-stone-500 ml-1">
                          (Max: {item.maxStock})
                        </span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="p-2 rounded-xl text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Remove from bag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer & Checkout Button */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-orange-500/20 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-stone-400">
                    Selected Total ({selectedCartItems.length} items):
                  </span>
                  <span className="text-lg font-black text-orange-400 font-mono">
                    ₱{selectedCartTotal.toLocaleString()}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={selectedCartItems.length === 0}
                  onClick={() => setIsCheckoutOpen(true)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                    selectedCartItems.length === 0
                      ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white shadow-orange-600/30'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Proceed to Checkout ({selectedCartItems.length})</span>
                </button>
                <p className="text-[11px] text-stone-400 text-center">
                  Unselected items will remain safely stored in your bag.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl bg-stone-900 border border-orange-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-stone-100 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-white"
            >
              ✕
            </button>

            <div className="space-y-1 mb-5">
              <h2 className="text-2xl font-black text-white">Order Checkout</h2>
              <p className="text-xs text-stone-400">
                EXINS Jksur+ Novaliches Quezon City — Fill in details to confirm delivery
              </p>
            </div>

            {/* Selected Items Summary */}
            <div className="p-3.5 bg-stone-950/70 rounded-2xl border border-stone-800 mb-5 space-y-2 text-xs">
              <p className="font-semibold text-stone-300">
                Items to be checked out ({selectedCartItems.length}):
              </p>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                {selectedCartItems.map((item) => (
                  <div key={item.productId} className="flex justify-between text-stone-300">
                    <span className="truncate pr-2">
                      {item.name} (Size: {item.size}) x{item.quantity}
                    </span>
                    <span className="font-mono text-orange-400 font-medium">
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-800 font-bold text-sm">
                <span>Total Amount:</span>
                <span className="text-orange-400">₱{selectedCartTotal.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmOrder} className="space-y-4">
              {/* Customer Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan Dela Cruz"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Contact Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 6789"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="juan@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Select Courier *</label>
                  <select
                    value={courier}
                    onChange={(e) => setCourier(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 text-xs focus:border-orange-500 focus:outline-none uppercase font-semibold"
                  >
                    <option value="jnt">J&T Express</option>
                    <option value="lalamove">Lalamove</option>
                    <option value="lbc">LBC Express</option>
                  </select>
                </div>
              </div>

              {/* Complete Delivery Address */}
              <div className="text-xs">
                <label className="block font-medium text-stone-300 mb-1">Complete Delivery Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="House/Unit No., Street, Barangay, City, Postal Code"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Payment Type Selection: Pay Now vs Down Payment */}
              <div className="p-4 rounded-2xl bg-stone-950/70 border border-orange-500/30 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-orange-400">
                  Payment Option
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentType('pay_now')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      paymentType === 'pay_now'
                        ? 'bg-orange-600/20 border-orange-500 text-white'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <p className="text-xs font-bold">Pay Now (Full)</p>
                    <p className="text-sm font-black text-orange-400 mt-1">
                      ₱{selectedCartTotal.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-stone-400">Total amount to be paid</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentType('down_payment')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      paymentType === 'down_payment'
                        ? 'bg-orange-600/20 border-orange-500 text-white'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <p className="text-xs font-bold">Down Payment</p>
                    <p className="text-sm font-black text-emerald-400 mt-1">₱100.00 First</p>
                    <p className="text-[10px] text-stone-400">
                      Remaining Bal: ₱{Math.max(0, selectedCartTotal - 100).toLocaleString()}
                    </p>
                  </button>
                </div>

                {/* Upload Photo for Receipt */}
                <div className="pt-2">
                  <label className="block text-xs font-medium text-stone-300 mb-1.5 flex items-center justify-between">
                    <span>Upload Payment Proof / GCash Receipt Photo:</span>
                    <span className="text-[10px] text-stone-500">(Optional / Recommended)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-orange-500/40 hover:border-orange-500 bg-stone-900 text-xs text-stone-300 cursor-pointer transition">
                      <Upload className="w-4 h-4 text-orange-400" />
                      <span>{receiptPhoto ? 'Change Photo' : 'Select Photo'}</span>
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
              </div>

              {/* Shipping Note (Strict Requirement) */}
              <div className="p-3 rounded-xl bg-amber-950/40 border border-orange-500/30 text-xs text-amber-200/90 flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Courier Shipping Note:</strong> The customer will be the one to pay the shipping fee directly to the courier ({courier.toUpperCase()}) upon arrival/delivery.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Confirming Order...' : 'Confirm Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}
    </div>
  );
};
