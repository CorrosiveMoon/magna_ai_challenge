from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str
    openai_api_key: str
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str
    allowed_origins: str = "http://localhost:3000"
    rate_limit_per_min: int = 20

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


settings = Settings()
