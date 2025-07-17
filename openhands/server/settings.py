from __future__ import annotations

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    SecretStr,
)

from openhands.core.config.mcp_config import MCPConfig
from openhands.integrations.provider import CustomSecret, ProviderToken
from openhands.integrations.service_types import ProviderType
from openhands.storage.data_models.settings import LLMConfigSettings, Settings


class POSTProviderModel(BaseModel):
    """
    Settings for POST requests
    """

    mcp_config: MCPConfig | None = None
    provider_tokens: dict[ProviderType, ProviderToken] = {}


class POSTCustomSecrets(BaseModel):
    """
    Adding new custom secret
    """

    custom_secrets: dict[str, CustomSecret] = {}


class LLMConfigWithoutApiKey(BaseModel):
    """LLM configuration for frontend without API key"""
    id: str
    name: str
    model: str
    base_url: str | None = None
    api_version: str | None = None
    temperature: float = 0.0
    top_p: float = 1.0
    max_output_tokens: int | None = None
    api_key_set: bool = Field(..., description="Whether an API key is configured")


class GETSettingsModel(Settings):
    """
    Settings with additional token data for the frontend
    """

    provider_tokens_set: dict[ProviderType, str | None] | None = (
        None  # provider + base_domain key-value pair
    )
    llm_api_key_set: bool
    search_api_key_set: bool = False
    llm_configs_with_status: list[LLMConfigWithoutApiKey] = Field(
        default_factory=list,
        description="LLM configurations with API key status"
    )

    model_config = ConfigDict(use_enum_values=True)


class CustomSecretWithoutValueModel(BaseModel):
    """
    Custom secret model without value
    """

    name: str
    description: str | None = None


class CustomSecretModel(CustomSecretWithoutValueModel):
    """
    Custom secret model with value
    """

    value: SecretStr


class GETCustomSecrets(BaseModel):
    """
    Custom secrets names
    """

    custom_secrets: list[CustomSecretWithoutValueModel] | None = None
