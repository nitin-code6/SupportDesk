import re
import json
from typing import Type, TypeVar
from pydantic import BaseModel, ValidationError
from .exceptions import AIValidationError

T = TypeVar("T", bound=BaseModel)

class ResponseValidator:
    
    @staticmethod
    def extract_json_from_text(raw_text: str) -> dict:
        """Strips markdown fences, whitespace, and parses JSON object."""
        if not raw_text or not raw_text.strip():
            raise AIValidationError("Received empty response from AI provider")

        cleaned = raw_text.strip()
        # Remove markdown code fences if present
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        # Find first '{' and last '}'
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            cleaned = cleaned[start_idx:end_idx + 1]

        try:
            parsed = json.loads(cleaned)
            if not isinstance(parsed, dict):
                raise AIValidationError("Parsed JSON is not an object/dictionary")
            return parsed
        except json.JSONDecodeError as e:
            raise AIValidationError(f"Invalid JSON returned: {e.msg}")

    @classmethod
    def validate_and_parse(cls, raw_text: str, schema_class: Type[T]) -> dict:
        """Parses JSON text and validates against the provided Pydantic model."""
        parsed_dict = cls.extract_json_from_text(raw_text)
        try:
            # Validate through model
            schema_class.model_validate(parsed_dict)
            return parsed_dict
        except ValidationError as e:
            raise AIValidationError(f"Schema validation failed: {e.error_count()} errors found")
