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

class GeminiProvider(BaseAIProvider):
    
    def __init__(self, api_key: str, model: str = "gemini-3.8-flash", api_url: str = None, timeout: int = 30):
        url = api_url or "https://generativelanguage.googleapis.com/v1beta/interactions"
        super().__init__(name="gemini", model=model, api_url=url, api_key=api_key, timeout=timeout)

    def _execute_request(self, prompt: str, system_instruction: str) -> str:
        if not self.is_configured:
            raise AIAuthenticationError("Google Gemini API key is missing or empty", provider=self.name)

        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }

        # Check endpoint style
        if "interactions" in self.api_url:
            payload = {
                "model": self.model,
                "input": f"{system_instruction}\n\nUSER PROMPT: {prompt}\nIMPORTANT: Respond with pure JSON only."
            }
        else:
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": f"{system_instruction}\n\n{prompt}"}]}
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }

        url = self.api_url
        if "generateContent" in url and "key=" not in url:
            url = f"{url}?key={self.api_key}"

        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException:
            raise AITimeoutError(f"Gemini request timed out after {self.timeout}s", provider=self.name)
        except httpx.RequestError as e:
            raise AIServiceUnavailableError(f"Network error contacting Gemini: {str(e)}", provider=self.name)

        # Handle HTTP status codes
        if resp.status_code == 401 or resp.status_code == 403:
            raise AIAuthenticationError(f"Gemini authentication failed (HTTP {resp.status_code})", provider=self.name, status_code=resp.status_code)
        elif resp.status_code == 429:
            raise AIRateLimitError("Gemini rate limit exceeded (HTTP 429)", provider=self.name, status_code=429)
        elif resp.status_code >= 500:
            raise AIServiceUnavailableError(f"Gemini service error (HTTP {resp.status_code})", provider=self.name, status_code=resp.status_code)
        elif resp.status_code != 200:
            raise AIError(f"Gemini API returned error HTTP {resp.status_code}: {resp.text[:200]}", provider=self.name, status_code=resp.status_code)

        data = resp.json()

        # Parse output from interactions format or generateContent format
        raw_text = ""
        if "output" in data:
            # Interactions format
            raw_text = data["output"] if isinstance(data["output"], str) else str(data["output"])
        elif "candidates" in data and data["candidates"]:
            cand = data["candidates"][0]
            parts = cand.get("content", {}).get("parts", [])
            if parts and "text" in parts[0]:
                raw_text = parts[0]["text"]
        elif "text" in data:
            raw_text = data["text"]
        else:
            raw_text = str(data)

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
