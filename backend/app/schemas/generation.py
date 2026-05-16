from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID

VALID_CONTENT_TYPES = {"blog_post", "linkedin_post", "ad_copy", "email"}
VALID_STYLES = {"photoreal", "illustration", "minimal", "3d", "watercolor"}


class GenerateTextRequest(BaseModel):
    topic: str
    tone: str
    audience: str
    content_type: str

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, v: str) -> str:
        if v not in VALID_CONTENT_TYPES:
            raise ValueError(f"content_type must be one of {VALID_CONTENT_TYPES}")
        return v


class GenerateTextResponse(BaseModel):
    id: UUID
    title: Optional[str]
    body: str
    content_type: str
    metadata: Optional[dict] = None
    created_at: datetime


class GenerateImageRequest(BaseModel):
    generation_id: UUID
    style: str = "photoreal"

    @field_validator("style")
    @classmethod
    def validate_style(cls, v: str) -> str:
        if v not in VALID_STYLES:
            raise ValueError(f"style must be one of {VALID_STYLES}")
        return v


class GenerateImageResponse(BaseModel):
    id: UUID
    image_url: str
    image_style: str


class GenerationItem(BaseModel):
    id: UUID
    content_type: str
    topic: str
    tone: str
    audience: str
    title: Optional[str]
    body: str
    image_url: Optional[str]
    image_style: Optional[str]
    metadata: Optional[dict] = None
    created_at: datetime


class GenerationList(BaseModel):
    items: list[GenerationItem]
    page: int
    page_size: int
    total: int


class ExportRequest(BaseModel):
    format: str

    @field_validator("format")
    @classmethod
    def validate_format(cls, v: str) -> str:
        if v not in {"pdf", "docx"}:
            raise ValueError("format must be 'pdf' or 'docx'")
        return v


class ExportResponse(BaseModel):
    download_url: str
