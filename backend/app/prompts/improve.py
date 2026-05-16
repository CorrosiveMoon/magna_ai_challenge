_GOAL_INSTRUCTIONS: dict[str, str] = {
    "shorter": (
        "Make the text significantly more concise. Cut filler words, redundant phrases, "
        "and content that doesn't add value. Preserve the core message and key points."
    ),
    "more_persuasive": (
        "Rewrite to be more persuasive. Add urgency in the opening, replace passive voice, "
        "use social proof language, and end with a stronger call to action."
    ),
    "more_formal": (
        "Elevate the tone to be more professional and formal. Use precise vocabulary, "
        "eliminate contractions, and structure sentences more formally."
    ),
    "seo_optimized": (
        "Optimize for search engines. Naturally integrate the main keyword (inferred from the text) "
        "into headings, the first paragraph, and throughout. Improve meta-friendly phrasing."
    ),
    "rewrite_for_audience": (
        "Completely rewrite this content for the specified target audience. "
        "Adjust vocabulary, examples, pain points, and cultural references to resonate with them."
    ),
}

_SYSTEM_PREFIX = """\
You are an expert content editor. Output JSON only. No preamble, no markdown fences around the JSON.

Return exactly this schema: {"improved_text": "string", "changes": ["string", "string", "string"]}

The "changes" array must have 3–5 items. Each item is a concise bullet describing one specific \
change made and why it improves the content.\
"""


def build_system_prompt(goal: str) -> str:
    instruction = _GOAL_INSTRUCTIONS.get(goal, "Improve the overall quality and clarity of the text.")
    return f"{_SYSTEM_PREFIX}\n\nImprovement goal: {instruction}"


def build_user_prompt(text: str, goal: str, target_audience: str | None = None) -> str:
    prompt = f"Improve this content:\n\n{text}"
    if goal == "rewrite_for_audience" and target_audience:
        prompt += f"\n\nTarget audience to rewrite for: {target_audience}"
    return prompt
