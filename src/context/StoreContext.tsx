import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "./utils/supabase";
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

// Helper to clean undefined values deeply to prevent database insertion errors
export function cleanData<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => (item !== null && typeof item === 'object' ? cleanData(item) : item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = value !== null && typeof value === 'object' ? cleanData(value) : value;
      }
    }
    return cleaned as T;
  }
  return data;
}

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

  // Supabase RLS Diagnostics & Sync
  rlsBlocked: boolean;
  rlsErrorInfo: { table: string; message: string } | null;
  dismissRlsWarning: () => void;
  showRlsModal: boolean;
  setShowRlsModal: (show: boolean) => void;
  syncLocalToSupabase: () => Promise<{ success: boolean; count: number; error?: string }>;
  
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
  formAlert: string | null;
  showFormAlert: (message?: string) => void;
  clearFormAlert: () => void;

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

// Strict Authorized Credentials:
// ONLY Admin: villotafrankedward@gmail.com / 12345678
// ONLY Staff: frankvillota905@gmail.com / 12345678
// EVERY other sign-up/account is strictly a customer to prevent unauthorized access.
export const ADMIN_EMAIL = 'villotafrankedward@gmail.com';
export const ADMIN_PASSWORD = '12345678';
export const STAFF_EMAIL = 'frankvillota905@gmail.com';
export const STAFF_PASSWORD = '12345678';

