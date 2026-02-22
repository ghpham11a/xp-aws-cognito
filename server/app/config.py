import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Environment
    environment: str = "development"
    debug: bool = False

    # AWS Cognito
    aws_region: str = "us-east-1"
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""

    # Apple Sign In (comma-separated: iOS bundle ID + Services ID for web/Android)
    apple_bundle_id: str = ""  # e.g., "com.example.AWSCognito,com.example.services.AWSCognito"

    @property
    def apple_bundle_ids(self) -> list[str]:
        """Parse comma-separated Apple bundle/service IDs into a list."""
        if not self.apple_bundle_id:
            return []
        return [bid.strip() for bid in self.apple_bundle_id.split(",") if bid.strip()]

    # Google Sign-In (comma-separated list of client IDs for iOS, Android, Web)
    google_client_id: str = ""  # Can be comma-separated: "ios-client-id,android-client-id,web-client-id"

    @property
    def google_client_ids(self) -> list[str]:
        """Parse comma-separated Google client IDs into a list."""
        if not self.google_client_id:
            return []
        return [cid.strip() for cid in self.google_client_id.split(",") if cid.strip()]

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # API
    api_title: str = "AWS Cognito Auth API"
    api_version: str = "1.0.0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def validate_required(self) -> None:
        """Validate required settings are present."""
        missing = []
        if not self.cognito_user_pool_id:
            missing.append("COGNITO_USER_POOL_ID")
        if not self.cognito_client_id:
            missing.append("COGNITO_CLIENT_ID")

        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}"
            )


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
