import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { supabase } from '../utils/supabase';
import {
  ShieldAlert,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  X,
  Database,
  Terminal,
  AlertTriangle,
} from 'lucide-react';

interface SupabaseRlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SQL_RLS_POLICIES = `-- ==============================================================================
-- JKsur+ Store Management: Supabase RLS Policies & Table Setup
-- Copy and run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/irsheyzehymddpmmnbot/sql/new
-- ==============================================================================

-- 1. Create missing tables if they do not exist yet
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  uid TEXT,
  email TEXT,
  "displayName" TEXT,
  phone TEXT,
  address TEXT,
  role TEXT,
  provider TEXT,
  "isGuest" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.item_logs (
  id TEXT PRIMARY KEY,
  "orderId" TEXT,
  "orderNumber" TEXT,
  "productId" TEXT,
  "productName" TEXT,
  "customerName" TEXT,
  status TEXT,
  "newStatus" TEXT,
  "previousStatus" TEXT,
  notes TEXT,
  "updatedBy" TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Row-Level Security (RLS) Policies on all JKsur+ tables
-- This allows both authenticated users (Owner/Staff/Customers) and anonymous showcase visitors
-- to access and perform store operations without 401 RLS blocks.
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'bales',
    'categories',
    'products',
    'suppliers',
    'expense_accounts',
    'expenses',
    'orders',
    'transactions',
    'item_logs',
    'customers'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Ensure table exists before applying policy
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "allow_all_ops_%s" ON public.%I;', tbl, tbl);
      EXECUTE format('CREATE POLICY "allow_all_ops_%s" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);', tbl, tbl);
    END IF;
  END LOOP;
END $$;
`;

export const SupabaseRlsModal: React.FC<SupabaseRlsModalProps> = ({ isOpen, onClose }) => {
  const { rlsErrorInfo, syncLocalToSupabase } = useStore();
  const [copied, setCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    tested: boolean;
    success: boolean;
    details: Array<{ table: string; status: 'ok' | 'blocked' | 'missing'; message?: string }>;
  } | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_RLS_POLICIES);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const runDiagnostics = async () => {
    setIsTesting(true);
    const tables = [
      'products',
      'categories',
      'bales',
      'orders',
      'transactions',
      'expenses',
      'expense_accounts',
      'suppliers',
      'customers',
      'item_logs',
    ];

    const results: Array<{ table: string; status: 'ok' | 'blocked' | 'missing'; message?: string }> = [];

    for (const t of tables) {
      try {
        // Test select
        const selRes = await supabase.from(t).select('*').limit(1);
        if (selRes.error) {
          if (selRes.status === 404 || selRes.error.message.includes('schema cache')) {
            results.push({ table: t, status: 'missing', message: 'Table does not exist yet' });
          } else if (selRes.error.code === '42501' || selRes.error.message.includes('row-level security')) {
            results.push({ table: t, status: 'blocked', message: 'Blocked by RLS policy' });
          } else {
            results.push({ table: t, status: 'blocked', message: selRes.error.message });
          }
        } else {
          results.push({ table: t, status: 'ok' });
        }
      } catch (err: any) {
        results.push({ table: t, status: 'blocked', message: err?.message || 'Connection error' });
      }
    }

    const allOk = results.every((r) => r.status === 'ok');
    setTestResults({ tested: true, success: allOk, details: results });
    setIsTesting(false);
  };

  const handleSyncNow = async () => {
    setIsTesting(true);
    await syncLocalToSupabase();
    await runDiagnostics();
    setIsTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-orange-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Supabase RLS & Database Setup
              </h2>
              <p className="text-xs text-stone-400">
                Create database policies so authenticated users & store visitors can save and read data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 py-4 pr-1">
          {/* Status Alert Box */}
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs sm:text-sm text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">
                Why is RLS blocking database writes?
              </p>
              <p className="text-stone-300 text-xs leading-relaxed">
                When Row-Level Security (RLS) is enabled in Supabase without policies, PostgreSQL defaults to denying all access (error <code className="bg-stone-950 px-1 py-0.5 rounded text-amber-300">42501</code>).
                Your application has safely stored your data in local storage so nothing is lost.
                Run the quick SQL script below in your Supabase SQL Editor to grant proper permissions.
              </p>
              {rlsErrorInfo && (
                <p className="text-[11px] text-amber-400/90 font-mono mt-1">
                  Triggered on table: <span className="font-bold underline">{rlsErrorInfo.table}</span>
                </p>
              )}
            </div>
          </div>

          {/* Step 1 & 2 Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-stone-200">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Copy SQL Setup Script</span>
              </div>
              <p className="text-stone-400 text-[11px]">
                Click below to copy the complete policy creation script to your clipboard.
              </p>
              <button
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-stone-200">
                <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Paste in Supabase SQL Editor</span>
              </div>
              <p className="text-stone-400 text-[11px]">
                Open your project's SQL editor, paste the script, and press "Run".
              </p>
              <a
                href="https://supabase.com/dashboard/project/irsheyzehymddpmmnbot/sql/new"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-orange-500/30 text-stone-200 hover:text-white font-bold text-xs transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-orange-400" />
                <span>Open Supabase SQL Editor</span>
              </a>
            </div>
          </div>

          {/* SQL Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-stone-400 px-1">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Terminal className="w-3.5 h-3.5 text-orange-400" /> SQL Script Preview
              </span>
              <button
                onClick={handleCopy}
                className="text-orange-400 hover:text-orange-300 text-[11px] underline"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="p-3 rounded-2xl bg-stone-950 border border-stone-800 text-[10px] text-stone-300 font-mono overflow-x-auto max-h-44 leading-relaxed">
              {SQL_RLS_POLICIES}
            </pre>
          </div>

          {/* Diagnostics Section */}
          <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Database Health Check</p>
                <p className="text-[11px] text-stone-400">Test if your tables and RLS policies are active</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={runDiagnostics}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold border border-stone-700 transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Test Tables</span>
                </button>
                <button
                  onClick={handleSyncNow}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sync Local Data</span>
                </button>
              </div>
            </div>

            {testResults && (
              <div className="pt-2 border-t border-stone-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {testResults.details.map((t) => (
                  <div
                    key={t.table}
                    className={`p-2 rounded-xl border flex items-center justify-between ${
                      t.status === 'ok'
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : t.status === 'missing'
                        ? 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                        : 'bg-red-950/30 border-red-500/30 text-red-300'
                    }`}
                  >
                    <span className="font-mono font-medium truncate">{t.table}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/40">
                      {t.status === 'ok' ? 'Ready' : t.status === 'missing' ? 'Missing' : 'Blocked'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
          <p className="text-[11px] text-stone-500">
            Project: <code className="text-orange-400">irsheyzehymddpmmnbot</code>
          </p>
          <button
            onClick={onClose}
            className="py-1.5 px-5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
