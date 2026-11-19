import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { OperationsDashboard } from './components/dashboard/OperationsDashboard';
import { TicketWorkspace } from './components/tickets/TicketWorkspace';
import { InvestigationWorkbench } from './components/workbench/InvestigationWorkbench';
import { EscalationQualityGate } from './components/escalations/EscalationQualityGate';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { AIObservabilityPanel } from './components/ai/AIObservabilityPanel';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<string>('SUP-10001');
  const [navSearchTerm, setNavSearchTerm] = useState<string>('');

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

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Operations Command Center';
      case 'tickets': return 'Support Ticket Queue';
      case 'workbench': return `Investigation Workbench — ${selectedTicketId}`;
      case 'escalations': return `Escalation Quality Gate — ${selectedTicketId}`;
      case 'analytics': return 'Operational Intelligence & Analytics';
      case 'ai-health': return 'Multi-Provider AI Observability (Gemini + Groq)';
      default: return 'SupportDesk';
    }
  };

  return (
    <div className="flex h-screen bg-brand-bg text-brand-text overflow-hidden font-sans">
      {/* Deep Teal Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        openTicketCount={48} 
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
        />

        <main className="flex-1 overflow-y-auto bg-brand-bg">
          {activeTab === 'dashboard' && (
            <OperationsDashboard 
              onSelectTicket={handleSelectTicket} 
              onNavigateToQueue={() => setActiveTab('tickets')}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketWorkspace 
              onSelectTicket={handleSelectTicket} 
              searchTerm={navSearchTerm}
              onSearchChange={setNavSearchTerm}
            />
          )}

          {activeTab === 'workbench' && (
            <InvestigationWorkbench 
              ticketId={selectedTicketId}
              onOpenEscalationGate={handleOpenEscalationGate}
              onBackToQueue={() => setActiveTab('tickets')}
            />
          )}

          {activeTab === 'escalations' && (
            <EscalationQualityGate 
              ticketId={selectedTicketId}
              onBackToWorkbench={() => setActiveTab('workbench')}
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
