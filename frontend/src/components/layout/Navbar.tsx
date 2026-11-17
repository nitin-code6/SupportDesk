import React from 'react';
import { Search, Bell, ShieldCheck, Zap } from 'lucide-react';

interface NavbarProps {
  onSearch?: (term: string) => void;
  activeTabTitle: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch, activeTabTitle }) => {
  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-white tracking-tight">{activeTabTitle}</h2>
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Quality Gate Active</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Global Search */}
        <div className="relative w-64 md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets, clients, issues..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
          />
        </div>

        {/* AI Multi-Provider Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-slate-300 font-medium">AI Strategy:</span>
          <span className="font-mono text-sky-400 font-semibold">Gemini + Groq</span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow">
            L1
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-200">Rahul T</div>
            <div className="text-[10px] text-slate-400">Support Operations</div>
          </div>
        </div>
      </div>
    </header>
  );
};
