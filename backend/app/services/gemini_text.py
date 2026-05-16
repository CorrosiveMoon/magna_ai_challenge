import asyncio
import json
from google.genai import types
from ..prompts import blog_post, linkedin_post, ad_copy, email as email_prompt, improve as improve_prompts
from .gemini_client import get_client

_TEXT_MODEL = "gemini-2.5-flash"

_PROMPT_MAP = {
    "blog_post": blog_post,
    "linkedin_post": linkedin_post,
    "ad_copy": ad_copy,
    "email": email_prompt,
}


async def generate_text(topic: str, tone: str, audience: str, content_type: str) -> dict:
    module = _PROMPT_MAP[content_type]
    client = get_client()
    system_prompt = module.SYSTEM_PROMPT
    user_prompt = module.build_user_prompt(topic, tone, audience)

    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.models.generate_content(
                    model=_TEXT_MODEL,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.8,
                        response_mime_type="application/json",
                    ),
                ),
            )
            return json.loads(response.text)
        except Exception as e:
            last_error = e
            if attempt == 0:
                await asyncio.sleep(3)

    raise last_error  # type: ignore[misc]


async def improve_text(text: str, goal: str, target_audience: str | None = None) -> dict:
    client = get_client()
    system_prompt = improve_prompts.build_system_prompt(goal)
    user_prompt = improve_prompts.build_user_prompt(text, goal, target_audience)

    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.models.generate_content(
                    model=_TEXT_MODEL,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.7,
                        response_mime_type="application/json",
                    ),
                ),
            )
            return json.loads(response.text)
        except Exception as e:
            last_error = e
            if attempt == 0:
                await asyncio.sleep(3)

    raise last_error  # type: ignore[misc]
