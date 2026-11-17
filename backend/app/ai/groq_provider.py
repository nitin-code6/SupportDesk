import time
import httpx
from typing import Dict, Any

from .base_provider import BaseAIProvider
from .schemas import (
    TicketSummarizationInput, TicketSummaryResponse,
    InvestigationAssistantInput, InvestigationAssistantResponse,
    EscalationSummaryInput, EscalationSummaryResponse
)
from .response_validator import ResponseValidator
from .exceptions import (
    AIAuthenticationError, AIRateLimitError, AITimeoutError,
    AIServiceUnavailableError, AIValidationError, AIError
)

class GroqProvider(BaseAIProvider):

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile", api_url: str = None, timeout: int = 30):
        url = api_url or "https://api.groq.com/openai/v1/chat/completions"
        super().__init__(name="groq", model=model, api_url=url, api_key=api_key, timeout=timeout)

    def _execute_request(self, prompt: str, system_instruction: str) -> str:
        if not self.is_configured:
            raise AIAuthenticationError("Groq API key is missing or empty", provider=self.name)

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": f"{system_instruction} Always reply in strict JSON format."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
            "max_tokens": 1500
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(self.api_url, headers=headers, json=payload)
        except httpx.TimeoutException:
            raise AITimeoutError(f"Groq request timed out after {self.timeout}s", provider=self.name)
        except httpx.RequestError as e:
            raise AIServiceUnavailableError(f"Network error contacting Groq: {str(e)}", provider=self.name)

        # Handle status codes
        if resp.status_code in (401, 403):
            raise AIAuthenticationError(f"Groq authentication failed (HTTP {resp.status_code})", provider=self.name, status_code=resp.status_code)
        elif resp.status_code == 429:
            raise AIRateLimitError("Groq rate limit exceeded (HTTP 429)", provider=self.name, status_code=429)
        elif resp.status_code >= 500:
            raise AIServiceUnavailableError(f"Groq service error (HTTP {resp.status_code})", provider=self.name, status_code=resp.status_code)
        elif resp.status_code != 200:
            raise AIError(f"Groq API returned error HTTP {resp.status_code}: {resp.text[:200]}", provider=self.name, status_code=resp.status_code)

        data = resp.json()
        choices = data.get("choices", [])
        if not choices:
            raise AIValidationError("Groq returned empty choices list", provider=self.name)

        message = choices[0].get("message", {})
        raw_text = message.get("content", "")
        return raw_text

    def summarize_ticket(self, input_data: TicketSummarizationInput) -> TicketSummaryResponse:
        t0 = time.time()
        system = (
            "You are SupportDesk AI, an intelligent support operations assistant for RideOps. "
            "Analyze the support ticket and generate a structured JSON object. "
            "JSON structure: {\n"
            '  "issue_summary": "One sentence summary",\n'
            '  "reported_symptoms": ["list", "of", "symptoms"],\n'
            '  "affected_service": "Cab Booking / Live GPS / Billing / Roster / Portal",\n'
            '  "important_information": ["key client details or constraints"],\n'
            '  "missing_information": ["critical information not yet provided"],\n'
            '  "potential_investigation_areas": ["suggested areas to check"]\n'
            "}"
        )
        prompt = (
            f"Ticket ID: {input_data.ticket_id}\n"
            f"Client: {input_data.client_name} ({input_data.client_tier})\n"
            f"Category: {input_data.category} | Priority: {input_data.priority}\n"
            f"Description: {input_data.description}\n"
            f"Internal Notes: {input_data.internal_notes or 'None'}\n"
        )
        raw = self._execute_request(prompt, system)
        parsed = ResponseValidator.extract_json_from_text(raw)
        latency = round((time.time() - t0) * 1000, 2)

        return TicketSummaryResponse(
            ticket_id=input_data.ticket_id,
            provider_used=self.name,
            issue_summary=parsed.get("issue_summary", input_data.description),
            reported_symptoms=parsed.get("reported_symptoms", []),
            affected_service=parsed.get("affected_service", input_data.category),
            important_information=parsed.get("important_information", []),
            missing_information=parsed.get("missing_information", []),
            potential_investigation_areas=parsed.get("potential_investigation_areas", []),
            latency_ms=latency
        )

    def assist_investigation(self, input_data: InvestigationAssistantInput) -> InvestigationAssistantResponse:
        t0 = time.time()
        system = (
            "You are an expert diagnostic assistant for RideOps support operations. "
            "Review ticket symptoms and verified investigation checks. "
            "Return valid JSON matching this schema:\n"
            "{\n"
            '  "possible_causes": ["list of likely root causes"],\n'
            '  "suggested_diagnostic_checks": ["specific diagnostic actions"],\n'
            '  "additional_information_required": ["any missing data"],\n'
            '  "recommended_next_steps": ["actionable recommendations for agent"],\n'
            '  "confidence_assessment": "High / Medium / Low with reasoning"\n'
            "}"
        )
        prompt = (
            f"Ticket ID: {input_data.ticket_id}\n"
            f"Category: {input_data.category} | Priority: {input_data.priority}\n"
            f"Description: {input_data.description}\n"
            f"Diagnostic Checks Run: {input_data.completed_checks}\n"
            f"Internal Notes: {input_data.internal_notes or 'None'}\n"
        )
        raw = self._execute_request(prompt, system)
        parsed = ResponseValidator.extract_json_from_text(raw)
        latency = round((time.time() - t0) * 1000, 2)

        return InvestigationAssistantResponse(
            ticket_id=input_data.ticket_id,
            provider_used=self.name,
            possible_causes=parsed.get("possible_causes", []),
            suggested_diagnostic_checks=parsed.get("suggested_diagnostic_checks", []),
            additional_information_required=parsed.get("additional_information_required", []),
            recommended_next_steps=parsed.get("recommended_next_steps", []),
            confidence_assessment=parsed.get("confidence_assessment", "Medium"),
            latency_ms=latency
        )

    def generate_escalation_summary(self, input_data: EscalationSummaryInput) -> EscalationSummaryResponse:
        t0 = time.time()
        system = (
            "You are an escalation review specialist packaging engineering bug tickets. "
            "Ensure the handoff satisfies Sandeep's engineering quality gate. "
            "Return valid JSON matching this schema:\n"
            "{\n"
            '  "original_issue": "Original problem statement",\n'
            '  "concise_problem_summary": "Crisp technical summary for engineering",\n'
            '  "investigation_performed": ["summary of checks completed"],\n'
            '  "actual_recorded_results": ["concrete findings"],\n'
            '  "missing_information": ["remaining uncertainties if any"],\n'
            '  "escalation_reason": "Why this requires code/backend engineering intervention",\n'
            '  "reproduction_steps": ["step 1", "step 2"],\n'
            '  "expected_vs_actual": {"expected": "...", "actual": "..."}\n'
            "}"
        )
        prompt = (
            f"Ticket: {input_data.ticket_id} | Client: {input_data.client_name} ({input_data.client_tier})\n"
            f"Category: {input_data.category} | Priority: {input_data.priority}\n"
            f"Description: {input_data.description}\n"
            f"Investigation Findings: {input_data.investigation_results}\n"
            f"Internal Notes: {input_data.internal_notes or 'None'}\n"
        )
        raw = self._execute_request(prompt, system)
        parsed = ResponseValidator.extract_json_from_text(raw)
        latency = round((time.time() - t0) * 1000, 2)

        return EscalationSummaryResponse(
            ticket_id=input_data.ticket_id,
            provider_used=self.name,
            original_issue=parsed.get("original_issue", input_data.description),
            concise_problem_summary=parsed.get("concise_problem_summary", input_data.description),
            investigation_performed=parsed.get("investigation_performed", []),
            actual_recorded_results=parsed.get("actual_recorded_results", []),
            missing_information=parsed.get("missing_information", []),
            escalation_reason=parsed.get("escalation_reason", "Confirmed reproducible bug"),
            reproduction_steps=parsed.get("reproduction_steps", []),
            expected_vs_actual=parsed.get("expected_vs_actual", {"expected": "Standard operation", "actual": "Error"}),
            latency_ms=latency
        )
