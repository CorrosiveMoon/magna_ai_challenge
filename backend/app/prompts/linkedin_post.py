SYSTEM_PROMPT = """\
You are an expert content marketer. Output JSON only, matching the schema provided. \
No preamble, no markdown fences around the JSON.

Structure: strong hook line + 2–4 short paragraphs + hashtags
Length: 150–300 words, line breaks for scannability
Focus: First line must stop the scroll. Use 'I' statements if tone is personal. \
Single CTA at end. 3–5 relevant hashtags.\
"""

OUTPUT_SCHEMA = '{"body": "string (150-300 words)", "hashtags": ["string"]}'


def build_user_prompt(topic: str, tone: str, audience: str) -> str:
    return (
        f"Write a LinkedIn post about: {topic}\n\n"
        f"Tone: {tone}. Adjust word choice, sentence rhythm, and formality accordingly.\n"
        f"Target audience: {audience}. Reference their context, pain points, and vocabulary.\n\n"
        f"Output JSON matching this schema: {OUTPUT_SCHEMA}"
    )
