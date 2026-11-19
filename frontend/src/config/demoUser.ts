/**
 * SupportDesk - Central Demo User Identity & Agent Roster Configuration (Hackathon v0)
 * 
 * DISCLAIMER & NOTICE:
 * This identity configuration represents a SIMULATED L1 operator session for hackathon evaluation.
 * Production enterprise authentication (SSO / SAML 2.0 / Okta / OIDC) is planned for v1.
 * The operator role is strictly fixed to 'L1 Support Agent'.
 * 
 * AGENT SELECTOR RULE:
 * The agent selector is an operational viewing/filtering tool across team queues.
 * Selecting an agent filters the displayed queue by that agent's actual database ID.
 * It does NOT impersonate that agent or change the logged-in session identity.
 */

export interface DemoOperatorSession {
  user_id: string;        // 'operator-simulated-l1'
  display_name: string;   // 'Support Agent'
  initials: string;       // 'SA'
  email: string;          // 'agent@rideops.internal'
  role: string;           // 'L1 Support Agent'
  role_code: 'agent';     // Fixed role code
  title: string;          // 'L1 Triage Specialist'
  shift: string;          // 'Day Operations (09:00 - 18:00)'
  team: string;           // 'Transit & Fleet Operations'
  is_simulated: boolean;  // true
  is_authenticated: boolean; // false
  simulation_notice: string;
}

export const CURRENT_DEMO_OPERATOR: DemoOperatorSession = {
  user_id: 'operator-simulated-l1',
  display_name: 'Support Agent',
  initials: 'SA',
  email: 'agent@rideops.internal',
  role: 'L1 Support Agent',
  role_code: 'agent',
  title: 'L1 Triage Specialist',
  shift: 'Day Operations (09:00 - 18:00)',
  team: 'Transit & Fleet Operations',
  is_simulated: true,
  is_authenticated: false,
  simulation_notice: 'Simulated L1 Support Agent operator session for Hackathon v0. Production SSO/Okta scheduled for v1.'
};

// Alias for components referencing user profile
export const CURRENT_DEMO_USER = CURRENT_DEMO_OPERATOR;
export type DemoAgentIdentity = DemoOperatorSession;

export interface AgentRosterItem {
  agent_id: string;
  db_agent_name: string;
  display_name: string;
  initials: string;
  role: string;
}

export const AGENT_ROSTER: AgentRosterItem[] = [
  { agent_id: 'agent-rahul-t', db_agent_name: 'Rahul T', display_name: 'Rahul T', initials: 'RT', role: 'L1 Support Agent' },
  { agent_id: 'agent-ananya-r', db_agent_name: 'Ananya R', display_name: 'Ananya R', initials: 'AR', role: 'L1 Support Agent' },
  { agent_id: 'agent-arjun-k', db_agent_name: 'Arjun K', display_name: 'Arjun K', initials: 'AK', role: 'L1 Support Agent' },
  { agent_id: 'agent-sneha-m', db_agent_name: 'Sneha M', display_name: 'Sneha M', initials: 'SM', role: 'L1 Support Agent' },
  { agent_id: 'agent-karan-b', db_agent_name: 'Karan B', display_name: 'Karan B', initials: 'KB', role: 'L1 Support Agent' },
  { agent_id: 'agent-neha-p', db_agent_name: 'Neha P', display_name: 'Neha P', initials: 'NP', role: 'L1 Support Agent' },
  { agent_id: 'agent-priya-d', db_agent_name: 'Priya D', display_name: 'Priya D', initials: 'PD', role: 'L1 Support Agent' },
  { agent_id: 'agent-vikram-s', db_agent_name: 'Vikram S', display_name: 'Vikram S', initials: 'VS', role: 'L1 Support Agent' }
];

export const getAgentById = (agentId: string): AgentRosterItem | undefined => {
  return AGENT_ROSTER.find(a => a.agent_id === agentId);
};

export const getAgentDbName = (agentId: string): string => {
  if (agentId === 'ALL') return 'ALL';
  const found = getAgentById(agentId);
  return found ? found.db_agent_name : agentId;
};

export const getAgentIdByDbName = (dbName: string): string => {
  const found = AGENT_ROSTER.find(a => a.db_agent_name.toLowerCase() === dbName.toLowerCase());
  return found ? found.agent_id : 'ALL';
};
