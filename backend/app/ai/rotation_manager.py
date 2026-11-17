import threading
from typing import List, Dict
from .base_provider import BaseAIProvider

class RotationManager:

    def __init__(self, strategy: str = "round_robin"):
        self.strategy = strategy
        self._lock = threading.Lock()
        self._counter = 0

    def set_strategy(self, strategy: str):
        with self._lock:
            self.strategy = strategy

    def select_providers(self, providers: Dict[str, BaseAIProvider]) -> List[BaseAIProvider]:
        """
        Returns an ordered list of providers to attempt:
        [primary_provider, fallback_provider, ...]
        """
        with self._lock:
            configured = [p for p in providers.values() if p.is_configured]
            if not configured:
                return []

            if self.strategy == "gemini_first":
                # Gemini preferred, then Groq
                sorted_list = sorted(configured, key=lambda p: 0 if p.name == "gemini" else 1)
                return sorted_list

            elif self.strategy == "groq_first":
                # Groq preferred, then Gemini
                sorted_list = sorted(configured, key=lambda p: 0 if p.name == "groq" else 1)
                return sorted_list

            elif self.strategy == "primary_fallback":
                # Default order as defined
                return configured

            else:
                # Default: Round Robin
                # Pick primary based on counter, followed by the remaining
                count = len(configured)
                idx = self._counter % count
                self._counter += 1
                
                ordered = [configured[idx]]
                for i in range(count):
                    if i != idx:
                        ordered.append(configured[i])
                return ordered
