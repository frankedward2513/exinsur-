import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import {
  db,
  testConnection,
  handleFirestoreError,
  OperationType,
  cleanFirestoreData,
  signInWithPopup,
  googleProvider,
  auth,
} from '../lib/firebase';
import {
  UserProfile,
  UserRole,
  Bale,
  Category,
  Product,
  Supplier,
  ExpenseAccount,
  Expense,
  Order,
  OrderItem,
  CartItem,
  Transaction,
  ItemStatusLog,
} from '../types';

export interface SignUpParams {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  provider?: 'email' | 'google';
  uid?: string;
}

export interface GoogleFastResult {
  needsDetails: boolean;
  userProfile?: UserProfile;
  googleUser?: {
    uid: string;
    email: string;
    displayName: string;
  };
}

interface StoreContextType {
  // Theme & Auth
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentUser: UserProfile;
  customers: UserProfile[];
  loginAs: (email: string, password?: string) => Promise<boolean>;
  signupAs: (
    nameOrParams: string | SignUpParams,
    email?: string,
    password?: string,
    phone?: string,
    address?: string
  ) => Promise<boolean>;
  loginWithGoogleFast: () => Promise<GoogleFastResult>;
  completeGoogleSignUp: (params: {
    uid: string;
    displayName: string;
    email: string;
    phone: string;
    address: string;
  }) => Promise<boolean>;
  logout: () => void;
  
  // Data
  bales: Bale[];
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  expenseAccounts: ExpenseAccount[];
  expenses: Expense[];
  orders: Order[];
  transactions: Transaction[];
  itemStatusLogs: ItemStatusLog[];

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => { success: boolean; message?: string };
  updateCartQuantity: (productId: string, quantity: number) => { success: boolean; message?: string };
  toggleCartItemSelect: (productId: string) => void;
  toggleSelectAllCart: (select: boolean) => void;
  removeFromCart: (productId: string) => void;
  clearSelectedCart: () => void;
  cartNotification: string | null;
  clearCartNotification: () => void;

  // Bale Management
  addBale: (bale: Omit<Bale, 'id' | 'totalSalesMade' | 'createdAt'>) => Promise<void>;
  updateBale: (id: string, updates: Partial<Bale>) => Promise<void>;
  deleteBale: (id: string) => Promise<void>;

