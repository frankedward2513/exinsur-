import React from 'react';
import { useStore } from '../context/StoreContext';
import { AlertTriangle, Database, ArrowRight, X } from 'lucide-react';

export const SupabaseRlsBanner: React.FC = () => {
  const { rlsBlocked, rlsErrorInfo, dismissRlsWarning, setShowRlsModal } = useStore();

  if (!rlsBlocked) return null;

  return (
    <div className="relative z-40 bg-gradient-to-r from-amber-950 via-stone-900 to-orange-950 border-b border-amber-500/40 px-4 py-2.5 shadow-lg animate-fade-in">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 text-amber-200">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-amber-300">Supabase RLS Action Needed: </span>
            <span className="text-stone-300">
              Row-Level Security is active on your database, but policies are not created yet{' '}
              {rlsErrorInfo ? `(table: ${rlsErrorInfo.table})` : ''}.
              Data is safely saved in local storage.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowRlsModal(true)}
            className="flex items-center gap-1.5 py-1 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow transition cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Create RLS Policies</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={dismissRlsWarning}
            className="p-1 rounded-lg text-stone-400 hover:text-white transition"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
