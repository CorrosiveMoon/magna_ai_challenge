import asyncio
import base64
from openai import OpenAI
from ..config import settings

# Switch between providers by toggling which _IMAGE_MODEL and generate_image body is active.
# Gemini implementation is preserved below as a commented block for easy rollback.

_IMAGE_MODEL = "gpt-image-2"
# Cheaper alternative — swap model name only: "dall-e-2"

_STYLE_DIRECTIVES: dict[str, str] = {
    "photoreal": "professional photography, natural lighting, shallow depth of field",
    "illustration": "flat vector illustration, bold colors, clean lines",
    "minimal": "minimalist composition, lots of whitespace, single focal subject",
    "3d": "modern 3D render, soft shadows, isometric perspective",
    "watercolor": "watercolor painting, soft edges, pastel palette",
}

_CONTENT_CONTEXTS: dict[str, str] = {
    "blog_post": "editorial hero image suitable for an article header",
    "linkedin_post": "professional, on-brand social media image, square 1:1",
    "ad_copy": "high-impact advertising visual, attention-grabbing",
    "email": "warm, inviting header image for an email campaign",
}

_openai_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=settings.openai_api_key)
    return _openai_client


def build_image_prompt(topic: str, tone: str, content_type: str, style: str = "photoreal") -> str:
    style_directive = _STYLE_DIRECTIVES.get(style, _STYLE_DIRECTIVES["photoreal"])
    content_context = _CONTENT_CONTEXTS.get(content_type, "professional marketing image")
    return (
        f"{content_context}. Subject: {topic}. "
        f"Mood matches tone '{tone}'. "
        f"Style: {style_directive}. "
        f"No text or typography in the image. High quality, 1024x1024."
    )


async def generate_image(topic: str, tone: str, content_type: str, style: str = "photoreal") -> bytes:
    prompt = build_image_prompt(topic, tone, content_type, style)
    client = _get_client()

    last_error: Exception | None = None
    for attempt in range(2):
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.images.generate(
                    model=_IMAGE_MODEL,
                    prompt=prompt,
                    size="1024x1024",
                ),
            )
            return base64.b64decode(result.data[0].b64_json)
        except Exception as e:
            last_error = e
            if attempt == 0:
                await asyncio.sleep(3)

    raise last_error  # type: ignore[misc]


# =============================================================================
# GEMINI ROLLBACK — to re-enable:
#   1. Comment out the OpenAI block above (imports + _openai_client + generate_image)
#   2. Uncomment everything below
#   3. Change config.py back to use gemini_api_key only
# =============================================================================
#
# import asyncio
# from google.genai import types
# from .gemini_client import get_client as get_gemini_client
#
# _GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image"
#
# _openai_client = None  # unused in Gemini mode
#
# def _get_client():
#     return get_gemini_client()
#
# async def generate_image(topic: str, tone: str, content_type: str, style: str = "photoreal") -> bytes:
#     prompt = build_image_prompt(topic, tone, content_type, style)
#     client = get_gemini_client()
#
#     last_error: Exception | None = None
#     for attempt in range(2):
#         try:
#             response = await asyncio.get_event_loop().run_in_executor(
#                 None,
#                 lambda: client.models.generate_content(
#                     model=_GEMINI_IMAGE_MODEL,
#                     contents=prompt,
#                     config=types.GenerateContentConfig(
#                         response_modalities=["IMAGE"],
#                     ),
#                 ),
#             )
#             for part in response.candidates[0].content.parts:
#                 if part.inline_data is not None:
#                     return part.inline_data.data
#             raise ValueError("Model returned no image data")
#         except Exception as e:
#             last_error = e
#             if attempt == 0:
#                 await asyncio.sleep(3)
#
#     raise last_error
