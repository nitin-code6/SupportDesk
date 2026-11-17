import React from 'react';
import { 
  LayoutGrid, 
  Inbox, 
  Wrench, 
  ShieldCheck, 
  BarChart3, 
  Cpu, 
  Headphones,
  Database
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openTicketCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, openTicketCount = 48 }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutGrid },
    { id: 'tickets', label: 'Ticket Queue', icon: Inbox, badge: openTicketCount },
    { id: 'workbench', label: 'Investigation Workbench', icon: Wrench },
    { id: 'escalations', label: 'Escalation Quality Gate', icon: ShieldCheck },
    { id: 'analytics', label: 'Operational Intelligence', icon: BarChart3 },
    { id: 'ai-health', label: 'AI Provider Health', icon: Cpu },
  ];

  return (
    <aside className="w-64 bg-brand-sidebar text-white flex flex-col justify-between h-screen select-none shrink-0 shadow-xl border-r border-[#0D3F3B]">
      <div>
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center gap-3 border-b border-[#145751]">
          <div className="h-10 w-10 rounded-xl bg-brand-teal flex items-center justify-center text-white shadow-md shadow-black/20">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 leading-none">
              SupportDesk
            </h1>
            <p className="text-[12px] text-[#A3C7C2] font-medium mt-1">RideOps Operations</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-5">
          <div className="text-[11px] font-bold text-[#6FAAA3] uppercase tracking-wider px-3 mb-3">
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-sidebarActive text-white font-semibold shadow-inner'
                      : 'text-[#C5DED9] hover:text-white hover:bg-brand-sidebarHover'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8DBDB5]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#E5A54B] text-slate-950">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-[#145751]">
        <div className="rounded-xl bg-[#0B3935] p-3.5 border border-[#145751] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#145751] text-brand-teal">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Snapshot • 30 Sep 2026</div>
            <div className="text-[11px] text-[#78ADA6] flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-teal"></span>
              1,444 records
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
