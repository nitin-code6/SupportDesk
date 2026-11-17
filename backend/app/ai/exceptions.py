class AIError(Exception):
    """Base exception for all AI provider operations."""
    def __init__(self, message: str, provider: str = "unknown", status_code: int = None):
        super().__init__(message)
        self.message = message
        self.provider = provider
        self.status_code = status_code

class AIAuthenticationError(AIError):
    """Raised when an API key is missing or invalid."""
    pass

class AIRateLimitError(AIError):
    """Raised when provider returns HTTP 429 rate limit."""
    pass

class AITimeoutError(AIError):
    """Raised when an API call times out."""
    pass

class AIValidationError(AIError):
    """Raised when provider response does not match the expected schema or is invalid JSON."""
    pass

class AIServiceUnavailableError(AIError):
    """Raised when provider returns 5xx or server is unreachable."""
    pass

class AllAIProvidersFailedError(Exception):
    """Raised when primary and all fallback providers fail or are unconfigured."""
    def __init__(self, message: str = "All configured AI providers failed or are unavailable"):
        super().__init__(message)
