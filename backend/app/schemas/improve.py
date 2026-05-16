from pydantic import BaseModel, field_validator, model_validator
from typing import Optional

VALID_GOALS = {"shorter", "more_persuasive", "more_formal", "seo_optimized", "rewrite_for_audience"}


class ImproveRequest(BaseModel):
    text: str
    goal: str
    target_audience: Optional[str] = None

    @field_validator("goal")
    @classmethod
    def validate_goal(cls, v: str) -> str:
        if v not in VALID_GOALS:
            raise ValueError(f"goal must be one of {VALID_GOALS}")
        return v

    @model_validator(mode="after")
    def audience_required_for_rewrite(self) -> "ImproveRequest":
        if self.goal == "rewrite_for_audience" and not self.target_audience:
            raise ValueError("target_audience is required when goal is 'rewrite_for_audience'")
        return self


class ImproveResponse(BaseModel):
    improved_text: str
    changes: list[str]
