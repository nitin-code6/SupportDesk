import logging
from typing import Dict, Any, Callable, Optional
from .base_provider import BaseAIProvider
from .gemini_provider import GeminiProvider
from .groq_provider import GroqProvider
from .rotation_manager import RotationManager
from .pii_scrubber import scrub_text
from .deterministic_brief import (
    build_deterministic_summary,
    build_deterministic_investigation,
    build_deterministic_escalation
)
from .schemas import (
    TicketSummarizationInput, TicketSummaryResponse,
    InvestigationAssistantInput, InvestigationAssistantResponse,
    EscalationSummaryInput, EscalationSummaryResponse,
    AIHealthStatusResponse
)
from .exceptions import (
    AllAIProvidersFailedError, AIError, AIRateLimitError
)
from ..config import settings

logger = logging.getLogger("supportdesk.ai")

class AIProviderManager:

    def __init__(self):
        self.providers: Dict[str, BaseAIProvider] = {
            "gemini": GeminiProvider(
                api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL,
                api_url=settings.GEMINI_API_URL,
                timeout=settings.AI_REQUEST_TIMEOUT
            ),
            "groq": GroqProvider(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
                api_url=settings.GROQ_API_URL,
                timeout=settings.AI_REQUEST_TIMEOUT
            )
        }
        self.rotation_manager = RotationManager(strategy=settings.AI_ROTATION_STRATEGY)
        self.fallback_enabled = settings.AI_FALLBACK_ENABLED

    def _scrub_input(self, input_obj: Any) -> Any:
        """Sanitizes PII in input models before sending to remote LLMs."""
        if hasattr(input_obj, "description") and input_obj.description:
            input_obj.description = scrub_text(input_obj.description)
        if hasattr(input_obj, "internal_notes") and input_obj.internal_notes:
            input_obj.internal_notes = scrub_text(input_obj.internal_notes)
        return input_obj

    def _execute_with_resilience(
        self,
        action_name: str,
        execute_fn: Callable[[BaseAIProvider], Any],
        fallback_fn: Optional[Callable[[], Any]] = None
    ) -> Any:
        ordered_providers = self.rotation_manager.select_providers(self.providers)
        
        if not ordered_providers:
            if fallback_fn:
                logger.warning(f"No configured AI providers available. Using deterministic fallback for {action_name}.")
                return fallback_fn()
            raise AllAIProvidersFailedError("No AI providers are configured with active API credentials")

        last_error = None
        attempt = 0
        failed_providers = []

        for provider in ordered_providers:
            attempt += 1
            is_fallback = (attempt > 1)

            if not provider.is_available:
                logger.warning(f"AI Provider {provider.name} in cooldown/circuit-open. Skipping to peer...")
                continue

            try:
                logger.info(f"Executing AI {action_name} using provider: {provider.name} (attempt {attempt})")
                result = execute_fn(provider)
                provider.record_success(result.latency_ms)
                
                if is_fallback:
                    provider.record_served_fallback()
                    provider.fallback_count += 1
                    for fp in failed_providers:
                        fp.record_triggered_fallback()
                    logger.info(f"Fallback to {provider.name} succeeded for {action_name}")

                return result

            except AIRateLimitError as e:
                logger.warning(f"AI Provider {provider.name} rate limited: {e.message}")
                provider.record_failure(e.message, is_rate_limit=True)
                failed_providers.append(provider)
                last_error = e
                if not self.fallback_enabled:
                    break

            except AIError as e:
                logger.warning(f"AI Provider {provider.name} failed: {e.message}")
                provider.record_failure(e.message, is_rate_limit=False)
                failed_providers.append(provider)
                last_error = e
                if not self.fallback_enabled:
                    break

            except Exception as e:
                safe_err = str(e)[:150]
                logger.error(f"Unexpected error with {provider.name}: {safe_err}")
                provider.record_failure(safe_err)
                failed_providers.append(provider)
                last_error = e
                if not self.fallback_enabled:
                    break

        # If all providers failed, check if deterministic fallback is explicitly enabled
        if fallback_fn and getattr(settings, "AI_DETERMINISTIC_FALLBACK", False):
            logger.warning(f"All AI providers failed for {action_name}. Serving deterministic rule-based fallback.")
            return fallback_fn()

        raise AllAIProvidersFailedError(
            f"All attempted AI providers failed for {action_name}. Last error: {str(last_error)[:100]}"
        )

    def summarize_ticket(self, input_data: TicketSummarizationInput) -> TicketSummaryResponse:
        scrubbed = self._scrub_input(input_data)
        return self._execute_with_resilience(
            "summarize_ticket",
            lambda p: p.summarize_ticket(scrubbed),
            fallback_fn=lambda: build_deterministic_summary(scrubbed)
        )

    def assist_investigation(self, input_data: InvestigationAssistantInput) -> InvestigationAssistantResponse:
        scrubbed = self._scrub_input(input_data)
        return self._execute_with_resilience(
            "assist_investigation",
            lambda p: p.assist_investigation(scrubbed),
            fallback_fn=lambda: build_deterministic_investigation(scrubbed)
        )

    def generate_escalation_summary(self, input_data: EscalationSummaryInput) -> EscalationSummaryResponse:
        scrubbed = self._scrub_input(input_data)
        return self._execute_with_resilience(
            "generate_escalation_summary",
            lambda p: p.generate_escalation_summary(scrubbed),
            fallback_fn=lambda: build_deterministic_escalation(scrubbed)
        )

    def get_health_status(self) -> AIHealthStatusResponse:
        health_map = {name: p.get_health_status() for name, p in self.providers.items()}
        healthy_count = len([p for p in health_map.values() if p.is_available])
        
        return AIHealthStatusResponse(
            active_strategy=self.rotation_manager.strategy,
            fallback_enabled=self.fallback_enabled,
            healthy_providers_count=healthy_count,
            providers=health_map
        )

# Global singleton instance
ai_manager = AIProviderManager()
