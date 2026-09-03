import json
import logging
from typing import Any, Optional

from openai import AsyncOpenAI, APIError, RateLimitError, APITimeoutError
from src.backend.core.config import get_settings

logger = logging.getLogger(__name__)

# Initialize centralized AsyncOpenAI clients
settings = get_settings()

openrouter_client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=settings.openrouter_api_key or "sk-or-v1-placeholder",
    max_retries=1,
)

ollama_base_url = (getattr(settings, "ollama_base_url", None) or "http://host.docker.internal:11434").rstrip("/")
ollama_client = AsyncOpenAI(
    base_url=f"{ollama_base_url}/v1",
    api_key="ollama",
    max_retries=1,
)

def _get_client(model: str) -> AsyncOpenAI:
    return openrouter_client if "/" in model else ollama_client


async def generate_json(model_or_models: str | list[str], prompt: str, max_tokens: int = 1500) -> Optional[list | dict]:
    """
    Call OpenRouter LLM and return parsed JSON. Falls back to next model on API error.
    """
    models = [model_or_models] if isinstance(model_or_models, str) else model_or_models
    
    for model in models:
        try:
            client = _get_client(model)
            response = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=0.1,  # Low temperature for extraction
            )
            content = response.choices[0].message.content
            if not content:
                continue
                
            # Robust JSON extraction: Find the first { or [ and last } or ]
            content = content.strip()
            start_idx = -1
            for i, c in enumerate(content):
                if c in ('{', '['):
                    start_idx = i
                    break
            
            end_idx = -1
            for i in range(len(content) - 1, -1, -1):
                if content[i] in ('}', ']'):
                    end_idx = i
                    break
                    
            if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
                content = content[start_idx:end_idx+1]
            
            try:
                return json.loads(content)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON from LLM ({model}): {e}. Raw extracted content: {repr(content)}. Trying next model...")
                continue
            
        except (APIError, RateLimitError, APITimeoutError) as e:
            logger.warning(f"OpenRouter API error ({model}): {e}. Trying next model...")
        except Exception as e:
            logger.error(f"Unexpected error in LLM generation ({model}): {e}. Trying next model...")
            
    logger.error("All fallback models failed for generate_json.")
    return None


async def generate_text(model_or_models: str | list[str], prompt: str, max_tokens: int = 1000, temperature: float = 0.7) -> Optional[str]:
    """
    Call OpenRouter LLM and return raw text. Falls back to next model on API error.
    """
    models = [model_or_models] if isinstance(model_or_models, str) else model_or_models
    
    for model in models:
        try:
            client = _get_client(model)
            response = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content
            
        except (APIError, RateLimitError, APITimeoutError) as e:
            logger.warning(f"OpenRouter API error ({model}): {e}. Trying next model...")
        except Exception as e:
            logger.error(f"Unexpected error in LLM generation ({model}): {e}. Trying next model...")
            
    logger.error("All fallback models failed for generate_text.")
    return None
