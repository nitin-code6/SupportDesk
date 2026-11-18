import React, { useState } from 'react';
import { Search, ShieldCheck, Zap, ChevronDown, Check, UserCheck } from 'lucide-react';

export type UserRole = 'agent' | 'manager' | 'engineer';

interface NavbarProps {
  onSearch?: (term: string) => void;
  onOpenAIHealth?: () => void;
  onOpenQualityGate?: () => void;
  activeTabTitle: string;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  onOpenAIHealth,
  onOpenQualityGate,
  activeTabTitle,
  currentRole,
  onRoleChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch(searchTerm);
    }
  };

  const roleLabels: Record<UserRole, { title: string; subtitle: string; badge: string }> = {
    agent: {
      title: 'Support Agent',
      subtitle: 'L1 Triage Specialist',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    },
    manager: {
      title: 'Support Manager',
      subtitle: 'Bypass & Policy Authorized',
      badge: 'bg-purple-50 text-purple-800 border-purple-200'
    },
    engineer: {
      title: 'Senior Engineer',
      subtitle: 'Engineering Handoff Review',
      badge: 'bg-blue-50 text-blue-800 border-blue-200'
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

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative w-56 md:w-72">
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

        {/* Demo Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-left transition cursor-pointer"
            title="Switch Demo Role"
          >
            <div className="w-6 h-6 rounded-full bg-brand-sidebar flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
              {currentRole === 'agent' ? 'AG' : currentRole === 'manager' ? 'MGR' : 'ENG'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-brand-text leading-tight">{roleLabels[currentRole].title}</div>
              <div className="text-[10px] text-brand-textMuted leading-tight">{roleLabels[currentRole].subtitle}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-xs text-slate-700">
              <div className="px-4 py-1.5 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Demo Role Switcher
              </div>
              {(['agent', 'manager', 'engineer'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    onRoleChange(role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between transition ${
                    currentRole === role ? 'bg-teal-50/50 text-brand-tealDark font-bold' : ''
                  }`}
                >
                  <div>
                    <div className="font-semibold text-brand-text">{roleLabels[role].title}</div>
                    <div className="text-[11px] text-brand-textMuted">{roleLabels[role].subtitle}</div>
                  </div>
                  {currentRole === role && <Check className="w-4 h-4 text-brand-teal" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
