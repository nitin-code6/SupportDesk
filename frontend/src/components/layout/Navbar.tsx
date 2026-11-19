import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ShieldCheck, Zap, ChevronDown, X, Info, User, Check } from 'lucide-react';
import { CURRENT_DEMO_USER, AGENT_ROSTER, getAgentById } from '../../config/demoUser';

export type UserRole = 'agent' | 'manager' | 'engineer';

interface NavbarProps {
  searchTerm?: string;
  onSearch?: (term: string) => void;
  onSearchChange?: (term: string) => void;
  onOpenAIHealth?: () => void;
  onOpenQualityGate?: () => void;
  activeTabTitle: string;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  selectedAgentId?: string;
  onSelectAgent?: (agentId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchTerm: controlledSearchTerm,
  onSearch,
  onSearchChange,
  onOpenAIHealth,
  onOpenQualityGate,
  activeTabTitle,
  selectedAgentId = 'ALL',
  onSelectAgent
}) => {
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAgentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve currently active agent profile from global selectedAgentId
  const activeAgent = useMemo(() => {
    if (selectedAgentId === 'ALL') {
      return {
        agent_id: 'ALL',
        display_name: 'All Support Agents',
        initials: 'All',
        role_badge: 'Team',
        subtitle: 'Team View'
      };
    }
    const found = getAgentById(selectedAgentId);
    if (found) {
      return {
        agent_id: found.agent_id,
        display_name: found.display_name,
        initials: found.initials,
        role_badge: 'L1',
        subtitle: 'L1 Support Agent'
      };
    }
    return {
      agent_id: CURRENT_DEMO_USER.user_id,
      display_name: CURRENT_DEMO_USER.display_name,
      initials: CURRENT_DEMO_USER.initials,
      role_badge: 'L1',
      subtitle: CURRENT_DEMO_USER.title
    };
  }, [selectedAgentId]);

  const currentSearchTerm = controlledSearchTerm !== undefined ? controlledSearchTerm : internalSearchTerm;

  const handleSearchChange = (val: string) => {
    setInternalSearchTerm(val);
    if (onSearchChange) onSearchChange(val);
    if (onSearch) onSearch(val);
  };

  const handleClear = () => {
    setInternalSearchTerm('');
    if (onSearchChange) onSearchChange('');
    if (onSearch) onSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (onSearch) onSearch(currentSearchTerm);
      if (onSearchChange) onSearchChange(currentSearchTerm);
    }
  };

  const handleSelect = (agentId: string) => {
    if (onSelectAgent) {
      onSelectAgent(agentId);
    }
    setShowAgentMenu(false);
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
            value={currentSearchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-brand-text placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition-all"
          />
          {currentSearchTerm && (
            <button
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
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

        {/* Global Agent Selector / Active Profile at Rightmost */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowAgentMenu(!showAgentMenu)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs select-none transition cursor-pointer text-left"
            title={`Active Global Agent: ${activeAgent.display_name} • Click to switch`}
          >
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-[#104C47] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                {activeAgent.initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" title="Active on Shift" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-brand-text leading-tight">{activeAgent.display_name}</span>
                <span 
                  className="text-[9px] font-bold bg-teal-50 text-[#104C47] border border-teal-200/80 px-1.5 py-0.2 rounded-full cursor-help"
                  title="Active operator view"
                >
                  {activeAgent.role_badge}
                </span>
              </div>
              <div className="text-[10px] text-brand-textMuted leading-tight">{activeAgent.subtitle}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {showAgentMenu && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-2 z-50 text-xs text-[#334155] animate-in fade-in-50 duration-100">
              <div className="px-3.5 py-1.5 text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider flex items-center justify-between">
                <span>Active Agent Filter</span>
                <span className="text-[9px] font-normal text-slate-400">Global</span>
              </div>
              
              <button
                onClick={() => handleSelect('ALL')}
                className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer ${
                  selectedAgentId === 'ALL' ? 'bg-[#F0FDFA] text-[#0D9488] font-bold' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#104C47] text-white flex items-center justify-center text-[9px] font-bold">
                    All
                  </div>
                  <span>All Support Agents (Team)</span>
                </div>
                {selectedAgentId === 'ALL' && <Check className="w-3.5 h-3.5 text-[#0D9488]" />}
              </button>

              <div className="border-t border-[#F1F5F9] my-1"></div>

              {AGENT_ROSTER.map((agent) => {
                const isSelected = selectedAgentId === agent.agent_id;
                return (
                  <button
                    key={agent.agent_id}
                    onClick={() => handleSelect(agent.agent_id)}
                    className={`w-full text-left px-3.5 py-1.75 hover:bg-slate-50 flex items-center justify-between transition cursor-pointer ${
                      isSelected ? 'bg-[#F0FDFA] text-[#0D9488] font-bold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold">
                        {agent.initials}
                      </div>
                      <span>{agent.display_name}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0D9488]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
