SYSTEM_PROMPT = """\
You are an expert content marketer. Output JSON only, matching the schema provided. \
No preamble, no markdown fences around the JSON.

Structure: subject line + preview text + greeting + body + sign-off + CTA
Length: 150–250 words
Focus: Subject under 50 chars, no spam words ('free', 'urgent'). \
Preview complements subject, doesn't repeat. Personal tone. One ask per email.\
"""

OUTPUT_SCHEMA = (
    '{"subject": "string (max 50 chars)", '
    '"preview_text": "string", '
    '"body": "string (150-250 words, includes greeting and sign-off)", '
    '"cta_label": "string", '
    '"cta_url_placeholder": "string"}'
)


def build_user_prompt(topic: str, tone: str, audience: str) -> str:
    return (
        f"Write an email campaign for: {topic}\n\n"
        f"Tone: {tone}. Adjust word choice, sentence rhythm, and formality accordingly.\n"
        f"Target audience: {audience}. Reference their context, pain points, and vocabulary.\n\n"
        f"Output JSON matching this schema: {OUTPUT_SCHEMA}"
    )
