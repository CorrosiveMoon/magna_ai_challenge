from typing import Any
from supabase import create_client
from .config import settings

_supabase_admin: Any = None


def get_supabase_admin() -> Any:
    global _supabase_admin
    if _supabase_admin is None:
        _supabase_admin = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _supabase_admin
