export type UserRole = 'owner' | 'staff' | 'customer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface Bale {
  id: string;
  baleCode: string;
  baleName: string;
  category: string;
  supplierId: string;
  supplierName: string;
  totalPurchasePrice: number;
  quantityPurchase: number;
  pricePerPiece: number;
  description: string;
  status: 'sealed' | 'opened' | 'depleted';
  totalSalesMade: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  totalInStock: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  baleCode: string;
  baleName: string;
  availableQuantity: number;
  sellingPrice: number;
  costPrice: number;
  size: string;
  imageUrl: string;
  productLink: string;
  description: string;
  barcode: string;
  barcodeStatus: 'new' | 'done';
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  totalBalesSourced: number;
  createdAt: string;
}

export interface ExpenseAccount {
  id: string;
  name: string;
  monthlyBudget: number;
  description: string;
  totalSpent: number;
  color?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  accountId: string;
  accountName: string;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'gcash' | 'bank_transfer' | 'card';
  receiptUrl?: string;
  description: string;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  size: string;
  price: number;
  costPrice: number;
  quantity: number;
  imageUrl: string;
  maxStock: number;
  selected: boolean;
  baleCode?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  size: string;
  price: number;
  costPrice?: number;
  quantity: number;
  imageUrl?: string;
  baleCode?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  contactNumber: string;
  email: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  paymentType: 'pay_now' | 'down_payment';
  downPaymentAmount: number;
  remainingBalance: number;
  receiptUrl?: string;
  courier?: 'lbc' | 'lalamove' | 'jnt';
  shippingNote?: string;
  status: 'pending' | 'preparing' | 'dropped_to_courier' | 'completed' | 'cancelled';
  orderSource: 'online' | 'pos';
  discount?: number;
  amountTendered?: number;
  changeAmount?: number;
  paymentMethod?: 'cash' | 'gcash' | 'bank_transfer' | 'card';
  createdAt: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  date: string;
  flowType: 'inflow' | 'outflow';
  category: string;
  account: string;
  description: string;
  paymentMethod: 'cash' | 'gcash' | 'bank_transfer' | 'card';
  inflow: number;
  outflow: number;
  orderId?: string;
  expenseId?: string;
  createdAt: string;
}

export interface ItemStatusLog {
  id: string;
  productId: string;
  productName: string;
  type: 'sold' | 'returned' | 'damaged' | 'lost';
  quantity: number;
  date: string;
  notes?: string;
  createdAt: string;
}
