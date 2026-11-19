import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { OperationsDashboard } from './components/dashboard/OperationsDashboard';
import { TicketWorkspace } from './components/tickets/TicketWorkspace';
import { InvestigationWorkbench } from './components/workbench/InvestigationWorkbench';
import { EscalationQualityGate } from './components/escalations/EscalationQualityGate';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { AIObservabilityPanel } from './components/ai/AIObservabilityPanel';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [navSearchTerm, setNavSearchTerm] = useState<string>('');
  const [openTicketCount, setOpenTicketCount] = useState<number | undefined>(undefined);

  // Global selected agent state: synchronized across Command Center, Ticket Queue, and Navbar profile
  // Defaults to 'ALL' (All Support Agents) on fresh load or page refresh
  const queryParams = new URLSearchParams(window.location.search);
  const initialAgent = queryParams.get('agent') || 'ALL';
  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgent);

  // Fetch dynamic open ticket count for the sidebar badge
  useEffect(() => {
    async function fetchOpenCount() {
      try {
        const metrics = await api.getOverviewMetrics();
        if (metrics && typeof metrics.open_tickets === 'number') {
          setOpenTicketCount(metrics.open_tickets);
        }
      } catch (err) {
        console.error('Failed to fetch open ticket count for sidebar badge:', err);
      }
    }
    fetchOpenCount();
  }, [activeTab]);

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setActiveTab('workbench');
  };

  const handleOpenEscalationGate = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setActiveTab('escalations');
  };

  const handleNavbarSearch = (term: string) => {
    setNavSearchTerm(term);
    if (term.trim() && activeTab !== 'tickets') {
      setActiveTab('tickets');
    }
  };

  const handleSelectAgentGlobal = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'My Dashboard';
      case 'tickets': return 'All Tickets';
      case 'workbench': return selectedTicketId ? `Investigate Ticket — ${selectedTicketId}` : 'Investigate Ticket';
      case 'escalations': return selectedTicketId ? `Escalation Review — ${selectedTicketId}` : 'Escalation Review';
      case 'analytics': return 'Team Insights';
      case 'ai-health': return 'AI Status';
      default: return 'SupportDesk';
    }
  };

  return (
    <div className="flex h-screen bg-brand-bg text-brand-text overflow-hidden font-sans">
      {/* Deep Teal Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        openTicketCount={openTicketCount} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar 
          activeTabTitle={getTabTitle()} 
          searchTerm={navSearchTerm}
          onSearch={handleNavbarSearch}
          onSearchChange={handleNavbarSearch}
          onOpenAIHealth={() => setActiveTab('ai-health')}
          onOpenQualityGate={() => setActiveTab('escalations')}
          selectedAgentId={selectedAgentId}
          onSelectAgent={handleSelectAgentGlobal}
        />

        <main className="flex-1 overflow-y-auto bg-brand-bg">
          {activeTab === 'dashboard' && (
            <OperationsDashboard 
              onSelectTicket={handleSelectTicket} 
              onNavigateToQueue={() => setActiveTab('tickets')}
              selectedAgentId={selectedAgentId}
              onSelectAgent={handleSelectAgentGlobal}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketWorkspace 
              onSelectTicket={handleSelectTicket} 
              searchTerm={navSearchTerm}
              onSearchChange={setNavSearchTerm}
              selectedAgentId={selectedAgentId}
            />
          )}

          {activeTab === 'workbench' && (
            <InvestigationWorkbench 
              ticketId={selectedTicketId || ''}
              onOpenEscalationGate={handleOpenEscalationGate}
              onBackToQueue={() => setActiveTab('tickets')}
            />
          )}

          {activeTab === 'escalations' && (
            <EscalationQualityGate 
              ticketId={selectedTicketId || ''}
              onBackToWorkbench={() => setActiveTab(selectedTicketId ? 'workbench' : 'tickets')}
              onEscalationSuccess={() => setActiveTab('dashboard')}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView />
          )}

          {activeTab === 'ai-health' && (
            <AIObservabilityPanel />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
