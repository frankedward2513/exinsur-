import React from 'react';
import { useStore } from '../context/StoreContext';
import { CheckCircle2, X } from 'lucide-react';

export const FormSuccessAlert: React.FC = () => {
  const { formAlert, clearFormAlert } = useStore();

  if (!formAlert) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] sm:w-auto animate-bounce-in">
      <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/95 via-stone-900/95 to-amber-950/90 border border-emerald-500/40 text-white shadow-2xl backdrop-blur-xl">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 pr-2">
          <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Success</p>
          <p className="text-xs sm:text-sm font-semibold text-stone-100">{formAlert}</p>
        </div>
        <button
          type="button"
          onClick={clearFormAlert}
          className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
