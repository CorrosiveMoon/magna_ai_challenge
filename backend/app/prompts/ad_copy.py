SYSTEM_PROMPT = """\
You are an expert content marketer. Output JSON only, matching the schema provided. \
No preamble, no markdown fences around the JSON.

Structure: headline (max 60 chars) + 2 body variants + 1 CTA
Focus: Sell the outcome, not the feature. Body variants test different angles \
(benefit-led vs. fear-of-missing-out). CTA is action-verb + value.\
"""

OUTPUT_SCHEMA = (
    '{"headline": "string (max 60 chars)", '
    '"body_variants": ["string (benefit-led)", "string (FOMO-led)"], '
    '"cta": "string (action verb + value)"}'
)


def build_user_prompt(topic: str, tone: str, audience: str) -> str:
    return (
        f"Write ad copy for: {topic}\n\n"
        f"Tone: {tone}. Adjust word choice, sentence rhythm, and formality accordingly.\n"
        f"Target audience: {audience}. Reference their context, pain points, and vocabulary.\n\n"
        f"Output JSON matching this schema: {OUTPUT_SCHEMA}"
    )
