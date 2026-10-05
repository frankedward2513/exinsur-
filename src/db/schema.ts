import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('displayName'),
  role: text('role').default('customer'),
  phone: text('phone'),
  address: text('address'),
  createdAt: timestamp('createdAt').defaultNow(),
});

export const bales = pgTable('bales', {
  id: text('id').primaryKey(),
  baleCode: text('baleCode').notNull(),
  baleName: text('baleName'),
  supplierId: text('supplierId'),
  supplierName: text('supplierName'),
  cost: doublePrecision('cost').notNull().default(0),
  totalPurchasePrice: doublePrecision('totalPurchasePrice').default(0),
  quantityPurchase: integer('quantityPurchase').default(0),
  pricePerPiece: doublePrecision('pricePerPiece').default(0),
  description: text('description'),
  status: text('status').default('sealed'),
  totalSalesMade: doublePrecision('totalSalesMade').notNull().default(0),
  targetProfit: doublePrecision('targetProfit').default(0),
  category: text('category'),
  isFullySold: boolean('isFullySold').default(false),
  createdAt: text('createdAt'),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#f97316'),
  targetProfitMargin: doublePrecision('targetProfitMargin').default(0),
  totalInStock: integer('totalInStock').default(0),
  createdAt: text('createdAt'),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  baleId: text('baleId'),
  baleCode: text('baleCode'),
  baleName: text('baleName'),
  category: text('category').notNull(),
  name: text('name').notNull(),
  costPrice: doublePrecision('costPrice').default(0),
  sellingPrice: doublePrecision('sellingPrice').notNull().default(0),
  profitMargin: doublePrecision('profitMargin').default(0),
  availableQuantity: integer('availableQuantity').notNull().default(0),
  size: text('size'),
  description: text('description'),
  barcode: text('barcode'),
  barcodeStatus: text('barcodeStatus').default('new'),
  imageUrl: text('imageUrl'),
  productLink: text('productLink'),
  dateAdded: text('dateAdded'),
  createdAt: text('createdAt'),
});

export const suppliers = pgTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contactPerson: text('contactPerson'),
  email: text('email'),
  phone: text('phone'),
  contactNumber: text('contactNumber'),
  address: text('address'),
  description: text('description'),
  totalBalesSourced: integer('totalBalesSourced').default(0),
  paymentTerms: text('paymentTerms'),
  createdAt: text('createdAt'),
});

export const expenseAccounts = pgTable('expense_accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  budget: doublePrecision('budget').default(0),
  monthlyBudget: doublePrecision('monthlyBudget').default(0),
  totalSpent: doublePrecision('totalSpent').default(0),
  color: text('color').default('#f97316'),
  createdAt: text('createdAt'),
});

export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  accountId: text('accountId'),
  accountName: text('accountName'),
  amount: doublePrecision('amount').notNull().default(0),
  description: text('description'),
  date: text('date'),
  paymentMethod: text('paymentMethod').default('cash'),
  receiptUrl: text('receiptUrl'),
  createdAt: text('createdAt'),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('orderNumber').notNull(),
  userId: text('userId'),
  customerName: text('customerName').notNull(),
  contactNumber: text('contactNumber'),
  email: text('email'),
  address: text('address'),
  items: jsonb('items').notNull(),
  totalAmount: doublePrecision('totalAmount').notNull().default(0),
  paymentType: text('paymentType').default('pay_now'),
  downPaymentAmount: doublePrecision('downPaymentAmount').default(0),
  remainingBalance: doublePrecision('remainingBalance').default(0),
  receiptUrl: text('receiptUrl'),
  courier: text('courier').default('jnt'),
  shippingNote: text('shippingNote'),
  status: text('status').default('pending'),
  orderSource: text('orderSource').default('online'),
  discount: doublePrecision('discount').default(0),
  amountTendered: doublePrecision('amountTendered').default(0),
  changeAmount: doublePrecision('changeAmount').default(0),
  paymentMethod: text('paymentMethod').default('cash'),
  createdAt: text('createdAt'),
  updatedAt: text('updatedAt'),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  flowType: text('flowType').notNull(),
  category: text('category').notNull(),
  account: text('account').notNull(),
  description: text('description').notNull(),
  paymentMethod: text('paymentMethod').default('cash'),
  inflow: doublePrecision('inflow').default(0),
  outflow: doublePrecision('outflow').default(0),
  orderId: text('orderId'),
  expenseId: text('expenseId'),
  createdAt: text('createdAt'),
});

export const itemLogs = pgTable('item_logs', {
  id: text('id').primaryKey(),
  productId: text('productId').notNull(),
  productName: text('productName').notNull(),
  type: text('type').notNull(),
  quantity: integer('quantity').notNull().default(1),
  date: text('date'),
  notes: text('notes'),
  createdAt: text('createdAt'),
});

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  uid: text('uid'),
  email: text('email'),
  displayName: text('displayName'),
  phone: text('phone'),
  address: text('address'),
  role: text('role').default('customer'),
  provider: text('provider').default('email'),
  isGuest: boolean('isGuest').default(false),
  createdAt: text('createdAt'),
});
