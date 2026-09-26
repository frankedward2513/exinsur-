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
            try {
              const { prompt, systemInstruction, contextData } = JSON.parse(body || '{}');
              const apiKey = process.env.GEMINI_API_KEY;
              
              if (!apiKey) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    text: `Hello! I am your AI EXINS business assistant. I analyzed your store data: You currently have ${contextData?.productCount || 0} listed products, ₱${contextData?.totalSales || 0} in total sales, and ₱${contextData?.totalExpenses || 0} in expenses. To maximize profits for EXINS Jksur+ Novaliches, focus on high-margin apparel bales, keep fast-moving jackets and shoes restocked, and maintain healthy break-even margins.`,
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
                model: 'gemini-2.5-flash',
                contents: fullPrompt,
              });

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ text: response.text }));
            } catch (err: any) {
              console.error('Gemini API Error:', err);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  text: `AI Assistant insight: Based on current EXINS store performance, keep an eye on open bales and prioritize clearance on slower seasonal items. (Note: ${err.message || 'API call failed'})`,
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