// Helper for deterministic roles
export function determineRole(email: string): UserRole {
  const normalized = email.trim().toLowerCase();
  if (normalized === ADMIN_EMAIL) {
    return 'owner';
  }
  if (normalized === STAFF_EMAIL) {
    return 'staff';
  }
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
          const normalized = parsed.email.toLowerCase().trim();
          // STRICT ACCESS LIMIT:
          // Admin is ONLY villotafrankedward@gmail.com
          // Staff is ONLY frankvillota905@gmail.com
          // All other accounts are strictly customers
          if (normalized === ADMIN_EMAIL) {
            parsed.role = 'owner';
            parsed.displayName = parsed.displayName || 'Frank Edward Villota (Admin)';
          } else if (normalized === STAFF_EMAIL) {
            parsed.role = 'staff';
            parsed.displayName = parsed.displayName || 'Staff (Frank Villota)';
          } else {
            parsed.role = 'customer';
          }
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

    const isAdmin = normalized === ADMIN_EMAIL;
    const isStaff = normalized === STAFF_EMAIL;

    // 1. Strict Admin Authentication (villotafrankedward@gmail.com / 12345678)
    if (isAdmin) {
      if (pwd !== ADMIN_PASSWORD) {
        throw new Error('Incorrect password for Admin account.');
      }
      const adminUser: UserProfile = {
        uid: 'admin-villotafrankedward',
        email: normalized,
        displayName: 'Frank Edward Villota (Admin)',
        role: 'owner',
        isGuest: false,
        provider: 'email',
      };
      // Auto-provision or sign in to Supabase Auth so session token is present
      try {
        const { error: supaErr } = await supabase.auth.signInWithPassword({
          email: normalized,
          password: pwd,
        });
        if (supaErr && supaErr.message.toLowerCase().includes('invalid')) {
          await supabase.auth.signUp({
            email: normalized,
            password: pwd,
            options: {
              data: {
                full_name: 'Frank Edward Villota (Admin)',
                role: 'owner',
              },
            },
          });
        }
      } catch {}

      setCurrentUser(adminUser);
      localStorage.setItem('exins_user', JSON.stringify(adminUser));
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData(adminUser)),
      }).catch(() => {});
      return true;
    }

    // 2. Strict Staff Authentication (frankvillota905@gmail.com / 12345678)
    if (isStaff) {
      if (pwd !== STAFF_PASSWORD) {
        throw new Error('Incorrect password for Staff account.');
      }
      const staffUser: UserProfile = {
        uid: 'staff-frankvillota905',
        email: normalized,
        displayName: 'Staff (Frank Villota)',
        role: 'staff',
        isGuest: false,
        provider: 'email',
      };
      // Auto-provision or sign in to Supabase Auth so session token is present
      try {
        const { error: supaErr } = await supabase.auth.signInWithPassword({
          email: normalized,
          password: pwd,
        });
        if (supaErr && supaErr.message.toLowerCase().includes('invalid')) {
          await supabase.auth.signUp({
            email: normalized,
            password: pwd,
            options: {
              data: {
                full_name: 'Staff (Frank Villota)',
                role: 'staff',
              },
            },
          });
        }
      } catch {}

      setCurrentUser(staffUser);
      localStorage.setItem('exins_user', JSON.stringify(staffUser));
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData(staffUser)),
      }).catch(() => {});
      return true;
    }

    // 3. For ALL other accounts:
    // They are strictly customers and cannot access Admin or Staff views
    if (pwd) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalized,
          password: pwd,
        });

        if (!authError && authData?.user) {
          const u = authData.user;
          const userProfile: UserProfile = {
            uid: u.id,
            email: u.email || normalized,
            displayName: u.user_metadata?.full_name || u.user_metadata?.name || normalized.split('@')[0],
            role: 'customer', // strictly customer
            phone: u.user_metadata?.phone || '',
            address: u.user_metadata?.address || '',
            isGuest: false,
            provider: (u.app_metadata?.provider as any) || 'email',
          };
          setCurrentUser(userProfile);
          localStorage.setItem('exins_user', JSON.stringify(userProfile));
          fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanData(userProfile)),
          }).catch(() => {});
          return true;
        }

        if (authError) {
          const existingCust = customers.find((c) => c.email.toLowerCase() === normalized);
          if (existingCust) {
            const userProfile: UserProfile = {
              ...existingCust,
              role: 'customer',
              isGuest: false,
            };
            setCurrentUser(userProfile);
            localStorage.setItem('exins_user', JSON.stringify(userProfile));
            fetch('/api/users/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(cleanData(userProfile)),
            }).catch(() => {});
            return true;
          }
          throw new Error(authError.message || 'Invalid email or password.');
        }
      } catch (err: any) {
        throw err;
      }
    }

    // 4. Customer fallback
    const existing = customers.find((c) => c.email.toLowerCase() === normalized);
    const customerUser: UserProfile = existing
      ? { ...existing, role: 'customer', isGuest: false }
      : {
          uid: `cust_${Date.now()}`,
          email: normalized,
          displayName: normalized.includes('@') ? normalized.split('@')[0] : 'Customer',
          role: 'customer',
          isGuest: false,
          provider: 'email',
        };
    setCurrentUser(customerUser);
    localStorage.setItem('exins_user', JSON.stringify(customerUser));
    fetch('/api/users/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanData(customerUser)),
    }).catch(() => {});
    return true;
  };

  const signupAs = async (
    nameOrParams: string | SignUpParams,
    emailArg?: string,
    passwordArg?: string,
    phoneArg?: string,
    addressArg?: string
  ): Promise<boolean> => {
    let name = '';
    let email = '';
    let password = '';
    let phone = '';
    let address = '';
    let provider: 'email' | 'google' = 'email';
    let uid = '';

    if (typeof nameOrParams === 'object') {
      name = nameOrParams.name;
      email = nameOrParams.email;
      password = nameOrParams.password || '';
      phone = nameOrParams.phone || '';
      address = nameOrParams.address || '';
      provider = nameOrParams.provider || 'email';
      uid = nameOrParams.uid || '';
    } else {
      name = nameOrParams;
      email = emailArg || '';
      password = passwordArg || '';
      phone = phoneArg || '';
      address = addressArg || '';
    }

    const normalized = email.trim().toLowerCase();
    if (normalized === ADMIN_EMAIL || normalized === STAFF_EMAIL) {
      throw new Error(
        'This administrative or staff account already exists. Please use Sign In with your authorized password.'
      );
    }

    let realUid = uid;

    // 1. Register with real Supabase Auth as customer
    if (normalized && password) {
      try {
        const { data: signData, error: signError } = await supabase.auth.signUp({
          email: normalized,
          password: password,
          options: {
            data: {
              full_name: name.trim(),
              name: name.trim(),
              phone: phone.trim(),
              address: address.trim(),
              role: 'customer',
            },
          },
        });

        if (signData?.user?.id) {
          realUid = signData.user.id;
        } else if (signError) {
          console.warn('Supabase Auth signUp:', signError.message);
          if (signError.message.toLowerCase().includes('already registered')) {
            const { data: signInData } = await supabase.auth.signInWithPassword({
              email: normalized,
              password,
            });
            if (signInData?.user?.id) {
              realUid = signInData.user.id;
            }
          }
        }
      } catch (authErr: any) {
        console.warn('Supabase auth signup notice:', authErr?.message || authErr);
      }
    }

    const customerUid = realUid || uid || `cust_${Date.now()}`;
    const customerUser: UserProfile = {
      uid: customerUid,
      email: normalized,
      displayName: name.trim() || (normalized.includes('@') ? normalized.split('@')[0] : 'Customer'),
      phone: phone.trim(),
      address: address.trim(),
      role: 'customer', // strictly customer
      provider,
      isGuest: false,
      createdAt: new Date().toISOString(),
    };

    setCurrentUser(customerUser);
    localStorage.setItem('exins_user', JSON.stringify(customerUser));
    setCustomers((prev) => {
      const updated = [customerUser, ...prev.filter((c) => c.uid !== customerUid)];
      localStorage.setItem('exins_customers', JSON.stringify(updated));
      return updated;
    });

    // Save to Supabase & Cloud SQL customers and users tables
    try {
      await supabase.from('customers').upsert(cleanData({ ...customerUser, id: customerUid }));
      fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData({ ...customerUser, id: customerUid })),
      }).catch(() => {});
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData({
          uid: customerUid,
          email: normalized,
          displayName: customerUser.displayName,
          role: 'customer',
          phone: customerUser.phone,
          address: customerUser.address,
        })),
      }).catch(() => {});
    } catch {}

    return true;
  };

  const loginWithGoogleFast = async (): Promise<GoogleFastResult> => {
    try {
      // 1. Check if Supabase session exists
      const { data: sessionData } = await supabase.auth.getSession();
      const currentAuthUser = sessionData?.session?.user;

      let email = currentAuthUser?.email?.trim().toLowerCase() || '';
      let displayName =
        currentAuthUser?.user_metadata?.full_name ||
        currentAuthUser?.user_metadata?.name ||
        'Customer';
      let uid = currentAuthUser?.id || '';

      if (!email) {
        // Trigger Supabase OAuth sign-in flow
        try {
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
            },
          });
        } catch {
          // In iframe environments, popup might be blocked
        }
      }

      // Check if session became available after OAuth call
      if (!email) {
        const { data: updatedSession } = await supabase.auth.getSession();
        if (updatedSession?.session?.user) {
          email = updatedSession.session.user.email?.trim().toLowerCase() || '';
          displayName =
            updatedSession.session.user.user_metadata?.full_name ||
            updatedSession.session.user.user_metadata?.name ||
            'Customer';
          uid = updatedSession.session.user.id;
        }
      }

      if (!email) {
        throw new Error(
          'Google Sign-In popup was opened or blocked by browser settings. Please use the direct Sign In / Sign Up form with your email and password.'
        );
      }

      // STRICT SECURITY: Admin and Staff MUST provide their authorized password (12345678).
      // They cannot bypass credentials via Google Fast Login.
      if (email === ADMIN_EMAIL || email === STAFF_EMAIL) {
        throw new Error(
          'Administrative and Staff accounts must sign in using the Sign In tab with their authorized password (12345678) to ensure system security.'
        );
      }

      // ALL other Google sign-ups / logins are strictly CUSTOMERS
      const existing = customers.find((c) => c.email.toLowerCase() === email || c.uid === uid);
      if (existing && existing.phone && existing.address) {
        const fullCustomer: UserProfile = {
          ...existing,
          role: 'customer', // strictly customer
          isGuest: false,
        };
        setCurrentUser(fullCustomer);
        localStorage.setItem('exins_user', JSON.stringify(fullCustomer));
        // Sync user to Cloud SQL
        fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullCustomer),
        }).catch(() => {});
        return { needsDetails: false, userProfile: fullCustomer };
      }

      // If missing phone or address, prompt for full name, phone and delivery address
      return {
        needsDetails: true,
        googleUser: {
          uid: uid || `goog_${Date.now()}`,
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

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setCurrentUser(GUEST_USER);
    localStorage.removeItem('exins_user');
  };

  // Supabase RLS state
  const [rlsBlocked, setRlsBlocked] = useState<boolean>(false);
  const [rlsErrorInfo, setRlsErrorInfo] = useState<{ table: string; message: string } | null>(null);
  const [showRlsModal, setShowRlsModal] = useState<boolean>(false);
  const dismissRlsWarning = () => setRlsBlocked(false);

  // Helper function to safely read cached local array
  const loadLocalCache = <T,>(key: string): T[] => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  // State collections initialized with local storage cache so pending RLS items remain accessible
  const [customers, setCustomers] = useState<UserProfile[]>(() => loadLocalCache<UserProfile>('exins_customers'));
  const [bales, setBales] = useState<Bale[]>(() => loadLocalCache<Bale>('exins_bales'));
  const [categories, setCategories] = useState<Category[]>(() => loadLocalCache<Category>('exins_categories'));
  const [products, setProducts] = useState<Product[]>(() => loadLocalCache<Product>('exins_products'));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadLocalCache<Supplier>('exins_suppliers'));
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>(() => loadLocalCache<ExpenseAccount>('exins_expense_accounts'));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadLocalCache<Expense>('exins_expenses'));
  const [orders, setOrders] = useState<Order[]>(() => loadLocalCache<Order>('exins_orders'));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadLocalCache<Transaction>('exins_transactions'));
  const [itemStatusLogs, setItemStatusLogs] = useState<ItemStatusLog[]>(() => loadLocalCache<ItemStatusLog>('exins_item_logs'));

  // Sync local data to Supabase
  const syncLocalToSupabase = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    let syncedCount = 0;
    try {
      const tablePairs: Array<{ table: string; items: any[] }> = [
        { table: 'bales', items: bales },
        { table: 'categories', items: categories },
        { table: 'products', items: products },
        { table: 'suppliers', items: suppliers },
        { table: 'expense_accounts', items: expenseAccounts },
        { table: 'expenses', items: expenses },
        { table: 'orders', items: orders },
        { table: 'transactions', items: transactions },
        { table: 'item_logs', items: itemStatusLogs },
        { table: 'customers', items: customers },
      ];

      for (const pair of tablePairs) {
        const endpoint = pair.table.replace('_', '-');
        for (const item of pair.items) {
          fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cleanData(item)),
          }).catch(() => {});
          const res = await supabase.from(pair.table).upsert(cleanData(item));
          if (!res.error) {
            syncedCount++;
          } else if (res.error.code === '42501' || res.error.message.includes('row-level security')) {
            setRlsBlocked(true);
            setRlsErrorInfo({ table: pair.table, message: res.error.message });
            return { success: false, count: syncedCount, error: res.error.message };
          }
        }
      }
      setRlsBlocked(false);
      setRlsErrorInfo(null);
      return { success: true, count: syncedCount };
    } catch (err: any) {
      return { success: false, count: syncedCount, error: err?.message || 'Sync failed' };
    }
  };

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('exins_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [cartNotification, setCartNotification] = useState<string | null>(null);
  const clearCartNotification = () => setCartNotification(null);

  const [formAlert, setFormAlert] = useState<string | null>(null);
  const showFormAlert = (message = 'You have been successfully submitted the form!') => {
    setFormAlert(message);
  };
  const clearFormAlert = () => setFormAlert(null);

  useEffect(() => {
    if (formAlert) {
      const timer = setTimeout(() => {
        setFormAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [formAlert]);

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

  // Listen to Supabase auth state changes to automatically receive the real authenticated user
  useEffect(() => {
    const handleAuthUser = (user: any) => {
      if (!user) return;
      const normalized = (user.email || '').toLowerCase().trim();
      const isAdmin = normalized === ADMIN_EMAIL;
      const isStaff = normalized === STAFF_EMAIL;

      // Strictly limit roles: ONLY Admin can be owner, ONLY Staff can be staff.
      // Everyone else is strictly customer.
      const role: UserRole = isAdmin ? 'owner' : isStaff ? 'staff' : 'customer';
      const displayName = isAdmin
        ? 'Frank Edward Villota (Admin)'
        : isStaff
        ? 'Staff (Frank Villota)'
        : user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email?.split('@')[0] || 'Customer');

      const userProfile: UserProfile = {
        uid: user.id,
        email: user.email || '',
        displayName,
        role,
        phone: user.user_metadata?.phone || '',
        address: user.user_metadata?.address || '',
        isGuest: false,
        provider: (user.app_metadata?.provider as any) || 'email',
      };
      setCurrentUser(userProfile);
      localStorage.setItem('exins_user', JSON.stringify(userProfile));
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleAuthUser(session.user);
      }
    });

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        handleAuthUser(session.user);
      } else if (_event === 'SIGNED_OUT') {
        setCurrentUser(GUEST_USER);
        localStorage.removeItem('exins_user');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Real-time sync & data loading on startup - connects with Cloud SQL (PostgreSQL) and Supabase
  useEffect(() => {
    const syncTable = async <T,>(
      tableName: string,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      cacheKey: string
    ) => {
      const apiEndpoint = tableName.replace('_', '-');
      let loadedData: T[] | null = null;

      // 1. Query Cloud SQL relational backend
      try {
        const apiRes = await fetch(`/api/${apiEndpoint}`);
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (Array.isArray(apiJson) && apiJson.length > 0) {
            loadedData = apiJson as T[];
          }
        }
      } catch (err) {
        console.warn(`Cloud SQL fetch note for ${tableName}:`, err);
      }

      // 2. Query Supabase
      try {
        const { data, error } = await supabase.from(tableName).select('*');
        if (!error && Array.isArray(data)) {
          if (data.length > 0) {
            if (!loadedData || loadedData.length === 0) {
              loadedData = data as T[];
              // Sync to Cloud SQL in background
              data.forEach((it: any) => {
                fetch(`/api/${apiEndpoint}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(cleanData(it)),
                }).catch(() => {});
              });
            }
          }
        } else if (error) {
          console.warn(`Supabase sync note for ${tableName}:`, error.message);
          if (
            error.code === '42501' ||
            error.message.toLowerCase().includes('row-level security') ||
            error.message.toLowerCase().includes('permission denied')
          ) {
            setRlsBlocked(true);
            setRlsErrorInfo({ table: tableName, message: error.message });
          }
        }
      } catch (e: any) {
        console.warn(`Supabase sync note for ${tableName}:`, e?.message || e);
      }

      // 3. Fallback to localStorage or save loaded data
      if (loadedData && loadedData.length > 0) {
        setter(loadedData);
        localStorage.setItem(cacheKey, JSON.stringify(loadedData));
      } else {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setter(parsed as T[]);
              parsed.forEach((it: any) => {
                fetch(`/api/${apiEndpoint}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(cleanData(it)),
                }).catch(() => {});
                Promise.resolve(supabase.from(tableName).upsert(cleanData(it))).catch(() => {});
              });
              return;
            }
          } catch {}
        }
        setter([]);
      }
    };

    const syncMap: Record<string, () => Promise<void>> = {
      bales: () => syncTable('bales', setBales, 'exins_bales'),
      categories: () => syncTable('categories', setCategories, 'exins_categories'),
      products: () => syncTable('products', setProducts, 'exins_products'),
      suppliers: () => syncTable('suppliers', setSuppliers, 'exins_suppliers'),
      expense_accounts: () => syncTable('expense_accounts', setExpenseAccounts, 'exins_expense_accounts'),
      expenses: () => syncTable('expenses', setExpenses, 'exins_expenses'),
      orders: () => syncTable('orders', setOrders, 'exins_orders'),
      transactions: () => syncTable('transactions', setTransactions, 'exins_transactions'),
      item_logs: () => syncTable('item_logs', setItemStatusLogs, 'exins_item_logs'),
      customers: () => syncTable('customers', setCustomers, 'exins_customers'),
    };

    // Initial load for all tables
    Object.values(syncMap).forEach((fn) => fn());

    // 1. Live Server-Sent Events (SSE) from Cloud SQL (PostgreSQL) backend
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'db_change' && payload?.table && syncMap[payload.table]) {
            syncMap[payload.table]();
          }
        } catch {}
      };
    } catch (e) {
      console.warn('SSE connection note:', e);
    }

    // 2. Realtime WebSocket subscription from Supabase
    const channel = supabase
      .channel('public:exins-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bales' }, () => syncMap.bales?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => syncMap.categories?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => syncMap.products?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => syncMap.suppliers?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_accounts' }, () => syncMap.expense_accounts?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => syncMap.expenses?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => syncMap.orders?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => syncMap.transactions?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_logs' }, () => syncMap.item_logs?.())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => syncMap.customers?.())
      .subscribe();

    // 3. Tab focus & visibility change listener (ensures fresh data when device wakes or tab is activated)
    const syncAll = () => {
      Object.values(syncMap).forEach((fn) => fn());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAll();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', syncAll);

    // 4. Periodic heartbeat sync (every 12 seconds) for guaranteed cross-device consistency
    const intervalId = setInterval(syncAll, 12000);

    return () => {
      supabase.removeChannel(channel);
      if (eventSource) eventSource.close();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', syncAll);
      clearInterval(intervalId);
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

  // Ensure customer's placed orders are indexed in localStorage for fast, resilient "My Orders" lookup
  useEffect(() => {
    if (currentUser && !currentUser.isGuest && currentUser.role === 'customer' && orders.length > 0) {
      try {
        const placed: string[] = JSON.parse(localStorage.getItem('exins_placed_orders') || '[]');
        const uEmail = (currentUser.email || '').toLowerCase().trim();
        const uPhone = (currentUser.phone || '').replace(/\D/g, '').slice(-10);
        const uUid = (currentUser.uid || '').trim();

        let updated = false;
        orders.forEach((o) => {
          const matchUid = uUid && o.userId === uUid;
          const matchEmail = uEmail && o.email && o.email.toLowerCase().trim() === uEmail;
          const matchPhone =
            uPhone &&
            uPhone.length >= 7 &&
            o.contactNumber &&
            o.contactNumber.replace(/\D/g, '').slice(-10) === uPhone;

          if ((matchUid || matchEmail || matchPhone) && !placed.includes(o.id)) {
            placed.push(o.id);
            updated = true;
          }
        });

        if (updated) {
          localStorage.setItem('exins_placed_orders', JSON.stringify(placed));
        }
      } catch {
        // ignore
      }
    }
  }, [currentUser, orders]);

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

  // Helper to execute database operations across Cloud SQL (PostgreSQL) and Supabase
  const executeSupabaseOperation = async (
    tableName: string,
    op: () => PromiseLike<any>,
    apiAction?: { method: 'POST' | 'PATCH' | 'DELETE'; id?: string; data?: any }
  ) => {
    if (apiAction) {
      const endpoint = tableName.replace('_', '-');
      const url = apiAction.id && apiAction.method !== 'POST' ? `/api/${endpoint}/${apiAction.id}` : `/api/${endpoint}`;
      fetch(url, {
        method: apiAction.method,
        headers: { 'Content-Type': 'application/json' },
        body: apiAction.data ? JSON.stringify(cleanData(apiAction.data)) : undefined,
      }).catch((e) => console.warn(`Cloud SQL /api/${endpoint} note:`, e));
    }

    try {
      const res = await op();
      if (res?.error) {
        console.warn(`Supabase ${tableName} note:`, res.error);
        if (
          res.error.code === '42501' ||
          res.error.message?.toLowerCase().includes('row-level security') ||
          res.error.message?.toLowerCase().includes('permission denied')
        ) {
          setRlsBlocked(true);
          setRlsErrorInfo({ table: tableName, message: res.error.message });
        }
      }
      return res;
    } catch (e: any) {
      console.warn(`Supabase ${tableName} exception:`, e);
      return null;
    }
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
    await executeSupabaseOperation('bales', () => supabase.from('bales').upsert(cleanData(newBale)), { method: 'POST', data: newBale });
  };

  const updateBale = async (id: string, updates: Partial<Bale>) => {
    setBales((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    await executeSupabaseOperation('bales', () => supabase.from('bales').update(cleanData(updates)).eq('id', id), { method: 'PATCH', id, data: updates });
  };

  const deleteBale = async (id: string) => {
    setBales((prev) => prev.filter((b) => b.id !== id));
    await executeSupabaseOperation('bales', () => supabase.from('bales').delete().eq('id', id), { method: 'DELETE', id });
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
    await executeSupabaseOperation('categories', () => supabase.from('categories').upsert(cleanData(newCat)), { method: 'POST', data: newCat });
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    await executeSupabaseOperation('categories', () => supabase.from('categories').update(cleanData(updates)).eq('id', id), { method: 'PATCH', id, data: updates });
  };

  const deleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await executeSupabaseOperation('categories', () => supabase.from('categories').delete().eq('id', id), { method: 'DELETE', id });
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
    await executeSupabaseOperation('products', () => supabase.from('products').upsert(cleanData(newProd)), { method: 'POST', data: newProd });
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    await executeSupabaseOperation('products', () => supabase.from('products').update(cleanData(updates)).eq('id', id), { method: 'PATCH', id, data: updates });
  };

  const deleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    await executeSupabaseOperation('products', () => supabase.from('products').delete().eq('id', id), { method: 'DELETE', id });
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
    await executeSupabaseOperation('suppliers', () => supabase.from('suppliers').upsert(cleanData(newSupp)), { method: 'POST', data: newSupp });
  };

  const updateSupplier = async (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    await executeSupabaseOperation('suppliers', () => supabase.from('suppliers').update(cleanData(updates)).eq('id', id), { method: 'PATCH', id, data: updates });
  };

  const deleteSupplier = async (id: string) => {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    await executeSupabaseOperation('suppliers', () => supabase.from('suppliers').delete().eq('id', id), { method: 'DELETE', id });
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
    await executeSupabaseOperation('expense_accounts', () => supabase.from('expense_accounts').upsert(cleanData(newAcc)), { method: 'POST', data: newAcc });
  };

  const updateExpenseAccount = async (id: string, updates: Partial<ExpenseAccount>) => {
    setExpenseAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    await executeSupabaseOperation('expense_accounts', () => supabase.from('expense_accounts').update(cleanData(updates)).eq('id', id), { method: 'PATCH', id, data: updates });
  };

  const deleteExpenseAccount = async (id: string) => {
    setExpenseAccounts((prev) => prev.filter((a) => a.id !== id));
    await executeSupabaseOperation('expense_accounts', () => supabase.from('expense_accounts').delete().eq('id', id), { method: 'DELETE', id });
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

    await executeSupabaseOperation('expenses', () => supabase.from('expenses').upsert(cleanData(newExp)), { method: 'POST', data: newExp });
    await executeSupabaseOperation('transactions', () => supabase.from('transactions').upsert(cleanData(newTx)), { method: 'POST', data: newTx });
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

    await executeSupabaseOperation('expenses', () => supabase.from('expenses').delete().eq('id', id), { method: 'DELETE', id });
    if (matchingTx) {
      await executeSupabaseOperation('transactions', () => supabase.from('transactions').delete().eq('id', matchingTx.id), { method: 'DELETE', id: matchingTx.id });
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
    await executeSupabaseOperation('transactions', () => supabase.from('transactions').upsert(cleanData(newTx)), { method: 'POST', data: newTx });
  };

  const deleteTransaction = async (id: string) => {
    const targetTx = transactions.find((t) => t.id === id);

    // 1. Remove from local transactions state immediately
    setTransactions((prev) => {
      const next = prev.filter((t) => t.id !== id);
      localStorage.setItem('exins_transactions', JSON.stringify(next));
      return next;
    });

    // 2. Delete transaction from Supabase & Cloud SQL
    await executeSupabaseOperation('transactions', () => supabase.from('transactions').delete().eq('id', id), { method: 'DELETE', id });

    // 3. If linked to an order, delete order
    const linkedOrderId = targetTx?.orderId;
    if (linkedOrderId) {
      setOrders((prev) => {
        const next = prev.filter((o) => o.id !== linkedOrderId);
        localStorage.setItem('exins_orders', JSON.stringify(next));
        return next;
      });
      await executeSupabaseOperation('orders', () => supabase.from('orders').delete().eq('id', linkedOrderId), { method: 'DELETE', id: linkedOrderId });
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
        await executeSupabaseOperation('orders', () => supabase.from('orders').delete().eq('id', matchedOrder.id), { method: 'DELETE', id: matchedOrder.id });
      }
    }

    // 4. If linked to an expense, delete expense
    const linkedExpenseId = targetTx?.expenseId;
    if (linkedExpenseId) {
      setExpenses((prev) => {
        const next = prev.filter((e) => e.id !== linkedExpenseId);
        localStorage.setItem('exins_expenses', JSON.stringify(next));
        return next;
      });
      await executeSupabaseOperation('expenses', () => supabase.from('expenses').delete().eq('id', linkedExpenseId), { method: 'DELETE', id: linkedExpenseId });
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
          await executeSupabaseOperation('expenses', () => supabase.from('expenses').delete().eq('id', matchedExp.id), { method: 'DELETE', id: matchedExp.id });
        }
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

    const sanitizedItems: OrderItem[] = orderData.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      size: it.size || 'Free Size',
      price: Number(it.price) || 0,
      costPrice: Number(it.costPrice) || 0,
      quantity: Number(it.quantity) || 1,
      imageUrl: it.imageUrl || '',
      baleCode: it.baleCode || '',
    }));

    const newOrder: Order = {
      ...orderData,
      id,
      orderNumber,
      userId: currentUser?.uid || (orderData as any).userId || '',
      customerName: (orderData.customerName || currentUser?.displayName || 'Customer').trim(),
      contactNumber: (orderData.contactNumber || currentUser?.phone || 'N/A').trim(),
      email: (orderData.email || currentUser?.email || 'customer@exins.shop').trim(),
      address: (orderData.address || currentUser?.address || 'Standard Delivery').trim(),
      items: sanitizedItems,
      totalAmount: Number(orderData.totalAmount) || 0,
      paymentType: orderData.paymentType || 'pay_now',
      downPaymentAmount: orderData.paymentType === 'down_payment' ? (orderData.downPaymentAmount || 100) : 0,
      remainingBalance: Number(orderData.remainingBalance) || 0,
      receiptUrl: orderData.receiptUrl || '',
      courier: orderData.courier || 'jnt',
      shippingNote: orderData.shippingNote || 'Customer shoulders shipping fee directly upon courier delivery.',
      status: 'pending',
      orderSource: 'online',
      paymentMethod: orderData.paymentMethod || 'gcash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update in-memory state and localStorage immediately
    setOrders((prev) => {
      const updated = [newOrder, ...prev.filter((o) => o.id !== id)];
      localStorage.setItem('exins_orders', JSON.stringify(updated));
      return updated;
    });

    // Store order id locally so customer always sees it on this device under My Orders
    try {
      const placed: string[] = JSON.parse(localStorage.getItem('exins_placed_orders') || '[]');
      if (!placed.includes(id)) {
        placed.push(id);
        localStorage.setItem('exins_placed_orders', JSON.stringify(placed));
      }
    } catch {
      // ignore
    }

    // Ensure customer info is recorded in customers collection and state so owner sees who ordered
    const custProfile: UserProfile = {
      uid: newOrder.userId || `cust_${Date.now()}`,
      email: newOrder.email,
      displayName: newOrder.customerName,
      phone: newOrder.contactNumber,
      address: newOrder.address,
      role: 'customer',
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => {
      const idx = prev.findIndex(
        (c) => c.uid === custProfile.uid || c.email.toLowerCase() === custProfile.email.toLowerCase()
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], phone: custProfile.phone, address: custProfile.address, displayName: custProfile.displayName };
        return updated;
      }
      return [custProfile, ...prev];
    });
    Promise.resolve(supabase.from('customers').upsert(cleanData(custProfile))).catch(console.warn);

    // Deduct inventory quantities and credit bale sales
    orderData.items.forEach((item) => {
      // Deduct product stock
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === item.productId) {
            const newQty = Math.max(0, p.availableQuantity - item.quantity);
            // also trigger update in supabase
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

    await executeSupabaseOperation('orders', () => supabase.from('orders').upsert(cleanData(newOrder)), { method: 'POST', data: newOrder });
    await executeSupabaseOperation('transactions', () => supabase.from('transactions').upsert(cleanData(newTx)), { method: 'POST', data: newTx });

    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o))
    );
    await executeSupabaseOperation(
      'orders',
      () => supabase.from('orders').update(cleanData({ status, updatedAt: new Date().toISOString() })).eq('id', orderId),
      { method: 'PATCH', id: orderId, data: { status, updatedAt: new Date().toISOString() } }
    );
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

    await executeSupabaseOperation('orders', () => supabase.from('orders').upsert(cleanData(newOrder)), { method: 'POST', data: newOrder });
    await executeSupabaseOperation('transactions', () => supabase.from('transactions').upsert(cleanData(newTx)), { method: 'POST', data: newTx });

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
    await executeSupabaseOperation('item_logs', () => supabase.from('item_logs').upsert(cleanData(newLog)), { method: 'POST', data: newLog });

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

    await executeSupabaseOperation(
      'item_logs',
      () => supabase.from('item_logs').update(cleanData(updates)).eq('id', id),
      { method: 'PATCH', id, data: updates }
    );

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
    await executeSupabaseOperation('item_logs', () => supabase.from('item_logs').delete().eq('id', id), { method: 'DELETE', id });
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
        rlsBlocked,
        rlsErrorInfo,
        dismissRlsWarning,
        showRlsModal,
        setShowRlsModal,
        syncLocalToSupabase,
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
        formAlert,
        showFormAlert,
        clearFormAlert,
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
