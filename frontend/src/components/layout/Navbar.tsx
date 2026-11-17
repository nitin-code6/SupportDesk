import React from 'react';
import { Search, ShieldCheck, Zap, ChevronDown } from 'lucide-react';

interface NavbarProps {
  onSearch?: (term: string) => void;
  activeTabTitle: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch, activeTabTitle }) => {
  return (
    <header className="h-16 bg-white border-b border-brand-border px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-brand-text tracking-tight">{activeTabTitle}</h2>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Quality gate active</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64 md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets, clients, issues..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-brand-text placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all"
          />
        </div>

        {/* AI Multi-Provider Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 transition">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Gemini + Groq</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-brand-sidebar flex items-center justify-center text-xs font-bold text-white shadow-sm">
            RT
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-brand-text leading-tight">Rahul T</div>
            <div className="text-[11px] text-brand-textMuted leading-tight">Support Operations</div>
          </div>
        </div>
      </div>
    </header>
  );
};
