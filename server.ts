import express, { Request, Response } from 'express';
import { db } from './src/db/index.ts';
import * as schema from './src/db/schema.ts';
import { eq, desc } from 'drizzle-orm';
import { optionalAuth, requireAuth, AuthRequest } from './src/middleware/auth.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', database: 'cloudsql_postgresql' });
});

// Real-time Server-Sent Events (SSE) Hub for instant multi-device sync
const sseClients = new Set<Response>();

app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'connected', time: Date.now() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

export function broadcastDbChange(table: string, action: 'upsert' | 'update' | 'delete', id?: string) {
  const payload = `data: ${JSON.stringify({ type: 'db_change', table, action, id, time: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Users
app.post('/api/users/sync', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { uid, email, displayName, phone, address } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'uid and email required' });
    }
    const normalizedEmail = (email || '').trim().toLowerCase();
    // Strict Role Enforcement:
    // Admin is ONLY villotafrankedward@gmail.com
    // Staff is ONLY frankvillota905@gmail.com
    // Every other account is strictly customer
    let role = 'customer';
    if (normalizedEmail === 'villotafrankedward@gmail.com') {
      role = 'owner';
    } else if (normalizedEmail === 'frankvillota905@gmail.com') {
      role = 'staff';
    } else {
      role = 'customer';
    }

    const id = uid;
    const existing = await db.select().from(schema.users).where(eq(schema.users.uid, uid)).limit(1);
    if (existing.length > 0) {
      const updated = await db
        .update(schema.users)
        .set({ email: normalizedEmail, displayName, role, phone, address })
        .where(eq(schema.users.uid, uid))
        .returning();
      return res.json(updated[0]);
    } else {
      const created = await db
        .insert(schema.users)
        .values({ id, uid, email: normalizedEmail, displayName, role, phone, address })
        .returning();
      return res.json(created[0]);
    }
  } catch (error: any) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// Bales
app.get('/api/bales', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.bales).orderBy(desc(schema.bales.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get bales:', error);
    res.status(500).json({ error: 'Failed to get bales' });
  }
});

app.post('/api/bales', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const existing = await db.select().from(schema.bales).where(eq(schema.bales.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.bales).set(item).where(eq(schema.bales.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.bales).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('bales', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save bale:', error);
    res.status(500).json({ error: 'Failed to save bale' });
  }
});

app.patch('/api/bales/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.update(schema.bales).set(req.body).where(eq(schema.bales.id, id)).returning();
    broadcastDbChange('bales', 'update', id);
    res.json(updated[0] || null);
  } catch (error) {
    console.error('Failed to update bale:', error);
    res.status(500).json({ error: 'Failed to update bale' });
  }
});

app.delete('/api/bales/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(schema.bales).where(eq(schema.bales.id, id));
    broadcastDbChange('bales', 'delete', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete bale:', error);
    res.status(500).json({ error: 'Failed to delete bale' });
  }
});

// Categories
app.get('/api/categories', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.categories).orderBy(desc(schema.categories.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

app.post('/api/categories', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const existing = await db.select().from(schema.categories).where(eq(schema.categories.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.categories).set(item).where(eq(schema.categories.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.categories).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('categories', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save category:', error);
    res.status(500).json({ error: 'Failed to save category' });
  }
});

app.patch('/api/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.update(schema.categories).set(req.body).where(eq(schema.categories.id, id)).returning();
    broadcastDbChange('categories', 'update', id);
    res.json(updated[0] || null);
  } catch (error) {
    console.error('Failed to update category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(schema.categories).where(eq(schema.categories.id, id));
    broadcastDbChange('categories', 'delete', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Products
app.get('/api/products', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.products).orderBy(desc(schema.products.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const existing = await db.select().from(schema.products).where(eq(schema.products.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.products).set(item).where(eq(schema.products.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.products).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('products', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save product:', error);
    res.status(500).json({ error: 'Failed to save product' });
  }
});

app.patch('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.update(schema.products).set(req.body).where(eq(schema.products.id, id)).returning();
    broadcastDbChange('products', 'update', id);
    res.json(updated[0] || null);
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.delete('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(schema.products).where(eq(schema.products.id, id));
    broadcastDbChange('products', 'delete', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Suppliers
app.get('/api/suppliers', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.suppliers).orderBy(desc(schema.suppliers.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get suppliers:', error);
    res.status(500).json({ error: 'Failed to get suppliers' });
  }
});

app.post('/api/suppliers', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const existing = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.suppliers).set(item).where(eq(schema.suppliers.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.suppliers).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('suppliers', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save supplier:', error);
    res.status(500).json({ error: 'Failed to save supplier' });
  }
});

app.patch('/api/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.update(schema.suppliers).set(req.body).where(eq(schema.suppliers.id, id)).returning();
    broadcastDbChange('suppliers', 'update', id);
    res.json(updated[0] || null);
  } catch (error) {
    console.error('Failed to update supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

app.delete('/api/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id));
    broadcastDbChange('suppliers', 'delete', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// Expense Accounts
app.get('/api/expense-accounts', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.expenseAccounts).orderBy(desc(schema.expenseAccounts.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get expense accounts:', error);
    res.status(500).json({ error: 'Failed to get expense accounts' });
  }
});

app.post('/api/expense-accounts', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const existing = await db.select().from(schema.expenseAccounts).where(eq(schema.expenseAccounts.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.expenseAccounts).set(item).where(eq(schema.expenseAccounts.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.expenseAccounts).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('expense_accounts', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save expense account:', error);
    res.status(500).json({ error: 'Failed to save expense account' });
  }
});

app.patch('/api/expense-accounts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.update(schema.expenseAccounts).set(req.body).where(eq(schema.expenseAccounts.id, id)).returning();
    broadcastDbChange('expense_accounts', 'update', id);
    res.json(updated[0] || null);
  } catch (error) {
    console.error('Failed to update expense account:', error);
    res.status(500).json({ error: 'Failed to update expense account' });
  }
});

app.delete('/api/expense-accounts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(schema.expenseAccounts).where(eq(schema.expenseAccounts.id, id));
    broadcastDbChange('expense_accounts', 'delete', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense account:', error);
    res.status(500).json({ error: 'Failed to delete expense account' });
  }
});

// Expenses
app.get('/api/expenses', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.expenses).orderBy(desc(schema.expenses.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get expenses:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

app.post('/api/expenses', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const existing = await db.select().from(schema.expenses).where(eq(schema.expenses.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.expenses).set(item).where(eq(schema.expenses.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.expenses).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('expenses', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save expense:', error);
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(schema.expenses).where(eq(schema.expenses.id, id));
    broadcastDbChange('expenses', 'delete', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Orders
app.get('/api/orders', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get orders:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const existing = await db.select().from(schema.orders).where(eq(schema.orders.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.orders).set(item).where(eq(schema.orders.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.orders).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('orders', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save order:', error);
    res.status(500).json({ error: 'Failed to save order' });
  }
});

app.patch('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.update(schema.orders).set(req.body).where(eq(schema.orders.id, id)).returning();
    broadcastDbChange('orders', 'update', id);
    res.json(updated[0] || null);
  } catch (error) {
    console.error('Failed to update order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(schema.orders).where(eq(schema.orders.id, id));
    broadcastDbChange('orders', 'delete', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete order:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Transactions
app.get('/api/transactions', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.transactions).orderBy(desc(schema.transactions.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

app.post('/api/transactions', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const existing = await db.select().from(schema.transactions).where(eq(schema.transactions.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.transactions).set(item).where(eq(schema.transactions.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.transactions).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('transactions', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save transaction:', error);
    res.status(500).json({ error: 'Failed to save transaction' });
  }
});

app.delete('/api/transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(schema.transactions).where(eq(schema.transactions.id, id));
    broadcastDbChange('transactions', 'delete', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Item Logs
app.get('/api/item-logs', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.itemLogs).orderBy(desc(schema.itemLogs.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get item logs:', error);
    res.status(500).json({ error: 'Failed to get item logs' });
  }
});

app.post('/api/item-logs', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    const existing = await db.select().from(schema.itemLogs).where(eq(schema.itemLogs.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.itemLogs).set(item).where(eq(schema.itemLogs.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.itemLogs).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('item_logs', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save item log:', error);
    res.status(500).json({ error: 'Failed to save item log' });
  }
});

app.patch('/api/item-logs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.update(schema.itemLogs).set(req.body).where(eq(schema.itemLogs.id, id)).returning();
    broadcastDbChange('item_logs', 'update', id);
    res.json(updated[0] || null);
  } catch (error) {
    console.error('Failed to update item log:', error);
    res.status(500).json({ error: 'Failed to update item log' });
  }
});

app.delete('/api/item-logs/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(schema.itemLogs).where(eq(schema.itemLogs.id, id));
    broadcastDbChange('item_logs', 'delete', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete item log:', error);
    res.status(500).json({ error: 'Failed to delete item log' });
  }
});

// Customers
app.get('/api/customers', async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(schema.customers).orderBy(desc(schema.customers.createdAt));
    res.json(all);
  } catch (error) {
    console.error('Failed to get customers:', error);
    res.status(500).json({ error: 'Failed to get customers' });
  }
});

app.post('/api/customers', async (req: Request, res: Response) => {
  try {
    const item = { ...req.body, role: 'customer' };
    const existing = await db.select().from(schema.customers).where(eq(schema.customers.id, item.id)).limit(1);
    let result;
    if (existing.length > 0) {
      const updated = await db.update(schema.customers).set(item).where(eq(schema.customers.id, item.id)).returning();
      result = updated[0];
    } else {
      const inserted = await db.insert(schema.customers).values(item).returning();
      result = inserted[0];
    }
    broadcastDbChange('customers', 'upsert', item.id);
    return res.json(result);
  } catch (error) {
    console.error('Failed to save customer:', error);
    res.status(500).json({ error: 'Failed to save customer' });
  }
});

// Vite Middleware for Frontend Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const path = await import('path');
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
