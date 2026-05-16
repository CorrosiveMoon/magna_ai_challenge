import json
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user
from ..deps import get_supabase_admin
from ..schemas.generation import (
    GenerateTextRequest, GenerateTextResponse,
    GenerateImageRequest, GenerateImageResponse,
)
from ..services import gemini_text, gemini_image, storage as storage_svc

router = APIRouter(prefix="/generate", tags=["generate"])


def _normalize(content_type: str, result: dict) -> tuple[str | None, str]:
    """Return (title, display_body) from the raw AI result dict."""
    if content_type == "blog_post":
        return result.get("title"), result.get("body", "")

    if content_type == "linkedin_post":
        body = result.get("body", "")
        hashtags = result.get("hashtags", [])
        if hashtags:
            body = f"{body}\n\n{' '.join(hashtags)}"
        return None, body

    if content_type == "ad_copy":
        headline = result.get("headline", "")
        variants = result.get("body_variants", [])
        cta = result.get("cta", "")
        lines: list[str] = [f"**{headline}**", ""]
        for i, variant in enumerate(variants, 1):
            lines.append(f"**Option {i}:** {variant}")
            lines.append("")
        if cta:
            lines.append(f"**CTA:** {cta}")
        return headline or None, "\n".join(lines)

    if content_type == "email":
        subject = result.get("subject", "")
        preview = result.get("preview_text", "")
        body = result.get("body", "")
        cta_label = result.get("cta_label", "")
        cta_url = result.get("cta_url_placeholder", "#")
        parts: list[str] = []
        if preview:
            parts.append(f"*{preview}*\n")
        parts.append(body)
        if cta_label:
            parts.append(f"\n**CTA:** [{cta_label}]({cta_url})")
        return subject or None, "\n".join(parts)

    return None, json.dumps(result)


@router.post("/text", response_model=GenerateTextResponse)
async def generate_text(
    body: GenerateTextRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Any = Depends(get_supabase_admin),
):
    try:
        result = await gemini_text.generate_text(
            topic=body.topic,
            tone=body.tone,
            audience=body.audience,
            content_type=body.content_type,
        )
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="AI returned malformed response — please retry") from exc
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {str(e)}") from e

    title, content_body = _normalize(body.content_type, result)

    row = (
        supabase.table("generations")
        .insert({
            "user_id": current_user["id"],
            "content_type": body.content_type,
            "topic": body.topic,
            "tone": body.tone,
            "audience": body.audience,
            "title": title,
            "body": content_body,
            "metadata": result,
        })
        .execute()
    )

    if not row.data:
        raise HTTPException(status_code=500, detail="Failed to persist generation")

    record = row.data[0]
    return GenerateTextResponse(
        id=record["id"],
        title=record.get("title"),
        body=record["body"],
        content_type=record["content_type"],
        metadata=result,
        created_at=record["created_at"],
    )


@router.post("/image", response_model=GenerateImageResponse)
async def generate_image(
    body: GenerateImageRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Any = Depends(get_supabase_admin),
):
    gen_id = str(body.generation_id)

    rows = (
        supabase.table("generations")
        .select("id, topic, tone, content_type")
        .eq("id", gen_id)
        .eq("user_id", current_user["id"])
        .limit(1)
        .execute()
    )
    if not rows.data:
        raise HTTPException(status_code=404, detail="Generation not found")

    gen = rows.data[0]
    image_prompt = gemini_image.build_image_prompt(
        topic=gen["topic"],
        tone=gen["tone"],
        content_type=gen["content_type"],
        style=body.style,
    )

    try:
        img_bytes = await gemini_image.generate_image(
            topic=gen["topic"],
            tone=gen["tone"],
            content_type=gen["content_type"],
            style=body.style,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Image generation failed: {str(e)}") from e

    try:
        image_url = storage_svc.upload_image(supabase, current_user["id"], gen_id, img_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}") from e

    supabase.table("generations").update({
        "image_url": image_url,
        "image_style": body.style,
        "image_prompt": image_prompt,
    }).eq("id", gen_id).execute()

    return GenerateImageResponse(
        id=body.generation_id,
        image_url=image_url,
        image_style=body.style,
    )
