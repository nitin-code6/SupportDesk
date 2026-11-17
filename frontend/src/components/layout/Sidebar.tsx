import React from 'react';
import { 
  LayoutDashboard, 
  Inbox, 
  Wrench, 
  ShieldAlert, 
  BarChart3, 
  Cpu, 
  ChevronRight,
  LifeBuoy
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openTicketCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, openTicketCount = 48 }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'tickets', label: 'Ticket Queue', icon: Inbox, badge: openTicketCount },
    { id: 'workbench', label: 'Investigation Workbench', icon: Wrench },
    { id: 'escalations', label: 'Escalation Quality Gate', icon: ShieldAlert },
    { id: 'analytics', label: 'Operational Intelligence', icon: BarChart3 },
    { id: 'ai-health', label: 'AI Provider Health', icon: Cpu, pill: 'Multi-AI' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <LifeBuoy className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              SupportDesk
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                v0.1
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">RideOps Operations</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Operations & Triage
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                  {item.pill && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.pill}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="rounded-lg bg-slate-800/50 p-3 border border-slate-700/50">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1">
            <span>Snapshot Horizon</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live Data
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            30 Sep 2026 IST • 1,444 records
          </p>
        </div>
      </div>
    </aside>
  );
};
