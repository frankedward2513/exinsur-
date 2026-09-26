import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Bale, Category, Product, Supplier } from '../types';
import {
  Boxes,
  Layers,
  ShoppingBag,
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Percent,
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

  // 4 Tabs: 'bales' | 'categories' | 'products' | 'suppliers'
  const [activeTab, setActiveTab] = useState<'bales' | 'categories' | 'products' | 'suppliers'>('bales');

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
        name: categoryName,
        description: categoryDesc,
        color: categoryColor,
      });
      setEditingCategoryId(null);
    } else {
      await addCategory({
        name: categoryName,
        description: categoryDesc,
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
  };

  const filteredProductsList = useMemo(() => {
    return products.filter((p) => {
      const match =
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.baleCode?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(productSearch.toLowerCase());
      return match;
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
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* 4 Inventory Navigation Buttons */}
      <div className="p-3 rounded-2xl glass-panel flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('bales')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'bales'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <Boxes className="w-4 h-4 text-orange-400" />
          <span>Bale Management</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono">
            {bales.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <Layers className="w-4 h-4 text-orange-400" />
          <span>Product Categories</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono">
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'products'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-orange-400" />
          <span>Product List</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
              : 'text-stone-300 hover:bg-stone-800'
          }`}
        >
          <Truck className="w-4 h-4 text-orange-400" />
          <span>Bale Suppliers</span>
          <span className="px-1.5 py-0.5 rounded-full bg-stone-950/60 text-[10px] font-mono">
            {suppliers.length}
          </span>
        </button>
      </div>

      {/* ===================== TAB 1: BALE MANAGEMENT ===================== */}
      {activeTab === 'bales' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-orange-400" />
                <span>{editingBaleId ? 'Edit Bale Record' : 'Enter New Bale Record'}</span>
              </h2>
              {editingBaleId && (
                <button
                  type="button"
                  onClick={() => setEditingBaleId(null)}
                  className="text-xs text-stone-400 hover:text-white"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Bale Code (Auto-generated) */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1 flex items-center justify-between">
                    <span>Bale Code (Auto-Generated)</span>
                    <button
                      type="button"
                      onClick={() => setBaleCode(generateBaleCode())}
                      className="text-orange-400 hover:text-orange-300 flex items-center gap-1 font-mono"
                    >
                      <RefreshCw className="w-3 h-3" /> Regenerate
                    </button>
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={baleCode}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950/60 border border-orange-500/30 text-orange-400 font-mono font-bold"
                  />
                </div>

                {/* Product Category */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Product Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Jackets, Shoes, Caps"
                    value={baleCategory}
                    onChange={(e) => setBaleCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Select Supplier */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Select Supplier</label>
                  <select
                    value={baleSupplierId}
                    onChange={(e) => setBaleSupplierId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Direct Import / Unassigned</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.contactPerson})
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
                    onChange={(e) => setBalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Quantity Purchase (pieces) */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Quantity Purchase (Pieces Count) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="100"
                    value={baleQuantity}
                    onChange={(e) => setBaleQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Automatically calculate price per piece notice */}
              <div className="p-3 bg-stone-950/70 rounded-xl border border-orange-500/30 flex items-center justify-between text-xs">
                <span className="text-stone-300">Auto-Calculated Price Per Piece:</span>
                <span className="font-mono font-bold text-orange-400 text-sm">
                  ₱{calculatedPricePerPiece.toFixed(2)} / piece
                </span>
              </div>

              {/* Description */}
              <div className="text-xs">
                <label className="block font-medium text-stone-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Notes on bale quality, tags, bundle origin..."
                  value={baleDesc}
                  onChange={(e) => setBaleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
              >
                {editingBaleId ? 'Update Bale Record' : 'Save Bale Record'}
              </button>
            </form>
          </div>

          {/* Database Table below */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h3 className="text-base font-bold text-white">Bales Database</h3>
              <span className="text-xs font-mono text-orange-400">{bales.length} Total Bales</span>
            </div>

            {bales.length === 0 ? (
              <p className="text-center py-8 text-xs text-stone-400">
                No bales entered yet. Use the form above to add your first bale without any limits!
              </p>
            ) : (
              <div className="overflow-x-auto">
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
                                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white"
                                title="Edit Bale"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteBale(b.id)}
                                className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/30"
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
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 2: PRODUCT CATEGORIES ===================== */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-400" />
                <span>{editingCategoryId ? 'Edit Category' : 'Add Product Category'}</span>
              </h2>
              {editingCategoryId && (
                <button
                  onClick={() => setEditingCategoryId(null)}
                  className="text-xs text-stone-400 hover:text-white"
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
                    placeholder="e.g. Jackets, Shoes, Caps, T-Shirts"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Outerwear, winter coats, bombers"
                    value={categoryDesc}
                    onChange={(e) => setCategoryDesc(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Category Badge Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={categoryColor}
                      onChange={(e) => setCategoryColor(e.target.value)}
                      className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={categoryColor}
                      onChange={(e) => setCategoryColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
              >
                {editingCategoryId ? 'Update Category' : 'Add Category'}
              </button>
            </form>
          </div>

          {/* Cards Display Below as requested */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">Categories Overview</h3>
            {categories.length === 0 ? (
              <div className="p-8 text-center rounded-3xl glass-panel text-xs text-stone-400">
                No categories added yet. Create categories like "Jackets", "Shoes", "Caps" above!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-5 rounded-2xl glass-panel glass-panel-hover flex flex-col justify-between border border-orange-500/20 space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-6 h-6 rounded-full shadow-md shrink-0 border border-white/20"
                          style={{ backgroundColor: cat.color || '#ea580c' }}
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white group-hover:text-orange-300 transition">
                            {cat.name}
                          </h4>
                          <p className="text-[11px] text-stone-400 line-clamp-2">
                            {cat.description || 'Apparel category'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditCategory(cat)}
                          className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat.id)}
                          className="p-1 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
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

      {/* ===================== TAB 3: PRODUCT LIST ===================== */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                <span>{editingProductId ? 'Edit Product Item' : 'List New Product'}</span>
              </h2>
              {editingProductId && (
                <button
                  onClick={() => setEditingProductId(null)}
                  className="text-xs text-stone-400 hover:text-white"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Product Category</label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Select or Type Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bale Category Source */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Select Bale Category / Code</label>
                  <select
                    value={productBaleCode}
                    onChange={(e) => handleSelectProductBale(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Direct Inventory (No Bale)</option>
                    {bales.map((b) => (
                      <option key={b.id} value={b.baleCode}>
                        {b.baleCode} - {b.baleName} (Cost: ₱{b.pricePerPiece.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Available Quantity */}
                <div>
                  <label className="block font-medium text-stone-300 mb-1">Available Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="2"
                    value={productQty}
                    onChange={(e) => setProductQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono focus:border-orange-500 focus:outline-none"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>

                {/* Cost Price (auto filled when bale is selected) */}
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
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 font-mono focus:border-orange-500 focus:outline-none"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
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
                    className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
              >
                {editingProductId ? 'Update Product' : 'List Product'}
              </button>
            </form>
          </div>

          {/* Database Table Below with Search Button */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-500/20">
              <h3 className="text-base font-bold text-white">Product Inventory Database</h3>

              {/* Search button / input to find product */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search product name, code, bale..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-xs text-stone-100 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {filteredProductsList.length === 0 ? (
              <p className="text-center py-8 text-xs text-stone-400">
                No products found in the database. Use the form above to list unlimited products!
              </p>
            ) : (
              <div className="overflow-x-auto">
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
                              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteProduct(p.id)}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white border border-red-500/30"
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
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 4: BALE SUPPLIERS ===================== */}
      {activeTab === 'suppliers' && (
        <div className="space-y-6">
          {/* Form */}
          <div className="p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-400" />
                <span>{editingSupplierId ? 'Edit Supplier' : 'Register Bale Supplier'}</span>
              </h2>
              {editingSupplierId && (
                <button
                  onClick={() => setEditingSupplierId(null)}
                  className="text-xs text-stone-400 hover:text-white"
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
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Robert Tan"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="supplier@apexbales.com"
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-300 mb-1">Contact Number</label>
                  <input
                    type="tel"
                    placeholder="+63 917 888 9999"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-medium text-stone-300 mb-1">Supplier Address</label>
                  <input
                    type="text"
                    placeholder="Warehouse 4B, Valenzuela City, Metro Manila"
                    value={supplierAddress}
                    onChange={(e) => setSupplierAddress(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none"
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
                  className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-orange-500/20 text-stone-100 focus:border-orange-500 focus:outline-none text-xs"
                />
              </div>

              <button
                type="submit"
                className="py-3 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
              >
                {editingSupplierId ? 'Update Supplier' : 'Register Supplier'}
              </button>
            </form>
          </div>

          {/* KPI Cards below as requested */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">Registered Bale Suppliers</h3>
            {suppliers.length === 0 ? (
              <div className="p-8 text-center rounded-3xl glass-panel text-xs text-stone-400">
                No bale suppliers registered yet. Register your suppliers above to track sourcing volumes!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                          <p className="text-xs text-orange-400 font-medium">{s.contactPerson}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditSupplier(s)}
                            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteSupplier(s.id)}
                            className="p-1 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10"
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
    </div>
  );
};
