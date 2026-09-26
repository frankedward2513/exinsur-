import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Bale, Category, Product, Supplier } from '../types';
import {
  Boxes,
  Layers,
  ShoppingBag,
  Truck,
  Search,
  Edit2,
  Trash2,
  Upload,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const InventoryManagementView: React.FC = () => {
  const {
    bales,
    categories,
    products,
    suppliers,
    addBale,
    updateBale,
    deleteBale,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    updateProduct,
    deleteProduct,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useStore();

  // 4 Tabs arranged: Bale Suppliers, Product Categories, Bale Management, Product List
  const [activeTab, setActiveTab] = useState<'suppliers' | 'categories' | 'bales' | 'products'>('suppliers');

  // ===================== 1. BALE MANAGEMENT STATE =====================
  const generateBaleCode = () => `BALE-${Math.floor(1000 + Math.random() * 9000)}`;
  const [baleCode, setBaleCode] = useState(generateBaleCode());
  const [baleName, setBaleName] = useState('');
  const [baleCategory, setBaleCategory] = useState('');
  const [baleSupplierId, setBaleSupplierId] = useState('');
  const [balePrice, setBalePrice] = useState<number | ''>('');
  const [baleQuantity, setBaleQuantity] = useState<number | ''>('');
  const [baleDesc, setBaleDesc] = useState('');
  const [editingBaleId, setEditingBaleId] = useState<string | null>(null);

  // Auto-calculated price per piece
  const calculatedPricePerPiece = useMemo(() => {
    if (balePrice && baleQuantity && Number(baleQuantity) > 0) {
      return Number(balePrice) / Number(baleQuantity);
    }
    return 0;
  }, [balePrice, baleQuantity]);

  const handleSaveBale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baleName || !balePrice || !baleQuantity) return;

    const suppObj = suppliers.find((s) => s.id === baleSupplierId);
    const supplierName = suppObj ? suppObj.name : 'Direct Import';

    if (editingBaleId) {
      await updateBale(editingBaleId, {
        baleCode,
        baleName,
        category: baleCategory || 'General Apparel',
        supplierId: baleSupplierId,
        supplierName,
        totalPurchasePrice: Number(balePrice),
        quantityPurchase: Number(baleQuantity),
        pricePerPiece: calculatedPricePerPiece,
        description: baleDesc,
      });
      setEditingBaleId(null);
    } else {
      await addBale({
        baleCode,
        baleName,
        category: baleCategory || 'General Apparel',
        supplierId: baleSupplierId,
        supplierName,
        totalPurchasePrice: Number(balePrice),
        quantityPurchase: Number(baleQuantity),
        pricePerPiece: calculatedPricePerPiece,
        description: baleDesc,
        status: 'sealed',
      });
    }

    // Reset Form
    setBaleCode(generateBaleCode());
    setBaleName('');
    setBaleCategory('');
    setBaleSupplierId('');
    setBalePrice('');
    setBaleQuantity('');
    setBaleDesc('');
  };

  const startEditBale = (b: Bale) => {
    setEditingBaleId(b.id);
    setBaleCode(b.baleCode);
    setBaleName(b.baleName);
    setBaleCategory(b.category);
    setBaleSupplierId(b.supplierId);
    setBalePrice(b.totalPurchasePrice);
    setBaleQuantity(b.quantityPurchase);
    setBaleDesc(b.description || '');
    setActiveTab('bales');
  };

  // Helper to load standard ukay categories if none exist yet
  const handleLoadStandardCategories = async () => {
    const defaults = [
      { name: 'Jackets', desc: 'Denim, leather, windbreakers, varsity jackets', color: '#ea580c' },
      { name: 'Shoes', desc: 'Sneakers, boots, loafers, leather shoes', color: '#f59e0b' },
      { name: 'Caps', desc: 'Snapbacks, vintage caps, beanies, bucket hats', color: '#10b981' },
      { name: 'Hoodies', desc: 'Vintage pullovers, zip-up hoodies, sweaters', color: '#3b82f6' },
      { name: 'Pants', desc: 'Cargo pants, chinos, denim jeans, trousers', color: '#8b5cf6' },
    ];
    for (const d of defaults) {
      await addCategory({ name: d.name, description: d.desc, color: d.color });
    }
    setBaleCategory('Jackets');
  };

  // ===================== 2. CATEGORY MANAGEMENT STATE =====================
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [categoryColor, setCategoryColor] = useState('#f97316');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;

    if (editingCategoryId) {
      await updateCategory(editingCategoryId, {
        name: categoryName.trim(),
        description: categoryDesc.trim(),
        color: categoryColor,
      });
      setEditingCategoryId(null);
    } else {
      await addCategory({
        name: categoryName.trim(),
        description: categoryDesc.trim(),
        color: categoryColor,
      });
    }

    setCategoryName('');
    setCategoryDesc('');
    setCategoryColor('#f97316');
  };

  const startEditCategory = (c: Category) => {
    setEditingCategoryId(c.id);
    setCategoryName(c.name);
    setCategoryDesc(c.description || '');
    setCategoryColor(c.color || '#f97316');
    setActiveTab('categories');
  };

  // ===================== 3. PRODUCT LIST STATE =====================
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productBaleCode, setProductBaleCode] = useState('');
  const [productQty, setProductQty] = useState<number | ''>('');
  const [productSellingPrice, setProductSellingPrice] = useState<number | ''>('');
  const [productCostPrice, setProductCostPrice] = useState<number | ''>('');
  const [productSize, setProductSize] = useState('M');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [productLink, setProductLink] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  // Handle Bale selection to automatically fill cost price
  const handleSelectProductBale = (selectedCode: string) => {
    setProductBaleCode(selectedCode);
    const targetBale = bales.find((b) => b.baleCode === selectedCode);
    if (targetBale && targetBale.pricePerPiece) {
      setProductCostPrice(Math.round(targetBale.pricePerPiece));
    }
  };

  // Handle image upload
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productSellingPrice || !productQty) return;

    const matchedBale = bales.find((b) => b.baleCode === productBaleCode);
    const baleName = matchedBale ? matchedBale.baleName : 'Direct Stock';
    const autoBarcode = `EX-${Math.floor(100000 + Math.random() * 900000)}`;

    if (editingProductId) {
      await updateProduct(editingProductId, {
        name: productName,
        category: productCategory || 'Apparel',
        baleCode: productBaleCode,
        baleName,
        availableQuantity: Number(productQty),
        sellingPrice: Number(productSellingPrice),
        costPrice: Number(productCostPrice) || 0,
        size: productSize || 'Free Size',
        imageUrl: productImageUrl,
        productLink,
        description: productDesc,
      });
      setEditingProductId(null);
    } else {
      await addProduct({
        name: productName,
        category: productCategory || 'Apparel',
        baleCode: productBaleCode,
        baleName,
        availableQuantity: Number(productQty),
        sellingPrice: Number(productSellingPrice),
        costPrice: Number(productCostPrice) || 0,
        size: productSize || 'Free Size',
        imageUrl: productImageUrl,
        productLink,
        description: productDesc,
        barcode: autoBarcode,
        barcodeStatus: 'new',
      });
    }

    // Reset Form
    setProductName('');
    setProductCategory('');
    setProductBaleCode('');
    setProductQty('');
    setProductSellingPrice('');
    setProductCostPrice('');
    setProductSize('M');
    setProductImageUrl('');
    setProductLink('');
    setProductDesc('');
  };

  const startEditProduct = (p: Product) => {
    setEditingProductId(p.id);
    setProductName(p.name);
    setProductCategory(p.category);
    setProductBaleCode(p.baleCode || '');
    setProductQty(p.availableQuantity);
    setProductSellingPrice(p.sellingPrice);
    setProductCostPrice(p.costPrice || 0);
    setProductSize(p.size || 'M');
    setProductImageUrl(p.imageUrl || '');
    setProductLink(p.productLink || '');
    setProductDesc(p.description || '');
    setActiveTab('products');
  };

  const filteredProductsList = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.baleCode && p.baleCode.toLowerCase().includes(q)) ||
        p.barcode.toLowerCase().includes(q)
      );
    });
  }, [products, productSearch]);

  // ===================== 4. BALE SUPPLIERS STATE =====================
  const [supplierName, setSupplierName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierDesc, setSupplierDesc] = useState('');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName) return;

    if (editingSupplierId) {
      await updateSupplier(editingSupplierId, {
        name: supplierName,
        contactPerson,
        email: supplierEmail,
        phone: supplierPhone,
        address: supplierAddress,
        description: supplierDesc,
      });
      setEditingSupplierId(null);
    } else {
      await addSupplier({
        name: supplierName,
        contactPerson,
        email: supplierEmail,
        phone: supplierPhone,
        address: supplierAddress,
        description: supplierDesc,
      });
    }

    setSupplierName('');
    setContactPerson('');
    setSupplierEmail('');
    setSupplierPhone('');
    setSupplierAddress('');
    setSupplierDesc('');
  };

  const startEditSupplier = (s: Supplier) => {
    setEditingSupplierId(s.id);
    setSupplierName(s.name);
    setContactPerson(s.contactPerson || '');
    setSupplierEmail(s.email || '');
    setSupplierPhone(s.phone || '');
    setSupplierAddress(s.address || '');
    setSupplierDesc(s.description || '');
    setActiveTab('suppliers');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 4 Inventory Navigation Buttons - Arranged in requested order: Bale Suppliers, Product Categories, Bale Management, Product List */}
      <div className="p-2 sm:p-2.5 rounded-2xl glass-panel grid grid-cols-2 lg:flex lg:flex-wrap items-center gap-2">
        {/* Button 1: Bale Suppliers */}
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer lg:flex-1 ${
            activeTab === 'suppliers'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <Truck className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="truncate">Bale Suppliers</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono shrink-0">
            {suppliers.length}
          </span>
        </button>

        {/* Button 2: Product Categories */}
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer lg:flex-1 ${
            activeTab === 'categories'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <Layers className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="truncate">Product Categories</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono shrink-0">
            {categories.length}
          </span>
        </button>

        {/* Button 3: Bale Management (Position Swapped as Requested) */}
        <button
          onClick={() => setActiveTab('bales')}
          className={`py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer lg:flex-1 ${
            activeTab === 'bales'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <Boxes className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="truncate">Bale Management</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono shrink-0">
            {bales.length}
          </span>
        </button>

        {/* Button 4: Product List (Position Swapped as Requested) */}
        <button
          onClick={() => setActiveTab('products')}
          className={`py-2.5 sm:py-3 px-2.5 sm:px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition cursor-pointer lg:flex-1 ${
            activeTab === 'products'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-orange-400 shrink-0" />
          <span className="truncate">Product List</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono shrink-0">
            {products.length}
          </span>
        </button>
      </div>

      {/* ===================== TAB 1: BALE SUPPLIERS ===================== */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Supplier Registration Form */}
          <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-400" />
                <span>{editingSupplierId ? 'Edit Supplier Details' : 'Register Bale Supplier'}</span>
              </h2>
              {editingSupplierId && (
                <button
                  onClick={() => setEditingSupplierId(null)}
                  className="text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Supplier / Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Bales Trading"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Robert Tan"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="supplier@apexbales.com"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Contact Number</label>
                  <input
                    type="tel"
                    placeholder="+63 917 888 9999"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-stone-300 mb-1">Supplier Address</label>
                  <input
                    type="text"
                    placeholder="Warehouse 4B, Valenzuela City, Metro Manila"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-medium text-stone-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes on supplier payment terms, reliability, delivery speed..."
                  value={supplierDesc}
                  onChange={(e) => setSupplierDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none text-sm sm:text-xs transition-all duration-200"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
              >
                {editingSupplierId ? 'Update Supplier' : 'Register Supplier'}
              </button>
            </form>
          </div>

          {/* Supplier Cards Display (Mobile-optimized responsive grid) */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">Registered Bale Suppliers</h3>
            {suppliers.length === 0 ? (
              <div className="p-8 text-center rounded-3xl glass-panel text-xs text-stone-400">
                No bale suppliers registered yet. Register your suppliers above to track sourcing volumes!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {suppliers.map((s) => (
                  <div
                    key={s.id}
                    className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between border border-orange-500/20 space-y-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-bold text-white group-hover:text-orange-300 transition">
                            {s.name}
                          </h4>
                          <p className="text-xs text-orange-400 font-medium">{s.contactPerson || 'No contact person'}</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditSupplier(s)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteSupplier(s.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-stone-400">
                        {s.email && <p>Email: {s.email}</p>}
                        {s.phone && <p>Phone: {s.phone}</p>}
                        {s.address && <p>Address: {s.address}</p>}
                        {s.description && (
                          <p className="text-[11px] text-stone-500 italic mt-1">{s.description}</p>
                        )}
                      </div>
                    </div>

                    {/* KPI badge: Total Bales Sourced */}
                    <div className="p-3 rounded-xl bg-stone-950/70 border border-orange-500/30 flex items-center justify-between text-xs">
                      <span className="text-stone-300 font-medium">Total Bales Sourced:</span>
                      <span className="font-bold text-orange-400 font-mono text-sm">
                        {s.totalBalesSourced || 0} bales
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: PRODUCT CATEGORIES ===================== */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Category Form */}
          <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-400" />
                <span>{editingCategoryId ? 'Edit Category' : 'Add Product Category'}</span>
              </h2>
              {editingCategoryId && (
                <button
                  onClick={() => setEditingCategoryId(null)}
                  className="text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Category Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vintage Leather Jackets, Shoes, Caps"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Heavyweight genuine leather, winter jackets"
                    value={categoryDesc}
                    onChange={(e) => setCategoryDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Category Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={categoryColor}
                      onChange={(e) => setCategoryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full border border-white/20 shadow"
                        style={{ backgroundColor: categoryColor }}
                      />
                      <span className="font-mono text-xs text-stone-300">{categoryColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
                >
                  {editingCategoryId ? 'Update Category' : 'Add Category'}
                </button>

                {categories.length === 0 && (
                  <button
                    type="button"
                    onClick={handleLoadStandardCategories}
                    className="w-full sm:w-auto py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-orange-500/30 text-orange-400 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span>⚡ Quick-Add Default Categories (Jackets, Shoes, Caps, Hoodies, Pants)</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Categories Grid (Mobile-friendly responsive cards) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Registered Categories</h3>
              <span className="text-xs text-stone-400">{categories.length} total categories</span>
            </div>

            {categories.length === 0 ? (
              <div className="p-8 text-center rounded-3xl glass-panel text-xs text-stone-400 space-y-3">
                <p>No product categories added yet.</p>
                <button
                  type="button"
                  onClick={handleLoadStandardCategories}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow transition cursor-pointer"
                >
                  ⚡ Load Standard Categories
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between border border-orange-500/20 space-y-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-7 h-7 rounded-full shadow-md shrink-0 border border-white/20 flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: cat.color || '#ea580c' }}
                          >
                            •
                          </span>
                          <div>
                            <h4 className="text-base font-bold text-white group-hover:text-orange-300 transition">
                              {cat.name}
                            </h4>
                            <p className="text-xs text-stone-400 line-clamp-2">
                              {cat.description || 'Thrift category'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => startEditCategory(cat)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteCategory(cat.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-stone-950/70 border border-orange-500/30 flex items-center justify-between text-xs">
                      <span className="text-stone-400">Total In Stock:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {cat.totalInStock || 0} items
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: BALE MANAGEMENT (Swapped to position 3) ===================== */}
      {activeTab === 'bales' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-orange-400" />
                <span>{editingBaleId ? 'Edit Bale Record' : 'Enter New Bale Record'}</span>
              </h2>
              {editingBaleId && (
                <button
                  type="button"
                  onClick={() => setEditingBaleId(null)}
                  className="text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveBale} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Bale Name */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Bale Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vintage Leather Jackets Grade A"
                    value={baleName}
                    onChange={(e) => setBaleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                {/* Bale Code (Auto-generated) */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1 flex items-center justify-between">
                    <span>Bale Code (Auto-Generated)</span>
                    <button
                      type="button"
                      onClick={() => setBaleCode(generateBaleCode())}
                      className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={baleCode}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/60 border border-orange-500/30 text-orange-400 font-mono font-bold text-sm sm:text-xs"
                  />
                </div>

                {/* Product Category - Direct Selection from Product Categories */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-stone-300">Product Category</label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('categories')}
                      className="text-[10px] text-orange-400 hover:text-orange-300 underline cursor-pointer"
                    >
                      Manage ({categories.length})
                    </button>
                  </div>

                  <select
                    value={baleCategory}
                    onChange={(e) => setBaleCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200 cursor-pointer hover:border-orange-500/50"
                  >
                    <option value="">-- Select Product Category ({categories.length} available) --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {baleCategory && !categories.some((c) => c.name.toLowerCase() === baleCategory.toLowerCase()) && (
                      <option value={baleCategory}>{baleCategory}</option>
                    )}
                  </select>

                  {categories.length === 0 && (
                    <div className="mt-2 p-2 rounded-xl bg-orange-950/40 border border-orange-500/30 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-stone-300">No categories added yet.</span>
                      <button
                        type="button"
                        onClick={handleLoadStandardCategories}
                        className="px-2 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[10px] whitespace-nowrap cursor-pointer transition"
                      >
                        ⚡ Load Categories
                      </button>
                    </div>
                  )}
                </div>

                {/* Select Supplier */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-stone-300">Select Supplier</label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('suppliers')}
                      className="text-[10px] text-orange-400 hover:text-orange-300 underline cursor-pointer"
                    >
                      Suppliers ({suppliers.length})
                    </button>
                  </div>
                  <select
                    value={baleSupplierId}
                    onChange={(e) => setBaleSupplierId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200 cursor-pointer hover:border-orange-500/50"
                  >
                    <option value="">Direct Import / Unassigned</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contactPerson || 'Supplier'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Total Bale Purchase Price */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Total Bale Purchase Price (₱) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="12000"
                    value={balePrice}
                    onChange={(e) =>
                      setBalePrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                {/* Quantity Purchase */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Quantity Purchase (pcs) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="100"
                    value={baleQuantity}
                    onChange={(e) =>
                      setBaleQuantity(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                {/* Calculated Price per Piece */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">
                    Auto-Calculated Price / Piece
                  </label>
                  <div className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/30 text-amber-400 font-mono font-bold text-sm sm:text-xs flex items-center justify-between">
                    <span>₱{calculatedPricePerPiece.toFixed(2)}</span>
                    <span className="text-[10px] text-stone-400 font-sans font-normal">/ piece</span>
                  </div>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block font-medium text-stone-300 mb-1">Bale Description</label>
                  <input
                    type="text"
                    placeholder="Grade quality, tags, bundle details, batch origin..."
                    value={baleDesc}
                    onChange={(e) => setBaleDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
              >
                {editingBaleId ? 'Update Bale Record' : 'Save Bale Record'}
              </button>
            </form>
          </div>

          {/* Database Table Below */}
          <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h3 className="text-base font-bold text-white">Bales Inventory & Break-Even Database</h3>
              <span className="text-xs text-stone-400">{bales.length} total bales</span>
            </div>

            {bales.length === 0 ? (
              <p className="text-center py-8 text-xs text-stone-400">
                No bales entered yet. Use the form above to add your first bale without any limits!
              </p>
            ) : (
              <>
                {/* Mobile Cards for Bales (Visible on phones & small screens) */}
                <div className="block md:hidden space-y-3">
                  {bales.map((b) => {
                    const totalCost = b.totalPurchasePrice || 1;
                    const sales = b.totalSalesMade || 0;
                    const progressPct = Math.min(100, Math.round((sales / totalCost) * 100));
                    const isBreakEven = sales >= totalCost;
                    const diff = Math.abs(sales - totalCost);

                    return (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl bg-stone-950/70 border border-orange-500/20 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-orange-400 font-mono text-sm block">
                              {b.baleCode}
                            </span>
                            <h4 className="font-bold text-white text-sm">{b.baleName}</h4>
                            <p className="text-[11px] text-stone-400">
                              {b.category} • <span className="text-orange-400">{b.supplierName}</span>
                            </p>
                          </div>

                          <select
                            value={b.status}
                            onChange={(e) => updateBale(b.id, { status: e.target.value as any })}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border uppercase focus:outline-none cursor-pointer shrink-0 ${
                              b.status === 'sealed'
                                ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                                : b.status === 'opened'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                : 'bg-stone-800 text-stone-400 border-stone-700'
                            }`}
                          >
                            <option value="sealed">Sealed</option>
                            <option value="opened">Opened</option>
                            <option value="depleted">Depleted</option>
                          </select>
                        </div>

                        {/* Financial Metrics */}
                        <div className="grid grid-cols-3 gap-2 text-xs py-1 border-t border-stone-800">
                          <div>
                            <span className="text-[10px] text-stone-400 block">Pieces</span>
                            <span className="font-bold text-white font-mono">{b.quantityPurchase} pcs</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">Total Price</span>
                            <span className="font-bold text-stone-200 font-mono">
                              ₱{b.totalPurchasePrice.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">Price / Pc</span>
                            <span className="font-bold text-amber-400 font-mono">
                              ₱{b.pricePerPiece.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Break-Even Progress */}
                        <div className="space-y-1.5 pt-1 border-t border-stone-800">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-stone-400 text-[11px]">Sales Made: ₱{sales.toLocaleString()}</span>
                            {isBreakEven ? (
                              <span className="text-emerald-400 font-bold text-[11px] font-mono">
                                +{diff > 0 ? `₱${diff.toLocaleString()} Profit` : 'Breakeven!'}
                              </span>
                            ) : (
                              <span className="text-amber-400 font-medium text-[11px] font-mono">
                                Need: ₱{diff.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isBreakEven
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                  : 'bg-gradient-to-r from-orange-500 to-amber-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                          <button
                            onClick={() => startEditBale(b)}
                            className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition hover:bg-stone-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => deleteBale(b.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-950/60 text-red-300 text-xs font-semibold flex items-center gap-1 border border-red-500/30 cursor-pointer transition hover:bg-red-900"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Full Table View (Visible on md and larger) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-orange-500/20 text-stone-400 uppercase text-[11px]">
                        <th className="py-3 px-3">Bale Code & Name</th>
                        <th className="py-3 px-3">Category & Supplier</th>
                        <th className="py-3 px-3 text-center">Pieces</th>
                        <th className="py-3 px-3 text-right">Total Bale Price</th>
                        <th className="py-3 px-3 text-right">Price / Piece</th>
                        <th className="py-3 px-3 text-right">Total Sales Made</th>
                        <th className="py-3 px-4 min-w-[200px]">Break-Even Status</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800 font-mono">
                      {bales.map((b) => {
                        const totalCost = b.totalPurchasePrice || 1;
                        const sales = b.totalSalesMade || 0;
                        const progressPct = Math.min(100, Math.round((sales / totalCost) * 100));
                        const isBreakEven = sales >= totalCost;
                        const diff = Math.abs(sales - totalCost);

                        return (
                          <tr key={b.id} className="hover:bg-stone-800/40 transition">
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-orange-400 block">{b.baleCode}</span>
                              <span className="font-sans text-stone-200">{b.baleName}</span>
                            </td>
                            <td className="py-3.5 px-3 font-sans">
                              <span className="text-stone-300 block">{b.category}</span>
                              <span className="text-[10px] text-stone-500">{b.supplierName}</span>
                            </td>
                            <td className="py-3.5 px-3 text-center font-bold text-white">
                              {b.quantityPurchase} pcs
                            </td>
                            <td className="py-3.5 px-3 text-right font-medium text-stone-200">
                              ₱{b.totalPurchasePrice.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-3 text-right text-amber-400">
                              ₱{b.pricePerPiece.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                              ₱{sales.toLocaleString()}
                            </td>

                            {/* Break-even status indicator as requested */}
                            <td className="py-3.5 px-4 font-sans">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[11px]">
                                  <span className="font-bold text-stone-300">{progressPct}%</span>
                                  {isBreakEven ? (
                                    <span className="text-emerald-400 font-bold font-mono">
                                      +{diff > 0 ? `₱${diff.toLocaleString()} Profit` : 'Breakeven!'}
                                    </span>
                                  ) : (
                                    <span className="text-amber-400 font-medium font-mono">
                                      Need: ₱{diff.toLocaleString()}
                                    </span>
                                  )}
                                </div>
                                <div className="w-full h-2 rounded-full bg-stone-900 overflow-hidden border border-stone-800">
                                  <div
                                    className={`h-full transition-all duration-500 rounded-full ${
                                      isBreakEven
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                        : 'bg-gradient-to-r from-orange-500 to-amber-400'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Status: sealed / opened / depleted */}
                            <td className="py-3.5 px-3 text-center font-sans">
                              <select
                                value={b.status}
                                onChange={(e) => updateBale(b.id, { status: e.target.value as any })}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border uppercase focus:outline-none cursor-pointer ${
                                  b.status === 'sealed'
                                    ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                                    : b.status === 'opened'
                                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                    : 'bg-stone-800 text-stone-400 border-stone-700'
                                }`}
                              >
                                <option value="sealed">Sealed</option>
                                <option value="opened">Opened</option>
                                <option value="depleted">Depleted</option>
                              </select>
                            </td>

                            {/* Actions: Edit & Delete */}
                            <td className="py-3.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => startEditBale(b)}
                                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer"
                                  title="Edit Bale"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteBale(b.id)}
                                  className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/30 transition cursor-pointer"
                                  title="Delete Bale"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 4: PRODUCT LIST (Swapped to position 4) ===================== */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                <span>{editingProductId ? 'Edit Product Item' : 'List New Product'}</span>
              </h2>
              {editingProductId && (
                <button
                  onClick={() => setEditingProductId(null)}
                  className="text-xs text-stone-400 hover:text-white cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Product Name */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nike Dunk Low Retro"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                {/* Category Selection - Direct Selection from Product Categories */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-stone-300">Product Category</label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('categories')}
                      className="text-[10px] text-orange-400 hover:text-orange-300 underline cursor-pointer"
                    >
                      Manage ({categories.length})
                    </button>
                  </div>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200 cursor-pointer hover:border-orange-500/50"
                  >
                    <option value="">-- Select Product Category ({categories.length} available) --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {productCategory && !categories.some((c) => c.name.toLowerCase() === productCategory.toLowerCase()) && (
                      <option value={productCategory}>{productCategory}</option>
                    )}
                  </select>
                </div>

                {/* Bale Category / Bale Code Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-stone-300">Select Bale Category / Code</label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('bales')}
                      className="text-[10px] text-orange-400 hover:text-orange-300 underline cursor-pointer"
                    >
                      Bales ({bales.length})
                    </button>
                  </div>
                  <select
                    value={productBaleCode}
                    onChange={(e) => handleSelectProductBale(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200 cursor-pointer hover:border-orange-500/50"
                  >
                    <option value="">Direct Inventory / No Bale</option>
                    {bales.map((b) => (
                      <option key={b.id} value={b.baleCode}>
                        {b.baleCode} - {b.baleName} (Cost: ₱{b.pricePerPiece ? b.pricePerPiece.toFixed(2) : 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Available Quantity */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Available Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="1"
                    value={productQty}
                    onChange={(e) =>
                      setProductQty(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Selling Price (₱) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="1200"
                    value={productSellingPrice}
                    onChange={(e) =>
                      setProductSellingPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">
                    Cost Price (Auto-filled from Bale)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Cost per piece"
                    value={productCostPrice}
                    onChange={(e) =>
                      setProductCostPrice(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Size</label>
                  <input
                    type="text"
                    placeholder="e.g. S, M, L, XL, 42 EU"
                    value={productSize}
                    onChange={(e) => setProductSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>

                {/* Product Link */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">External Visit Link</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/p/... or FB page"
                    value={productLink}
                    onChange={(e) => setProductLink(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 text-sm sm:text-xs focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none transition-all duration-200"
                  />
                </div>
              </div>

              {/* Image Upload & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Product Image File Upload</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-orange-500/40 hover:border-orange-500 bg-stone-950 text-stone-300 cursor-pointer transition">
                      <Upload className="w-4 h-4 text-orange-400" />
                      <span>{productImageUrl ? 'Change Product Photo' : 'Upload Product Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProductImageUpload}
                        className="hidden"
                      />
                    </label>
                    {productImageUrl && (
                      <img
                        src={productImageUrl}
                        alt="Product preview"
                        className="w-14 h-14 rounded-xl object-cover border border-orange-500/40"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Description, measurements, fabric details..."
                    value={productDesc}
                    onChange={(e) => setProductDesc(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-stone-950/80 border border-orange-500/25 text-stone-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 focus:outline-none text-sm sm:text-xs transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
              >
                {editingProductId ? 'Update Product' : 'List Product'}
              </button>
            </form>
          </div>

          {/* Database Table Below with Search Button */}
          <div className="p-4 sm:p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-500/20">
              <div>
                <h3 className="text-base font-bold text-white">Product Inventory Database</h3>
                <span className="text-xs text-stone-400">{filteredProductsList.length} items found</span>
              </div>

              {/* Search button / input to find product */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search product name, code, bale..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 sm:py-2 rounded-xl bg-stone-950/80 border border-orange-500/25 text-sm sm:text-xs text-stone-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25 transition-all duration-200"
                />
              </div>
            </div>

            {filteredProductsList.length === 0 ? (
              <p className="text-center py-8 text-xs text-stone-400">
                No products found in the database. Use the form above to list unlimited products!
              </p>
            ) : (
              <>
                {/* Mobile Cards View (Visible on phones & small screens) */}
                <div className="block md:hidden space-y-3">
                  {filteredProductsList.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl bg-stone-950/70 border border-orange-500/20 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-16 h-16 rounded-xl object-cover bg-stone-900 border border-stone-800 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-stone-800 flex items-center justify-center text-[10px] text-stone-400 shrink-0">
                            No Pic
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{p.name}</h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-semibold">
                              {p.size || 'Free Size'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                              {p.category}
                            </span>
                          </div>
                          {p.baleCode && (
                            <p className="text-[10px] text-stone-400 font-mono mt-1">Bale: {p.baleCode}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-stone-800/80">
                        <div>
                          <span className="text-stone-400 block text-[10px]">Selling Price</span>
                          <span className="font-bold text-orange-400 text-sm font-mono">
                            ₱{p.sellingPrice.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[10px]">Available Stock</span>
                          <span
                            className={`font-bold font-mono ${
                              p.availableQuantity <= 0
                                ? 'text-rose-400'
                                : p.availableQuantity <= 3
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {p.availableQuantity} pcs
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
                        <span className="text-[10px] font-mono text-stone-500">{p.barcode}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditProduct(p)}
                            className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition hover:bg-stone-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="px-3 py-1.5 rounded-lg bg-red-950/60 text-red-300 text-xs font-semibold flex items-center gap-1 border border-red-500/30 cursor-pointer transition hover:bg-red-900"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Full Table View (Visible on md and larger) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-orange-500/20 text-stone-400 uppercase text-[11px]">
                        <th className="py-3 px-3">Image</th>
                        <th className="py-3 px-3">Product Name & Size</th>
                        <th className="py-3 px-3">Category</th>
                        <th className="py-3 px-3">Bale Code</th>
                        <th className="py-3 px-3 text-right">Selling Price</th>
                        <th className="py-3 px-3 text-right">Cost Price</th>
                        <th className="py-3 px-3 text-center">Stock Quantity</th>
                        <th className="py-3 px-3 text-center">Barcode</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800 font-mono">
                      {filteredProductsList.map((p) => (
                        <tr key={p.id} className="hover:bg-stone-800/40 transition">
                          <td className="py-3 px-3">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-12 h-12 rounded-xl object-cover bg-stone-900 border border-stone-800"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center text-[10px] text-stone-400">
                                No Pic
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-sans">
                            <p className="font-bold text-white">{p.name}</p>
                            <p className="text-[11px] text-orange-400">Size: {p.size || 'Free Size'}</p>
                          </td>
                          <td className="py-3 px-3 font-sans text-stone-300">{p.category}</td>
                          <td className="py-3 px-3 text-stone-400 font-mono">{p.baleCode || 'N/A'}</td>
                          <td className="py-3 px-3 text-right font-bold text-orange-400">
                            ₱{p.sellingPrice.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right text-stone-400">
                            ₱{p.costPrice ? p.costPrice.toLocaleString() : '0'}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-white">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs ${
                                p.availableQuantity <= 0
                                  ? 'bg-rose-950/80 text-rose-300'
                                  : p.availableQuantity <= 3
                                  ? 'bg-amber-950/80 text-amber-300'
                                  : 'bg-emerald-950/80 text-emerald-300'
                              }`}
                            >
                              {p.availableQuantity} pcs
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[11px] text-stone-400">
                            {p.barcode}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => startEditProduct(p)}
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteProduct(p.id)}
                                className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/30 transition cursor-pointer"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
    </div>
  );
};
