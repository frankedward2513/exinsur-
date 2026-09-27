import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { Bot, Sparkles, Send, Trash2, ArrowRight, CornerDownLeft } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AiChatbotView: React.FC = () => {
  const { products, bales, expenseAccounts, expenses, orders, transactions } = useStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'Hi Im your AI Exins! 👋 I am your dedicated business chatbot for EXINS Jksur+ Novaliches Quezon City. Ask me anything about your current inventory, stock levels, bale break-even calculations, monthly expense budgets, or sales forecasting!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Context data payload for Gemini
  const contextData = {
    storeName: 'EXINS Jksur+ Novaliches Quezon City',
    productCount: products.length,
    lowStockProducts: products
      .filter((p) => p.availableQuantity <= 2)
      .map((p) => ({ name: p.name, stock: p.availableQuantity, price: p.sellingPrice })),
    baleCount: bales.length,
    bales: bales.map((b) => ({
      code: b.baleCode,
      name: b.baleName,
      cost: b.totalPurchasePrice,
      sales: b.totalSalesMade || 0,
      breakEven: (b.totalSalesMade || 0) >= b.totalPurchasePrice,
      needed: Math.max(0, b.totalPurchasePrice - (b.totalSalesMade || 0)),
    })),
    expenseAccounts: expenseAccounts.map((a) => ({
      name: a.name,
      budget: a.monthlyBudget,
      spent: a.totalSpent || 0,
    })),
    totalOrders: orders.length,
    totalSales: transactions.filter((t) => t.flowType === 'inflow').reduce((s, t) => s + t.inflow, 0),
    totalExpenses: transactions.filter((t) => t.flowType === 'outflow').reduce((s, t) => s + t.outflow, 0),
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend.trim(),
          systemInstruction:
            'You are "Hi Im your AI Exins", an intelligent conversational chatbot for EXINS Jksur+ Novaliches Quezon City apparel store. Help the owner and staff with inventory queries, bale break-even analytics, expense tracking, and sales optimization strategies in Philippine Pesos (₱). Answer clearly, conversationally, and with actionable recommendations.',
          contextData,
        }),
      });

      const data = await response.json();
      const replyText =
        data.text ||
        'I am analyzing your store figures. Keep a close eye on open bales and ensure slow-moving inventory is moved with promotional bundles!';

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const fallbackMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: `Based on your recorded data: You have ${products.length} products listed, ₱${contextData.totalSales.toLocaleString()} in sales inflow, and ₱${contextData.totalExpenses.toLocaleString()} in operating expenses. Focus on unsealing and breaking even on current bales!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setIsClearConfirmOpen(true);
  };

  const executeClearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'ai',
        text: 'Chat history cleared. Hi Im your AI Exins! What would you like to discuss about your inventory or expenses today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setIsClearConfirmOpen(false);
  };

  const quickPrompts = [
    'How are my bales performing and which ones need sales to break even?',
    'What is our current gross profit and sales inflow summary?',
    'Which product categories are running low in stock?',
    'Are any of our monthly expense accounts exceeding their budget allocation?',
    'Give me a 7-day sales velocity forecast for EXINS Novaliches.',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in pb-16">
      {/* Chatbot Header */}
      <div className="p-6 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-amber-600 to-amber-900 flex items-center justify-center text-white shadow-lg shadow-orange-600/30 border border-orange-400/40">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Hi Im your AI Exins</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold tracking-widest uppercase border border-orange-500/30">
                Online Chatbot
              </span>
            </div>
            <p className="text-xs text-stone-300">
              Interactive AI store advisor for EXINS Jksur+ Novaliches Quezon City
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-2.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 flex items-center gap-1.5 text-xs transition cursor-pointer self-start sm:self-auto"
          title="Clear Chat Conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-stone-400 font-semibold flex items-center gap-1 shrink-0 pl-1">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          Quick Inquiries:
        </span>
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            className="px-3.5 py-1.5 rounded-full bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white border border-orange-500/20 text-xs shrink-0 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>{q}</span>
            <ArrowRight className="w-3 h-3 text-orange-400" />
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="p-6 rounded-3xl glass-panel min-h-[440px] max-h-[580px] overflow-y-auto space-y-4 text-xs sm:text-sm">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {m.sender === 'ai' ? (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-700 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                <Bot className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-stone-800 flex items-center justify-center text-stone-300 shrink-0 mt-0.5 font-bold font-mono">
                U
              </div>
            )}

            <div className={`max-w-[80%] space-y-1 ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div
                className={`p-4 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white rounded-tr-xs shadow-md'
                    : 'bg-stone-950/80 border border-orange-500/25 text-stone-200 rounded-tl-xs shadow-sm'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-stone-500 px-1 inline-block">{m.timestamp}</span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-stone-400 p-2 text-xs">
            <div className="w-7 h-7 rounded-xl bg-orange-600/30 flex items-center justify-center text-orange-400 animate-spin">
              <Bot className="w-4 h-4" />
            </div>
            <span>Hi Im your AI Exins is thinking and reviewing your store records...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3.5 rounded-3xl glass-panel flex items-center gap-2 border border-orange-500/30"
      >
        <input
          type="text"
          placeholder="Ask Hi Im your AI Exins about inventory, expenses, break-even, forecasting..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-2xl bg-stone-950/80 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-xs sm:text-sm focus:outline-none focus:border-orange-500 transition"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* Confirmation Modal to prevent accidental clearing of chat */}
      <ConfirmDeleteModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={executeClearChat}
        title="Clear Chat Conversation?"
        message="Are you sure you want to clear your conversation with Hi Im your AI Exins? If you clicked this by accident, click Cancel to keep your conversation."
        itemName="Active Chat Session"
        confirmText="Yes, Clear Chat"
        cancelText="Cancel"
      />
    </div>
  );
};
