from supabase import Client

BUCKET = "generated-images"


def upload_image(supabase: Client, user_id: str, generation_id: str, image_bytes: bytes) -> str:
    path = f"{user_id}/{generation_id}.png"

    supabase.storage.from_(BUCKET).upload(
        path=path,
        file=image_bytes,
        file_options={"content-type": "image/png", "upsert": "true"},
    )

    return supabase.storage.from_(BUCKET).get_public_url(path)


def delete_image(supabase: Client, user_id: str, generation_id: str) -> None:
    path = f"{user_id}/{generation_id}.png"
    supabase.storage.from_(BUCKET).remove([path])
