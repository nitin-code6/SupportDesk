"""
PII Scrubber for LLM Data Privacy Compliance
Masks sensitive customer identifying information before sending prompts to external AI providers.
"""

import re
from typing import Dict, Any, List

# Regular expressions for common PII patterns
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_REGEX = re.compile(r'(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b')
EMP_ID_REGEX = re.compile(r'\b(EMP[-_]?[0-9]{3,8}|RIDE[-_]?[0-9]{3,8})\b', re.IGNORECASE)
CREDIT_CARD_REGEX = re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b')
OTP_REGEX = re.compile(r'\b(?:otp|code|pin)[:\s]+([0-9]{4,6})\b', re.IGNORECASE)

def scrub_text(text: str) -> str:
    """Masks phone numbers, emails, employee IDs, credit card numbers, and OTPs."""
    if not text:
        return ""
    
    # Redact credit card numbers first (16 digits)
    text = CREDIT_CARD_REGEX.sub("[CARD-REDACTED]", text)
    
    # Redact emails
    text = EMAIL_REGEX.sub("[EMAIL-REDACTED]", text)
    
    # Redact Employee IDs
    text = EMP_ID_REGEX.sub("[EMP-ID-REDACTED]", text)
    
    # Redact OTPs
    text = OTP_REGEX.sub(lambda m: m.group(0).replace(m.group(1), "[OTP-REDACTED]"), text)
    
    # Redact phone numbers (avoiding redacting common 4-digit years or IDs)
    def mask_phone(match):
        val = match.group(0).strip()
        # If it looks like a year (e.g. 2026), skip
        if len(val) == 4 and (val.startswith("19") or val.startswith("20")):
            return val
        return "[PHONE-REDACTED]"
    
    text = PHONE_REGEX.sub(mask_phone, text)
    
    return text

def scrub_input_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively scrubs strings in a dictionary."""
    scrubbed = {}
    for k, v in data.items():
        if isinstance(v, str):
            scrubbed[k] = scrub_text(v)
        elif isinstance(v, dict):
            scrubbed[k] = scrub_input_dict(v)
        elif isinstance(v, list):
            scrubbed[k] = [
                scrub_text(item) if isinstance(item, str)
                else (scrub_input_dict(item) if isinstance(item, dict) else item)
                for item in v
            ]
        else:
            scrubbed[k] = v
    return scrubbed
