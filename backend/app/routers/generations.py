import io
from datetime import datetime
from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from ..auth import get_current_user
from ..deps import get_supabase_admin
from ..schemas.generation import GenerationItem, GenerationList, ExportRequest
from ..services import storage as storage_svc, export as export_svc

router = APIRouter(prefix="/generations", tags=["generations"])


def _row_to_item(r: dict) -> GenerationItem:
    return GenerationItem(
        id=r["id"],
        content_type=r["content_type"],
        topic=r["topic"],
        tone=r["tone"],
        audience=r["audience"],
        title=r.get("title"),
        body=r["body"],
        image_url=r.get("image_url"),
        image_style=r.get("image_style"),
        metadata=r.get("metadata"),
        created_at=r["created_at"],
    )


@router.get("", response_model=GenerationList)
async def list_generations(
    page: int = 1,
    page_size: int = 10,
    current_user: dict = Depends(get_current_user),
    supabase: Any = Depends(get_supabase_admin),
):
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    offset = (page - 1) * page_size

    count_res = (
        supabase.table("generations")
        .select("id", count="exact")
        .eq("user_id", current_user["id"])
        .execute()
    )
    total = count_res.count or 0

    rows = (
        supabase.table("generations")
        .select("*")
        .eq("user_id", current_user["id"])
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    return GenerationList(
        items=[_row_to_item(r) for r in (rows.data or [])],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/{generation_id}", response_model=GenerationItem)
async def get_generation(
    generation_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Any = Depends(get_supabase_admin),
):
    rows = (
        supabase.table("generations")
        .select("*")
        .eq("id", str(generation_id))
        .eq("user_id", current_user["id"])
        .limit(1)
        .execute()
    )
    if not rows.data:
        raise HTTPException(status_code=404, detail="Generation not found")
    return _row_to_item(rows.data[0])


@router.delete("/{generation_id}", status_code=204)
async def delete_generation(
    generation_id: UUID,
    current_user: dict = Depends(get_current_user),
    supabase: Any = Depends(get_supabase_admin),
):
    rows = (
        supabase.table("generations")
        .select("id, image_url")
        .eq("id", str(generation_id))
        .eq("user_id", current_user["id"])
        .limit(1)
        .execute()
    )
    if not rows.data:
        raise HTTPException(status_code=404, detail="Generation not found")
    row = rows.data[0]

    if row.get("image_url"):
        try:
            storage_svc.delete_image(supabase, current_user["id"], str(generation_id))
        except Exception:
            pass  # storage failure must not block the DB delete

    supabase.table("generations").delete().eq("id", str(generation_id)).execute()
    return Response(status_code=204)


@router.post("/{generation_id}/export")
async def export_generation(
    generation_id: UUID,
    body: ExportRequest,
    current_user: dict = Depends(get_current_user),
    supabase: Any = Depends(get_supabase_admin),
):
    rows = (
        supabase.table("generations")
        .select("*")
        .eq("id", str(generation_id))
        .eq("user_id", current_user["id"])
        .limit(1)
        .execute()
    )
    if not rows.data:
        raise HTTPException(status_code=404, detail="Generation not found")

    gen = rows.data[0]
    created_at = datetime.fromisoformat(gen["created_at"].replace("Z", "+00:00"))

    if body.format == "pdf":
        file_bytes = await export_svc.export_pdf(
            title=gen.get("title") or gen["topic"],
            body=gen["body"],
            image_url=gen.get("image_url"),
            created_at=created_at,
        )
        media_type = "application/pdf"
        filename = f"generation-{generation_id}.pdf"
    else:
        file_bytes = await export_svc.export_docx(
            title=gen.get("title") or gen["topic"],
            body=gen["body"],
            image_url=gen.get("image_url"),
            created_at=created_at,
        )
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"generation-{generation_id}.docx"

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
