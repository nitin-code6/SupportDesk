from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from .schemas import (
    TicketSummarizationInput, TicketSummaryResponse,
    InvestigationAssistantInput, InvestigationAssistantResponse,
    EscalationSummaryInput, EscalationSummaryResponse,
    ProviderHealthStatus
)

class BaseAIProvider(ABC):
    
    def __init__(self, name: str, model: str, api_url: str, api_key: str, timeout: int = 30):
        self.name = name
        self.model = model
        self.api_url = api_url
        self.api_key = api_key
        self.timeout = timeout
        
        # Telemetry & Observability
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.fallback_count = 0
        self.rate_limit_count = 0
        self.total_latency_ms = 0.0
        self.last_error: Optional[str] = None
        self.cooldown_until: Optional[datetime] = None

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    @property
    def is_available(self) -> bool:
        if not self.is_configured:
            return False
        if self.cooldown_until:
            now = datetime.now(timezone.utc)
            if now < self.cooldown_until:
                return False
            else:
                self.cooldown_until = None
        return True

    def record_success(self, latency_ms: float):
        self.total_requests += 1
        self.successful_requests += 1
        self.total_latency_ms += latency_ms
        self.last_error = None
        self.cooldown_until = None

    def record_failure(self, error_message: str, is_rate_limit: bool = False, cooldown_seconds: int = 30):
        self.total_requests += 1
        self.failed_requests += 1
        # Strip any accidental secrets from error message
        safe_msg = error_message.replace(self.api_key, "[REDACTED]") if self.api_key else error_message
        self.last_error = safe_msg[:200]
        
        if is_rate_limit:
            self.rate_limit_count += 1
            # Apply temporary cooldown for rate limit
            self.cooldown_until = datetime.now(timezone.utc) + timedelta(seconds=cooldown_seconds)
        elif "timeout" in safe_msg.lower() or "503" in safe_msg or "502" in safe_msg:
            # 15 second cooldown on temporary connection/service outages
            self.cooldown_until = datetime.now(timezone.utc) + timedelta(seconds=15)

    def get_health_status(self) -> ProviderHealthStatus:
        avg_lat = (self.total_latency_ms / self.successful_requests) if self.successful_requests > 0 else 0.0
        remaining_cooldown = 0.0
        if self.cooldown_until:
            now = datetime.now(timezone.utc)
            if self.cooldown_until > now:
                remaining_cooldown = round((self.cooldown_until - now).total_seconds(), 1)
        
        return ProviderHealthStatus(
            name=self.name,
            is_configured=self.is_configured,
            is_available=self.is_available,
            total_requests=self.total_requests,
            successful_requests=self.successful_requests,
            failed_requests=self.failed_requests,
            fallback_count=self.fallback_count,
            rate_limit_count=self.rate_limit_count,
            avg_latency_ms=round(avg_lat, 2),
            last_error=self.last_error,
            cooldown_seconds_remaining=remaining_cooldown
        )

    @abstractmethod
    def summarize_ticket(self, input_data: TicketSummarizationInput) -> TicketSummaryResponse:
        pass

    @abstractmethod
    def assist_investigation(self, input_data: InvestigationAssistantInput) -> InvestigationAssistantResponse:
        pass

    @abstractmethod
    def generate_escalation_summary(self, input_data: EscalationSummaryInput) -> EscalationSummaryResponse:
        pass
