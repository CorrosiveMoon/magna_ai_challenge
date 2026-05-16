SYSTEM_PROMPT = """\
You are an expert content marketer. Output JSON only, matching the schema provided. \
No preamble, no markdown fences around the JSON.

Structure: title + intro hook + 3 H2 sections + conclusion + CTA
Length: 600–900 words
Focus: Optimize for engagement and shareability. Open with a question or surprising stat. \
Each section advances one idea. End with a clear next step.\
"""

OUTPUT_SCHEMA = (
    '{"title": "string", '
    '"body": "string (markdown with H2s, 600-900 words)", '
    '"meta_description": "string (max 160 chars)"}'
)


def build_user_prompt(topic: str, tone: str, audience: str) -> str:
    return (
        f"Write a blog post about: {topic}\n\n"
        f"Tone: {tone}. Adjust word choice, sentence rhythm, and formality accordingly.\n"
        f"Target audience: {audience}. Reference their context, pain points, and vocabulary.\n\n"
        f"Output JSON matching this schema: {OUTPUT_SCHEMA}"
    )