  // Category Management
  addCategory: (cat: Omit<Category, 'id' | 'totalInStock' | 'createdAt'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Product Management
  addProduct: (prod: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductBarcodeStatus: (id: string) => Promise<void>;

  // Supplier Management
  addSupplier: (supp: Omit<Supplier, 'id' | 'totalBalesSourced' | 'createdAt'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Expense Account Management
  addExpenseAccount: (acc: Omit<ExpenseAccount, 'id' | 'totalSpent' | 'createdAt'>) => Promise<void>;
  updateExpenseAccount: (id: string, updates: Partial<ExpenseAccount>) => Promise<void>;
  deleteExpenseAccount: (id: string) => Promise<void>;

  // Expense Management
  addExpense: (exp: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Orders
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;

  // POS
  completePosSale: (params: {
    items: { product: Product; quantity: number }[];
    customerName?: string;
    discount: number;
    paymentMethod: 'cash' | 'gcash';
    amountTendered: number;
  }) => Promise<Order>;

  // Inventory Status Logs (Sold, Returned, Damaged, Lost)
  logItemStatus: (params: {
    productId: string;
    productName: string;
    type: 'sold' | 'returned' | 'damaged' | 'lost';
    quantity: number;
    notes?: string;
    adjustStock?: boolean;
  }) => Promise<void>;
  updateItemStatusLog: (
    id: string,
    updates: Partial<ItemStatusLog>,
    options?: {
      restoreStock?: boolean;
      productId?: string;
      quantityToRestore?: number;
    }
  ) => Promise<void>;
  deleteItemStatusLog: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

  // Helper for deterministic roles
export function determineRole(email: string): UserRole {
  const normalized = email.trim().toLowerCase();
  if (normalized === 'villotafrankedward@gmail.com') return 'owner';
  if (normalized === 'frankvillota905@gmail.com' || normalized === 'frankvillota905@gmail.om') return 'staff';
  return 'customer';
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('exins_theme');
    return saved ? saved === 'dark' : true;
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('exins_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  // Auth state - default to Guest so visitors browse safely until sign in / sign up
  const GUEST_USER: UserProfile = {
    uid: 'guest-visitor',
    email: '',
    displayName: 'Guest Visitor',
    role: 'guest',
    isGuest: true,
  };

  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('exins_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && parsed.role && parsed.role !== 'guest') {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return GUEST_USER;
  });

  const loginAs = async (email: string, password?: string): Promise<boolean> => {
    const normalized = email.trim().toLowerCase();
    const pwd = (password || '').trim();

    // 1. Strict Owner Authentication
    if (normalized === 'villotafrankedward@gmail.com') {
      if (pwd !== '12345678') {
        throw new Error('Incorrect password for Owner account.');
      }
      const ownerUser: UserProfile = {
        uid: 'owner-frank',
        email: 'villotafrankedward@gmail.com',
        displayName: 'Frank Edward Villota (Owner)',
        role: 'owner',
        isGuest: false,
      };
      setCurrentUser(ownerUser);
      localStorage.setItem('exins_user', JSON.stringify(ownerUser));
      return true;
    }

    // 2. Strict Staff Authentication
    if (normalized === 'frankvillota905@gmail.com' || normalized === 'frankvillota905@gmail.om') {
      if (pwd !== '12345678') {
        throw new Error('Incorrect password for Staff account.');
      }
      const staffUser: UserProfile = {
        uid: 'staff-frank',
        email: 'Frankvillota905@gmail.com',
        displayName: 'Frank Villota (Staff)',
        role: 'staff',
        isGuest: false,
      };
      setCurrentUser(staffUser);
      localStorage.setItem('exins_user', JSON.stringify(staffUser));
      return true;
    }

    // 3. All other sign-ins automatically become Customer
    const existing = customers.find((c) => c.email.toLowerCase() === normalized);
    const customerUser: UserProfile = existing
      ? { ...existing, isGuest: false }
      : {
          uid: `cust_${Date.now()}`,
          email: normalized,
          displayName: normalized.includes('@') ? normalized.split('@')[0] : 'Customer',
          role: 'customer',
          isGuest: false,
        };
    setCurrentUser(customerUser);
    localStorage.setItem('exins_user', JSON.stringify(customerUser));
    return true;
  };

  const signupAs = async (
    nameOrParams: string | SignUpParams,
    emailArg?: string,
    _passwordArg?: string,
    phoneArg?: string,
    addressArg?: string
  ): Promise<boolean> => {
    let name = '';
    let email = '';
    let phone = '';
    let address = '';
    let provider: 'email' | 'google' = 'email';
    let uid = '';

    if (typeof nameOrParams === 'object') {
      name = nameOrParams.name;
      email = nameOrParams.email;
      phone = nameOrParams.phone || '';
      address = nameOrParams.address || '';
      provider = nameOrParams.provider || 'email';
      uid = nameOrParams.uid || '';
    } else {
      name = nameOrParams;
      email = emailArg || '';
      phone = phoneArg || '';
      address = addressArg || '';
    }

    const normalized = email.trim().toLowerCase();

    // Prevent customers from attempting to sign up as owner or staff
    if (
      normalized === 'villotafrankedward@gmail.com' ||
      normalized === 'frankvillota905@gmail.com' ||
      normalized === 'frankvillota905@gmail.om'
    ) {
      throw new Error(
        'This administrative account already exists. Please use Sign In with your authorized password.'
      );
    }

    const customerUid = uid || `cust_${Date.now()}`;
    const customerUser: UserProfile = {
      uid: customerUid,
      email: normalized,
      displayName: name.trim() || (normalized.includes('@') ? normalized.split('@')[0] : 'Customer'),
      phone: phone.trim(),
      address: address.trim(),
      role: 'customer',
      provider,
      isGuest: false,
      createdAt: new Date().toISOString(),
    };

    setCurrentUser(customerUser);
    localStorage.setItem('exins_user', JSON.stringify(customerUser));
    setCustomers((prev) => [customerUser, ...prev.filter((c) => c.uid !== customerUid)]);

    // Save to Firestore customers and users collection persistently
    try {
      await setDoc(doc(db, 'customers', customerUid), cleanFirestoreData(customerUser));
      await setDoc(doc(db, 'users', customerUid), cleanFirestoreData(customerUser));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `customers/${customerUid}`);
    }

    return true;
  };

  const loginWithGoogleFast = async (): Promise<GoogleFastResult> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const gUser = res.user;
      const email = (gUser.email || '').trim().toLowerCase();
      const displayName = gUser.displayName || 'Customer';
      const uid = gUser.uid;

      // Check if this email is owner or staff
      if (email === 'villotafrankedward@gmail.com') {
        const ownerUser: UserProfile = {
          uid: 'owner-frank',
          email: 'villotafrankedward@gmail.com',
          displayName: displayName || 'Frank Edward Villota (Owner)',
          role: 'owner',
          isGuest: false,
          provider: 'google',
        };
        setCurrentUser(ownerUser);
        localStorage.setItem('exins_user', JSON.stringify(ownerUser));
        return { needsDetails: false, userProfile: ownerUser };
      }

      if (email === 'frankvillota905@gmail.com' || email === 'frankvillota905@gmail.om') {
        const staffUser: UserProfile = {
          uid: 'staff-frank',
          email: 'Frankvillota905@gmail.com',
          displayName: displayName || 'Frank Villota (Staff)',
          role: 'staff',
          isGuest: false,
          provider: 'google',
        };
        setCurrentUser(staffUser);
        localStorage.setItem('exins_user', JSON.stringify(staffUser));
        return { needsDetails: false, userProfile: staffUser };
      }

      // Check if existing customer profile already has phone and address
      const existing = customers.find((c) => c.email.toLowerCase() === email || c.uid === uid);
      if (existing && existing.phone && existing.address) {
        const fullCustomer: UserProfile = {
          ...existing,
          isGuest: false,
        };
        setCurrentUser(fullCustomer);
        localStorage.setItem('exins_user', JSON.stringify(fullCustomer));
        return { needsDetails: false, userProfile: fullCustomer };
      }

      // If missing phone or address, prompt for full name, phone and delivery address
      return {
        needsDetails: true,
        googleUser: {
          uid,
          email,
          displayName: existing?.displayName || displayName,
        },
      };
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      throw new Error(err?.message || 'Google Sign-In failed. Please try again.');
    }
  };

  const completeGoogleSignUp = async (params: {
    uid: string;
    displayName: string;
    email: string;
    phone: string;
    address: string;
  }): Promise<boolean> => {
    return signupAs({
      uid: params.uid,
      name: params.displayName,
      email: params.email,
      phone: params.phone,
      address: params.address,
      provider: 'google',
    });
  };

  const logout = () => {
    setCurrentUser(GUEST_USER);
    localStorage.removeItem('exins_user');
  };

  // State collections - initialized strictly empty as requested: "Don’t add initial data because im the one who will add this, no limitation to add."
  const [customers, setCustomers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('exins_customers');
    return saved ? JSON.parse(saved) : [];
  });
  const [bales, setBales] = useState<Bale[]>(() => {
    const saved = localStorage.getItem('exins_bales');
    return saved ? JSON.parse(saved) : [];
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('exins_categories');
    return saved ? JSON.parse(saved) : [];
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('exins_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('exins_suppliers');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>(() => {
    const saved = localStorage.getItem('exins_expense_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('exins_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('exins_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('exins_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [itemStatusLogs, setItemStatusLogs] = useState<ItemStatusLog[]>(() => {
    const saved = localStorage.getItem('exins_item_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('exins_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [cartNotification, setCartNotification] = useState<string | null>(null);

  const clearCartNotification = () => setCartNotification(null);

  // Sync state to localStorage cache
  useEffect(() => {
    localStorage.setItem('exins_customers', JSON.stringify(customers));
  }, [customers]);
  useEffect(() => {
    localStorage.setItem('exins_bales', JSON.stringify(bales));
  }, [bales]);
  useEffect(() => {
    localStorage.setItem('exins_categories', JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem('exins_products', JSON.stringify(products));
  }, [products]);
  useEffect(() => {
    localStorage.setItem('exins_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);
  useEffect(() => {
    localStorage.setItem('exins_expense_accounts', JSON.stringify(expenseAccounts));
  }, [expenseAccounts]);
  useEffect(() => {
    localStorage.setItem('exins_expenses', JSON.stringify(expenses));
  }, [expenses]);
  useEffect(() => {
    localStorage.setItem('exins_orders', JSON.stringify(orders));
  }, [orders]);
  useEffect(() => {
    localStorage.setItem('exins_transactions', JSON.stringify(transactions));
  }, [transactions]);
  useEffect(() => {
    localStorage.setItem('exins_item_logs', JSON.stringify(itemStatusLogs));
  }, [itemStatusLogs]);
  useEffect(() => {
    localStorage.setItem('exins_cart', JSON.stringify(cart));
  }, [cart]);

  // Firestore real-time listeners on startup
  useEffect(() => {
    testConnection();

    // Listeners with graceful fallback
    const unsubBales = onSnapshot(
      query(collection(db, 'bales')),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Bale[] = [];
          snapshot.forEach((d) => loaded.push({ ...(d.data() as Bale), id: d.id }));
          setBales(loaded);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'bales')
    );

    const unsubCategories = onSnapshot(
      query(collection(db, 'categories')),
      (snapshot) => {
        const loaded: Category[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Category), id: d.id }));
        if (loaded.length > 0) {
          setCategories(loaded);
        } else {
          // If Firestore is empty, check if we have local categories to persist into Firestore
          const localSaved = localStorage.getItem('exins_categories');
          if (localSaved) {
            try {
              const localCats: Category[] = JSON.parse(localSaved);
              if (localCats.length > 0) {
                setCategories(localCats);
                localCats.forEach((c) => {
                  setDoc(doc(db, 'categories', c.id), cleanFirestoreData(c)).catch(console.warn);
                });
                return;
              }
            } catch {
              // ignore
            }
          }
          setCategories([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'categories')
    );

    const unsubProducts = onSnapshot(
      query(collection(db, 'products')),
      (snapshot) => {
        const loaded: Product[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Product), id: d.id }));
        if (loaded.length > 0) {
          setProducts(loaded);
        } else {
          // If Firestore is empty, check if we have local products to persist into Firestore
          const localSaved = localStorage.getItem('exins_products');
          if (localSaved) {
            try {
              const localProds: Product[] = JSON.parse(localSaved);
              if (localProds.length > 0) {
                setProducts(localProds);
                localProds.forEach((p) => {
                  setDoc(doc(db, 'products', p.id), cleanFirestoreData(p)).catch(console.warn);
                });
                return;
              }
            } catch {
              // ignore
            }
          }
          setProducts([]);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'products')
    );

    const unsubSuppliers = onSnapshot(
      query(collection(db, 'suppliers')),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Supplier[] = [];
          snapshot.forEach((d) => loaded.push({ ...(d.data() as Supplier), id: d.id }));
          setSuppliers(loaded);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'suppliers')
    );

    const unsubExpenseAcc = onSnapshot(
      query(collection(db, 'expense_accounts')),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: ExpenseAccount[] = [];
          snapshot.forEach((d) => loaded.push({ ...(d.data() as ExpenseAccount), id: d.id }));
          setExpenseAccounts(loaded);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'expense_accounts')
    );

    const unsubExpenses = onSnapshot(
      query(collection(db, 'expenses')),
      (snapshot) => {
        const loaded: Expense[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Expense), id: d.id }));
        setExpenses(loaded);
        localStorage.setItem('exins_expenses', JSON.stringify(loaded));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'expenses')
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders')),
      (snapshot) => {
        const loaded: Order[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Order), id: d.id }));
        setOrders(loaded);
        localStorage.setItem('exins_orders', JSON.stringify(loaded));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'orders')
    );

    const unsubTransactions = onSnapshot(
      query(collection(db, 'transactions')),
      (snapshot) => {
        const loaded: Transaction[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as Transaction), id: d.id }));
        setTransactions(loaded);
        localStorage.setItem('exins_transactions', JSON.stringify(loaded));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'transactions')
    );

    const unsubCustomers = onSnapshot(
      query(collection(db, 'customers')),
      (snapshot) => {
        const loaded: UserProfile[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as UserProfile), uid: d.id }));
        if (loaded.length > 0) {
          setCustomers(loaded);
        } else {
          // If Firestore is empty, check if we have local customers to persist into Firestore
          const localSaved = localStorage.getItem('exins_customers');
          if (localSaved) {
            try {
              const localCusts: UserProfile[] = JSON.parse(localSaved);
              if (localCusts.length > 0) {
                setCustomers(localCusts);
                localCusts.forEach((c) => {
                  setDoc(doc(db, 'customers', c.uid), cleanFirestoreData(c)).catch(console.warn);
                });
                return;
              }
            } catch {
              // ignore
            }
          }
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'customers')
    );

    const unsubItemLogs = onSnapshot(
      query(collection(db, 'item_logs')),
      (snapshot) => {
        const loaded: ItemStatusLog[] = [];
        snapshot.forEach((d) => loaded.push({ ...(d.data() as ItemStatusLog), id: d.id }));
        if (loaded.length > 0) {
          setItemStatusLogs(loaded);
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'item_logs')
    );

    return () => {
      unsubBales();
      unsubCategories();
      unsubProducts();
      unsubSuppliers();
      unsubExpenseAcc();
      unsubExpenses();
      unsubOrders();
      unsubTransactions();
      unsubCustomers();
      unsubItemLogs();
    };
  }, []);

  // Update dynamic aggregates (category total in stock, expense account total spent, supplier bale count)
  useEffect(() => {
    // Sync category stock count
    setCategories((prev) =>
      prev.map((cat) => {
        const inStock = products
          .filter((p) => p.category?.toLowerCase() === cat.name?.toLowerCase())
          .reduce((sum, p) => sum + (p.availableQuantity || 0), 0);
        return inStock !== cat.totalInStock ? { ...cat, totalInStock: inStock } : cat;
      })
    );

    // Sync expense account total spent
    setExpenseAccounts((prev) =>
      prev.map((acc) => {
        const spent = expenses
          .filter((e) => e.accountId === acc.id || e.accountName === acc.name)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        return spent !== acc.totalSpent ? { ...acc, totalSpent: spent } : acc;
      })
    );

    // Sync supplier bales sourced
    setSuppliers((prev) =>
      prev.map((supp) => {
        const count = bales.filter((b) => b.supplierId === supp.id || b.supplierName === supp.name).length;
        return count !== supp.totalBalesSourced ? { ...supp, totalBalesSourced: count } : supp;
      })
    );
  }, [products, expenses, bales]);

  // Auto-reconcile orphaned orders: if transactions exist but an order's transaction was deleted, purge that order from DB and state
  useEffect(() => {
    if (transactions.length > 0 && orders.length > 0) {
      const orphanedOrders = orders.filter((o) => {
        const hasTx = transactions.some(
          (t) => t.orderId === o.id || (t.description && t.description.includes(o.orderNumber))
        );
        return !hasTx;
      });

      if (orphanedOrders.length > 0) {
        setOrders((prev) => {
          const next = prev.filter((o) => !orphanedOrders.some((orph) => orph.id === o.id));
          localStorage.setItem('exins_orders', JSON.stringify(next));
          return next;
        });
        orphanedOrders.forEach((o) => {
          deleteDoc(doc(db, 'orders', o.id)).catch(console.warn);
        });
      }
    }
  }, [transactions, orders]);

  // Cart operations
  const addToCart = (product: Product, quantity = 1) => {
    if (!currentUser || currentUser.role === 'guest' || currentUser.isGuest || !currentUser.email) {
      const msg = 'Please sign in or create an account first to add items to your shopping bag.';
      setCartNotification(msg);
      return { success: false, message: msg };
    }

    if (product.availableQuantity <= 0) {
      const msg = `Sorry, ${product.name} is currently out of stock.`;
      setCartNotification(msg);
      return { success: false, message: msg };
    }

    const existingIndex = cart.findIndex((item) => item.productId === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      const newQty = currentQty + quantity;

      if (newQty > product.availableQuantity) {
        const msg = `Only ${product.availableQuantity} left in stock for ${product.name}!`;
        setCartNotification(msg);
        return { success: false, message: msg };
      }

      setCart((prev) =>
        prev.map((item, idx) => (idx === existingIndex ? { ...item, quantity: newQty } : item))
      );
      setCartNotification(`Updated ${product.name} quantity in bag.`);
      return { success: true };
    } else {
      if (quantity > product.availableQuantity) {
        const msg = `Only ${product.availableQuantity} left in stock for ${product.name}!`;
        setCartNotification(msg);
        return { success: false, message: msg };
      }

      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        size: product.size || 'Free Size',
        price: product.sellingPrice,
        costPrice: product.costPrice || 0,
        quantity,
        imageUrl: product.imageUrl || '',
        maxStock: product.availableQuantity,
        selected: true,
        baleCode: product.baleCode,
      };
      setCart((prev) => [...prev, newItem]);
      setCartNotification(`Added ${product.name} to your bag.`);
      return { success: true };
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      return { success: false, message: 'Minimum quantity is 1.' };
    }

    const targetItem = cart.find((item) => item.productId === productId);
    if (!targetItem) return { success: false };

    // Check against real-time product stock
    const realProduct = products.find((p) => p.id === productId);
    const maxStock = realProduct ? realProduct.availableQuantity : targetItem.maxStock;

    if (quantity > maxStock) {
      const msg = `Only ${maxStock} left in stock for ${targetItem.name}!`;
      setCartNotification(msg);
      return { success: false, message: msg };
    }

    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, quantity, maxStock } : item))
    );
    return { success: true };
  };

  const toggleCartItemSelect = (productId: string) => {
    setCart((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleSelectAllCart = (select: boolean) => {
    setCart((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearSelectedCart = () => {
    setCart((prev) => prev.filter((item) => !item.selected));
  };

  // Bale Management
  const addBale = async (baleData: Omit<Bale, 'id' | 'totalSalesMade' | 'createdAt'>) => {
    const id = `bale_${Date.now()}`;
    const newBale: Bale = {
      ...baleData,
      id,
      totalSalesMade: 0,
      createdAt: new Date().toISOString(),
    };
    setBales((prev) => [newBale, ...prev]);

    try {
      await setDoc(doc(db, 'bales', id), newBale);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `bales/${id}`);
    }
  };

  const updateBale = async (id: string, updates: Partial<Bale>) => {
    setBales((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    try {
      await updateDoc(doc(db, 'bales', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bales/${id}`);
    }
  };

  const deleteBale = async (id: string) => {
    setBales((prev) => prev.filter((b) => b.id !== id));
    try {
      await deleteDoc(doc(db, 'bales', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `bales/${id}`);
    }
  };

  // Category Management
  const addCategory = async (catData: Omit<Category, 'id' | 'totalInStock' | 'createdAt'>) => {
    const id = `cat_${Date.now()}`;
    const newCat: Category = {
      ...catData,
      id,
      totalInStock: 0,
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [newCat, ...prev]);

    try {
      await setDoc(doc(db, 'categories', id), cleanFirestoreData(newCat));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `categories/${id}`);
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    try {
      await updateDoc(doc(db, 'categories', id), cleanFirestoreData(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `categories/${id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  };

  // Product Management
  const addProduct = async (prodData: Omit<Product, 'id' | 'createdAt'>) => {
    const id = `prod_${Date.now()}`;
    const newProd: Product = {
      ...prodData,
      id,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProd, ...prev]);

    try {
      await setDoc(doc(db, 'products', id), cleanFirestoreData(newProd));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${id}`);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    try {
      await updateDoc(doc(db, 'products', id), cleanFirestoreData(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const toggleProductBarcodeStatus = async (id: string) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    const newStatus = prod.barcodeStatus === 'done' ? 'new' : 'done';
    await updateProduct(id, { barcodeStatus: newStatus });
  };

  // Supplier Management
  const addSupplier = async (suppData: Omit<Supplier, 'id' | 'totalBalesSourced' | 'createdAt'>) => {
    const id = `supp_${Date.now()}`;
    const newSupp: Supplier = {
      ...suppData,
      id,
      totalBalesSourced: 0,
      createdAt: new Date().toISOString(),
    };
    setSuppliers((prev) => [newSupp, ...prev]);

    try {
      await setDoc(doc(db, 'suppliers', id), newSupp);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `suppliers/${id}`);
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    try {
      await updateDoc(doc(db, 'suppliers', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `suppliers/${id}`);
    }
  };

  const deleteSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteDoc(doc(db, 'suppliers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `suppliers/${id}`);
    }
  };

  // Expense Account Management
  const addExpenseAccount = async (accData: Omit<ExpenseAccount, 'id' | 'totalSpent' | 'createdAt'>) => {
    const id = `acc_${Date.now()}`;
    const newAcc: ExpenseAccount = {
      ...accData,
      id,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };
    setExpenseAccounts((prev) => [newAcc, ...prev]);

    try {
      await setDoc(doc(db, 'expense_accounts', id), newAcc);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expense_accounts/${id}`);
    }
  };

  const updateExpenseAccount = async (id: string, updates: Partial<ExpenseAccount>) => {
    setExpenseAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    try {
      await updateDoc(doc(db, 'expense_accounts', id), updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expense_accounts/${id}`);
    }
  };

  const deleteExpenseAccount = async (id: string) => {
    setExpenseAccounts((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteDoc(doc(db, 'expense_accounts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expense_accounts/${id}`);
    }
  };

  // Expense Management
  const addExpense = async (expData: Omit<Expense, 'id' | 'createdAt'>) => {
    const id = `exp_${Date.now()}`;
    const newExp: Expense = {
      ...expData,
      id,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [newExp, ...prev]);

    // Automatically record an outflow in Transaction History
    const txId = `tx_${Date.now()}`;
    const newTx: Transaction = {
      id: txId,
      date: expData.date || new Date().toISOString().split('T')[0],
      flowType: 'outflow',
      category: 'Disbursement',
      account: expData.accountName,
      description: expData.description || `Disbursement for ${expData.accountName}`,
      paymentMethod: expData.paymentMethod,
      inflow: 0,
      outflow: expData.amount,
      expenseId: id,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    try {
      await setDoc(doc(db, 'expenses', id), newExp);
      await setDoc(doc(db, 'transactions', txId), newTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expenses/${id}`);
    }
  };

  const deleteExpense = async (id: string) => {
    const matchingTx = transactions.find(
      (t) => t.expenseId === id || (t.flowType === 'outflow' && t.account === id)
    );
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      localStorage.setItem('exins_expenses', JSON.stringify(next));
      return next;
    });
    if (matchingTx) {
      setTransactions((prev) => {
        const next = prev.filter((t) => t.id !== matchingTx.id);
        localStorage.setItem('exins_transactions', JSON.stringify(next));
        return next;
      });
    }

    try {
      await deleteDoc(doc(db, 'expenses', id));
      if (matchingTx) {
        await deleteDoc(doc(db, 'transactions', matchingTx.id)).catch(console.warn);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    }
  };

  // Transactions
  const addTransaction = async (txData: Omit<Transaction, 'id' | 'createdAt'>) => {
    const id = `tx_${Date.now()}`;
    const newTx: Transaction = {
      ...txData,
      id,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    try {
      await setDoc(doc(db, 'transactions', id), newTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `transactions/${id}`);
    }
  };

  const deleteTransaction = async (id: string) => {
    const targetTx = transactions.find((t) => t.id === id);

    // 1. Remove from local transactions state immediately
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      localStorage.setItem('exins_transactions', JSON.stringify(next));
      return next;
    });

    try {
      // 2. Delete transaction document from Firestore database
      await deleteDoc(doc(db, 'transactions', id));

      // 3. If linked to an order, delete order document from Firestore database and state
      const linkedOrderId = targetTx?.orderId;
      if (linkedOrderId) {
        setOrders((prev) => {
          const next = prev.filter((o) => o.id !== linkedOrderId);
          localStorage.setItem('exins_orders', JSON.stringify(next));
          return next;
        });
        await deleteDoc(doc(db, 'orders', linkedOrderId)).catch(console.warn);
      } else if (targetTx?.description) {
        // Fallback match: check if order number or order id is mentioned in description
        const matchedOrder = orders.find(
          (o) => targetTx.description.includes(o.orderNumber) || targetTx.description.includes(o.id)
        );
        if (matchedOrder) {
          setOrders((prev) => {
            const next = prev.filter((o) => o.id !== matchedOrder.id);
            localStorage.setItem('exins_orders', JSON.stringify(next));
            return next;
          });
          await deleteDoc(doc(db, 'orders', matchedOrder.id)).catch(console.warn);
        }
      }

      // 4. If linked to an expense, delete expense document from Firestore database and state
      const linkedExpenseId = targetTx?.expenseId;
      if (linkedExpenseId) {
        setExpenses((prev) => {
          const next = prev.filter((e) => e.id !== linkedExpenseId);
          localStorage.setItem('exins_expenses', JSON.stringify(next));
          return next;
        });
        await deleteDoc(doc(db, 'expenses', linkedExpenseId)).catch(console.warn);
      } else if (targetTx?.flowType === 'outflow') {
        const matchedExp = expenses.find(
          (e) =>
            (targetTx.account && e.accountName === targetTx.account && e.amount === targetTx.outflow) ||
            (targetTx.description && targetTx.description.includes(e.id))
        );
        if (matchedExp) {
          setExpenses((prev) => {
            const next = prev.filter((e) => e.id !== matchedExp.id);
            localStorage.setItem('exins_expenses', JSON.stringify(next));
            return next;
          });
          await deleteDoc(doc(db, 'expenses', matchedExp.id)).catch(console.warn);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
    }
  };

  // Orders creation and status management
  const createOrder = async (
    orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>
  ): Promise<Order> => {
    if (!currentUser || currentUser.role === 'guest' || currentUser.isGuest || !currentUser.email) {
      throw new Error('Please sign in or create an account first to complete your purchase.');
    }

    const id = `ord_${Date.now()}`;
    const orderNumber = `EX-${new Date().getFullYear().toString().slice(-2)}${Math.floor(
      100000 + Math.random() * 900000
    )}`;

    const newOrder: Order = {
      ...orderData,
      id,
      orderNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Deduct inventory quantities and credit bale sales
    orderData.items.forEach((item) => {
      // Deduct product stock
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === item.productId) {
            const newQty = Math.max(0, p.availableQuantity - item.quantity);
            // also trigger update in firestore
            updateProduct(p.id, { availableQuantity: newQty });
            return { ...p, availableQuantity: newQty };
          }
          return p;
        })
      );

      // Increment bale sales made if baleCode is associated
      if (item.baleCode) {
        setBales((prev) =>
          prev.map((b) => {
            if (b.baleCode === item.baleCode) {
              const itemTotal = item.price * item.quantity;
              const newSales = (b.totalSalesMade || 0) + itemTotal;
              updateBale(b.id, { totalSalesMade: newSales });
              return { ...b, totalSalesMade: newSales };
            }
            return b;
          })
        );
      }

      // Log sold status
      logItemStatus({
        productId: item.productId,
        productName: item.name,
        type: 'sold',
        quantity: item.quantity,
        notes: `Order ${orderNumber}`,
        adjustStock: false,
      });
    });

    // Record sales inflow transaction in Finance
    const txId = `tx_${Date.now()}`;
    const paidAmount =
      orderData.paymentType === 'down_payment'
        ? orderData.downPaymentAmount || 100
        : orderData.totalAmount;

    const newTx: Transaction = {
      id: txId,
      date: new Date().toISOString().split('T')[0],
      flowType: 'inflow',
      category: 'Showcase Sales',
      account: 'Customer Order Inflow',
      description: `Sale from Order #${orderNumber} (${orderData.customerName || 'Customer'})`,
      paymentMethod: orderData.paymentMethod || 'gcash',
      inflow: paidAmount,
      outflow: 0,
      orderId: id,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    try {
      await setDoc(doc(db, 'orders', id), newOrder);
      await setDoc(doc(db, 'transactions', txId), newTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${id}`);
    }

    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o))
    );
    try {
      await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: new Date().toISOString() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const cancelOrder = async (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    // Restore stock
    targetOrder.items.forEach((item) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === item.productId) {
            const restored = p.availableQuantity + item.quantity;
            updateProduct(p.id, { availableQuantity: restored });
            return { ...p, availableQuantity: restored };
          }
          return p;
        })
      );
      // Log as returned
      logItemStatus({
        productId: item.productId,
        productName: item.name,
        type: 'returned',
        quantity: item.quantity,
        notes: `Cancelled order #${targetOrder.orderNumber}`,
        adjustStock: false,
      });
    });

    await updateOrderStatus(orderId, 'cancelled');
  };

  // POS Sale Completion
  const completePosSale = async (params: {
    items: { product: Product; quantity: number }[];
    customerName?: string;
    discount: number;
    paymentMethod: 'cash' | 'gcash';
    amountTendered: number;
  }): Promise<Order> => {
    const orderItems: OrderItem[] = params.items.map(({ product, quantity }) => ({
      productId: product.id,
      name: product.name,
      size: product.size || 'Free Size',
      price: product.sellingPrice,
      costPrice: product.costPrice || 0,
      quantity,
      imageUrl: product.imageUrl,
      baleCode: product.baleCode,
    }));

    const rawTotal = params.items.reduce(
      (sum, { product, quantity }) => sum + product.sellingPrice * quantity,
      0
    );
    const totalAmount = Math.max(0, rawTotal - params.discount);
    const changeAmount = Math.max(0, params.amountTendered - totalAmount);

    const id = `pos_${Date.now()}`;
    const orderNumber = `POS-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder: Order = {
      id,
      orderNumber,
      customerName: params.customerName || 'Walk-in Customer',
      contactNumber: 'N/A',
      email: 'pos@exins.shop',
      address: 'In-store Purchase (EXINS Jksur+ Novaliches QC)',
      items: orderItems,
      totalAmount,
      paymentType: 'pay_now',
      downPaymentAmount: 0,
      remainingBalance: 0,
      status: 'completed',
      orderSource: 'pos',
      discount: params.discount,
      amountTendered: params.amountTendered,
      changeAmount,
      paymentMethod: params.paymentMethod,
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Deduct inventory
    params.items.forEach(({ product, quantity }) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === product.id) {
            const newQty = Math.max(0, p.availableQuantity - quantity);
            updateProduct(p.id, { availableQuantity: newQty });
            return { ...p, availableQuantity: newQty };
          }
          return p;
        })
      );

      // Increment bale sales
      if (product.baleCode) {
        setBales((prev) =>
          prev.map((b) => {
            if (b.baleCode === product.baleCode) {
              const itemTotal = product.sellingPrice * quantity;
              const newSales = (b.totalSalesMade || 0) + itemTotal;
              updateBale(b.id, { totalSalesMade: newSales });
              return { ...b, totalSalesMade: newSales };
            }
            return b;
          })
        );
      }

      // Log sold
      logItemStatus({
        productId: product.id,
        productName: product.name,
        type: 'sold',
        quantity,
        notes: `POS transaction #${orderNumber}`,
        adjustStock: false,
      });
    });

    // Record inflow transaction in Finance
    const txId = `tx_${Date.now()}`;
    const newTx: Transaction = {
      id: txId,
      date: new Date().toISOString().split('T')[0],
      flowType: 'inflow',
      category: 'POS Sales',
      account: 'Store Counter Sales',
      description: `POS counter sale #${orderNumber} (${params.customerName || 'Walk-in'})`,
      paymentMethod: params.paymentMethod,
      inflow: totalAmount,
      outflow: 0,
      orderId: id,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);

    try {
      await setDoc(doc(db, 'orders', id), newOrder);
      await setDoc(doc(db, 'transactions', txId), newTx);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `orders/${id}`);
    }

    return newOrder;
  };

  // Item status logging (Sold, Returned, Damaged, Lost)
  const logItemStatus = async (params: {
    productId: string;
    productName: string;
    type: 'sold' | 'returned' | 'damaged' | 'lost';
    quantity: number;
    notes?: string;
    adjustStock?: boolean;
  }) => {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newLog: ItemStatusLog = {
      id,
      productId: params.productId,
      productName: params.productName,
      type: params.type,
      quantity: params.quantity,
      date: new Date().toISOString().split('T')[0],
      notes: params.notes,
      createdAt: new Date().toISOString(),
    };

    setItemStatusLogs((prev) => [newLog, ...prev]);

    try {
      await setDoc(doc(db, 'item_logs', id), cleanFirestoreData(newLog));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `item_logs/${id}`);
    }

    // If stock adjustment is requested
    if (params.adjustStock) {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === params.productId) {
            let newQty = p.availableQuantity;
            if (params.type === 'returned') {
              newQty += params.quantity;
            } else if (params.type === 'damaged' || params.type === 'lost') {
              newQty = Math.max(0, newQty - params.quantity);
            }
            updateProduct(p.id, { availableQuantity: newQty });
            return { ...p, availableQuantity: newQty };
          }
          return p;
        })
      );
    }
  };

  // Update Item Status Log (e.g. mark lost item as found, update notes, restore stock)
  const updateItemStatusLog = async (
    id: string,
    updates: Partial<ItemStatusLog>,
    options?: {
      restoreStock?: boolean;
      productId?: string;
      quantityToRestore?: number;
    }
  ) => {
    setItemStatusLogs((prev) =>
      prev.map((log) => (log.id === id ? { ...log, ...updates } : log))
    );

    try {
      await updateDoc(doc(db, 'item_logs', id), cleanFirestoreData(updates));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `item_logs/${id}`);
    }

    if (
      options?.restoreStock &&
      options?.productId &&
      options?.quantityToRestore &&
      options.quantityToRestore > 0
    ) {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === options.productId) {
            const restored = (p.availableQuantity || 0) + options.quantityToRestore!;
            updateProduct(p.id, { availableQuantity: restored });
            return { ...p, availableQuantity: restored };
          }
          return p;
        })
      );
    }
  };

  const deleteItemStatusLog = async (id: string) => {
    setItemStatusLogs((prev) => prev.filter((log) => log.id !== id));
    try {
      await deleteDoc(doc(db, 'item_logs', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `item_logs/${id}`);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        currentUser,
        customers,
        loginAs,
        signupAs,
        loginWithGoogleFast,
        completeGoogleSignUp,
        logout,
        bales,
        categories,
        products,
        suppliers,
        expenseAccounts,
        expenses,
        orders,
        transactions,
        itemStatusLogs,
        cart,
        addToCart,
        updateCartQuantity,
        toggleCartItemSelect,
        toggleSelectAllCart,
        removeFromCart,
        clearSelectedCart,
        cartNotification,
        clearCartNotification,
        addBale,
        updateBale,
        deleteBale,
        addCategory,
        updateCategory,
        deleteCategory,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductBarcodeStatus,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addExpenseAccount,
        updateExpenseAccount,
        deleteExpenseAccount,
        addExpense,
        deleteExpense,
        addTransaction,
        deleteTransaction,
        createOrder,
        updateOrderStatus,
        cancelOrder,
        completePosSale,
        logItemStatus,
        updateItemStatusLog,
        deleteItemStatusLog,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
