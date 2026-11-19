"""
Category-Specific Diagnostic Rules & Guided Triage Engine
Loads diagnostic protocols from external configuration (diagnostic_protocols.json).
"""

import json
import os
from typing import List, Dict, Any

_CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", "diagnostic_protocols.json")

def _load_protocols() -> Dict[str, List[Dict[str, Any]]]:
    try:
        if os.path.exists(_CONFIG_PATH):
            with open(_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        import logging
        logging.getLogger("supportdesk").warning(f"Failed to load diagnostic_protocols.json: {e}")
    return {}

CATEGORY_DIAGNOSTIC_RULES = _load_protocols()

def get_checklist_for_category(category: str) -> List[Dict[str, Any]]:
    """Returns the diagnostic checklist tailored for the given category."""
    protocols = _load_protocols()
    rules = protocols.get(category, protocols.get("DEFAULT", []))
    return rules
