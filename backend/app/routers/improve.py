import json
from fastapi import APIRouter, Depends, HTTPException
from ..auth import get_current_user
from ..schemas.improve import ImproveRequest, ImproveResponse
from ..services import gemini_text

router = APIRouter(prefix="/improve", tags=["improve"])


@router.post("", response_model=ImproveResponse)
async def improve_content(
    body: ImproveRequest,
    _current_user: dict = Depends(get_current_user),
):
    try:
        result = await gemini_text.improve_text(
            text=body.text,
            goal=body.goal,
            target_audience=body.target_audience,
        )
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="AI returned malformed response — please retry") from exc
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI improvement failed: {str(e)}") from e

    return ImproveResponse(
        improved_text=result["improved_text"],
        changes=result["changes"],
    )
