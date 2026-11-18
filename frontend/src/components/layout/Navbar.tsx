import React, { useState } from 'react';
import { Search, ShieldCheck, Zap, ChevronDown, Bell, Check } from 'lucide-react';

interface NavbarProps {
  onSearch?: (term: string) => void;
  onOpenAIHealth?: () => void;
  onOpenQualityGate?: () => void;
  activeTabTitle: string;
}

  export const Navbar: React.FC<NavbarProps> = ({
    onSearch,
    onOpenAIHealth,
    onOpenQualityGate,
    activeTabTitle
  }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        onSearch(searchTerm);
      }
    };

    return (
    <header className="h-16 bg-white border-b border-brand-border px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-brand-text tracking-tight">{activeTabTitle}</h2>
        <button
          onClick={onOpenQualityGate}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold hover:bg-emerald-100/80 transition cursor-pointer"
          title="View Escalation Quality Gate"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Quality gate active</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64 md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets, clients, issues..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-brand-text placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all"
          />
        </div>

        {/* AI Multi-Provider Pill */}
        <button
          onClick={onOpenAIHealth}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer"
          title="Open AI Provider Observability"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Gemini + Groq</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* User Profile */ }
      <div className="relative">
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="flex items-center gap-2.5 pl-3 border-l border-slate-200 hover:opacity-90 transition text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-brand-sidebar flex items-center justify-center text-xs font-bold text-white shadow-sm">
            RT
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-bold text-brand-text leading-tight">Rahul T</div>
            <div className="text-[11px] text-brand-textMuted leading-tight">Support Operations</div>
          </div>
        </button>

        {showProfileMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-xs text-slate-700">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="font-bold text-brand-text">Rahul T</p>
              <p className="text-[11px] text-slate-500">rahul.t@rideops.internal</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                L1 Senior Specialist
              </span>
            </div>
            <div className="px-4 py-2 border-b border-slate-100 text-[11px] text-slate-500 space-y-1">
              <p>Location: Bangalore Ops Center</p>
              <p>Active Shift: Morning (07:00 - 16:00)</p>
            </div>
            <button
              onClick={() => setShowProfileMenu(false)}
              className="w-full text-left px-4 py-1.5 hover:bg-slate-50 text-brand-teal font-medium"
            >
              Close Menu
            </button>
          </div>
        )}
      </div>
    </div>
    </header >
  );
};
