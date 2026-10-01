import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-plugin',
    configureServer(server) {
      server.middlewares.use('/api/gemini', async (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            let contextData: any = null;
            try {
              const parsed = JSON.parse(body || '{}');
              const { prompt, systemInstruction } = parsed;
              contextData = parsed.contextData;
              
              // Verify topic relevance to store inventory and expenses
              const q = (prompt || '').toLowerCase().trim();
              const inventoryExpenseKeywords = [
                'inventory', 'product', 'products', 'item', 'items', 'stock', 'stocks', 'bale', 'bales',
                'category', 'categories', 'supplier', 'suppliers', 'barcode', 'barcodes', 'quantity',
                'available', 'remaining', 'out of stock', 'low stock', 'restock', 'reorder',
                'cost', 'price', 'pricing', 'selling price', 'cost price', 'apparel', 'clothing',
                'expense', 'expenses', 'account', 'accounts', 'disbursement', 'disbursements',
                'budget', 'budgets', 'spent', 'spending', 'utility', 'utilities', 'electric',
                'meralco', 'water', 'rent', 'salary', 'salaries', 'wages', 'wage', 'operational',
                'outflow', 'ledger', 'disburse', 'break-even', 'breakeven', 'margin', 'loss',
                'damaged', 'lost', 'returned', 'summary', 'overview', 'performance', 'balance',
                'sales', 'sale', 'database', 'db', 'fetch', 'data', 'store', 'record', 'records',
                'order', 'orders', 'report', 'stats', 'figures', 'inflow', 'revenue',
                'recommend', 'recommendation', 'recommendations', 'suggest', 'suggestion', 'suggestions',
                'strategy', 'strategies', 'advice', 'optimize', 'improve', 'cut', 'reduce',
                'deadstock', 'clearance', 'discount', 'bundle', 'markup', 'cogs', 'profit',
                'hi', 'hello', 'hey', 'help', 'exins', 'novaliches'
              ];
              const isRelevant = inventoryExpenseKeywords.some((k) => q.includes(k));

              if (!isRelevant) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    text: "I can only answer questions related to your store's inventory and expenses. Feel free to ask about your products, stock levels, bales, budgets, operational disbursements, or store recommendations!",
                  })
                );
                return;
              }

              const pCount = contextData?.productCount ?? contextData?.inventorySummary?.totalProducts ?? 0;
              const bCount = contextData?.baleCount ?? contextData?.inventorySummary?.totalBales ?? 0;
              const expTotal = contextData?.totalExpenses ?? contextData?.expensesSummary?.totalDisbursedAmount ?? 0;
              const lowStockList = contextData?.lowStockProducts ?? contextData?.inventorySummary?.lowStockProducts ?? [];

              const apiKey = process.env.GEMINI_API_KEY;
              
              if (!apiKey) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    text: `Fetched from your live store database: You have ${pCount} products listed across ${bCount} bales, with ₱${Number(expTotal).toLocaleString()} recorded in operational expenses. ${lowStockList.length > 0 ? `${lowStockList.length} items currently have low stock (<= 3 units).` : 'All inventory stock levels are healthy.'}`,
                    fallback: true
                  })
                );
                return;
              }

              const { GoogleGenAI } = await import('@google/genai');
              const ai = new GoogleGenAI();
              const fullPrompt = `${systemInstruction ? `[SYSTEM INSTRUCTION: ${systemInstruction}]\n\n` : ''}${
                contextData ? `[CURRENT STORE DATA CONTEXT: ${JSON.stringify(contextData)}]\n\n` : ''
              }${prompt}`;

              const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: fullPrompt,
              });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ text: response.text }));
            } catch (err: any) {
              console.error('Gemini API Error:', err);
              const pCount = contextData?.productCount ?? contextData?.inventorySummary?.totalProducts ?? 0;
              const expTotal = contextData?.totalExpenses ?? contextData?.expensesSummary?.totalDisbursedAmount ?? 0;
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  text: `Based on your database: ${pCount} inventory items are recorded with ₱${Number(expTotal).toLocaleString()} in operational disbursements.`,
                  fallback: true
                })
              );
            }
          });
        } else {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

