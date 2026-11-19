"""
Central Demo User & Agent Identity Configuration for SupportDesk Hackathon v0.

DISCLAIMER & NOTICE:
This identity configuration represents a SIMULATED L1 operator session for hackathon evaluation.
Production enterprise authentication (SSO, SAML 2.0, Okta, OIDC) is planned for v1.
The operator role is strictly fixed to 'L1 Support Agent'.
The agent selector is a queue-filtering tool and does not change the logged-in session.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel

class DemoUserProfile(BaseModel):
    user_id: str
    display_name: str
    initials: str
    email: str
    role: str
    role_code: str
    title: str
    shift: str
    team: str
    is_simulated: bool
    is_authenticated: bool
    simulation_notice: str

DEFAULT_DEMO_L1_OPERATOR: Dict[str, Any] = {
    "user_id": "operator-simulated-l1",
    "display_name": "Support Agent",
    "initials": "SA",
    "email": "agent@rideops.internal",
    "role": "L1 Support Agent",
    "role_code": "agent",
    "title": "L1 Triage Specialist",
    "shift": "Day Operations (09:00 - 18:00)",
    "team": "Transit & Fleet Operations",
    "is_simulated": True,
    "is_authenticated": False,
    "simulation_notice": (
        "Simulated L1 Support Agent operator session for Hackathon v0. "
        "Production enterprise authentication (SSO/Okta) is planned for v1."
    ),
}

# Canonical roster of all 8 L1 Support Agents in the RideOps database
AGENT_ROSTER: List[Dict[str, Any]] = [
    {
        "agent_id": "agent-rahul-t",
        "db_agent_name": "Rahul T",
        "display_name": "Rahul T",
        "initials": "RT",
        "role": "L1 Support Agent",
    },
    {
        "agent_id": "agent-ananya-r",
        "db_agent_name": "Ananya R",
        "display_name": "Ananya R",
        "initials": "AR",
        "role": "L1 Support Agent",
    },
    {
        "agent_id": "agent-arjun-k",
        "db_agent_name": "Arjun K",
        "display_name": "Arjun K",
        "initials": "AK",
        "role": "L1 Support Agent",
    },
    {
        "agent_id": "agent-sneha-m",
        "db_agent_name": "Sneha M",
        "display_name": "Sneha M",
        "initials": "SM",
        "role": "L1 Support Agent",
    },
    {
        "agent_id": "agent-karan-b",
        "db_agent_name": "Karan B",
        "display_name": "Karan B",
        "initials": "KB",
        "role": "L1 Support Agent",
    },
    {
        "agent_id": "agent-neha-p",
        "db_agent_name": "Neha P",
        "display_name": "Neha P",
        "initials": "NP",
        "role": "L1 Support Agent",
    },
    {
        "agent_id": "agent-priya-d",
        "db_agent_name": "Priya D",
        "display_name": "Priya D",
        "initials": "PD",
        "role": "L1 Support Agent",
    },
    {
        "agent_id": "agent-vikram-s",
        "db_agent_name": "Vikram S",
        "display_name": "Vikram S",
        "initials": "VS",
        "role": "L1 Support Agent",
    },
]

def get_current_demo_operator() -> Dict[str, Any]:
    return DEFAULT_DEMO_L1_OPERATOR

def resolve_agent_name(agent_id_or_name: Optional[Any]) -> Optional[str]:
    """
    Resolves an agent identifier (e.g., 'agent-rahul-t', 'rahul_t', 'Rahul T')
    to the canonical database string stored in the assigned_agent column.
    """
    if not agent_id_or_name or not isinstance(agent_id_or_name, str) or agent_id_or_name == "ALL":
        return agent_id_or_name if isinstance(agent_id_or_name, str) else None
    
    clean = agent_id_or_name.strip().lower()
    for agent in AGENT_ROSTER:
        if agent["agent_id"] == clean or agent["db_agent_name"].lower() == clean:
            return agent["db_agent_name"]
            
    return agent_id_or_name
