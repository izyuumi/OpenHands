import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, SecretStr

from openhands.core.logger import openhands_logger as logger
from openhands.server.dependencies import get_dependencies
from openhands.server.user_auth import (
    get_user_settings,
    get_user_settings_store,
)
from openhands.storage.data_models.settings import LLMConfigSettings, Settings
from openhands.storage.settings.settings_store import SettingsStore

app = APIRouter(prefix='/api', dependencies=get_dependencies())


class LLMConfigRequest(BaseModel):
    """Request model for creating/updating LLM configurations"""
    name: str = Field(..., description="Display name for the configuration")
    model: str = Field(..., description="Model identifier")
    api_key: SecretStr | None = Field(None, description="API key for the LLM provider")
    base_url: str | None = Field(None, description="Base URL for the LLM API")
    api_version: str | None = Field(None, description="API version")
    temperature: float = Field(0.0, ge=0.0, le=2.0, description="Temperature for generation")
    top_p: float = Field(1.0, ge=0.0, le=1.0, description="Top-p sampling parameter")
    max_output_tokens: int | None = Field(None, description="Maximum output tokens")


class LLMConfigResponse(BaseModel):
    """Response model for LLM configurations (without API key)"""
    id: str
    name: str
    model: str
    base_url: str | None
    api_version: str | None
    temperature: float
    top_p: float
    max_output_tokens: int | None
    api_key_set: bool = Field(..., description="Whether an API key is configured")


@app.get(
    '/llm-configs',
    response_model=list[LLMConfigResponse],
    responses={
        401: {'description': 'Unauthorized', 'model': dict},
    },
)
async def list_llm_configs(
    settings: Settings = Depends(get_user_settings),
) -> list[LLMConfigResponse]:
    """List all LLM configurations for the user."""
    if not settings:
        return []
    
    configs = []
    for config in settings.llm_configs:
        configs.append(LLMConfigResponse(
            id=config.id,
            name=config.name,
            model=config.model,
            base_url=config.base_url,
            api_version=config.api_version,
            temperature=config.temperature,
            top_p=config.top_p,
            max_output_tokens=config.max_output_tokens,
            api_key_set=config.api_key is not None and bool(config.api_key)
        ))
    
    return configs


@app.post(
    '/llm-configs',
    response_model=LLMConfigResponse,
    responses={
        401: {'description': 'Unauthorized', 'model': dict},
        400: {'description': 'Bad request', 'model': dict},
    },
)
async def create_llm_config(
    config_request: LLMConfigRequest,
    settings: Settings = Depends(get_user_settings),
    settings_store: SettingsStore = Depends(get_user_settings_store),
) -> LLMConfigResponse:
    """Create a new LLM configuration."""
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User settings not found"
        )
    
    # Generate a new ID for the configuration
    config_id = str(uuid.uuid4())
    
    # Create the new configuration
    new_config = LLMConfigSettings(
        id=config_id,
        name=config_request.name,
        model=config_request.model,
        api_key=config_request.api_key,
        base_url=config_request.base_url,
        api_version=config_request.api_version,
        temperature=config_request.temperature,
        top_p=config_request.top_p,
        max_output_tokens=config_request.max_output_tokens,
    )
    
    # Add to settings
    settings.llm_configs.append(new_config)
    
    # Save settings
    await settings_store.store(settings)
    
    return LLMConfigResponse(
        id=config_id,
        name=new_config.name,
        model=new_config.model,
        base_url=new_config.base_url,
        api_version=new_config.api_version,
        temperature=new_config.temperature,
        top_p=new_config.top_p,
        max_output_tokens=new_config.max_output_tokens,
        api_key_set=new_config.api_key is not None and bool(new_config.api_key)
    )


@app.put(
    '/llm-configs/{config_id}',
    response_model=LLMConfigResponse,
    responses={
        401: {'description': 'Unauthorized', 'model': dict},
        404: {'description': 'Configuration not found', 'model': dict},
    },
)
async def update_llm_config(
    config_id: str,
    config_request: LLMConfigRequest,
    settings: Settings = Depends(get_user_settings),
    settings_store: SettingsStore = Depends(get_user_settings_store),
) -> LLMConfigResponse:
    """Update an existing LLM configuration."""
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User settings not found"
        )
    
    # Find the configuration
    config_index = None
    for i, config in enumerate(settings.llm_configs):
        if config.id == config_id:
            config_index = i
            break
    
    if config_index is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM configuration not found"
        )
    
    # Update the configuration
    existing_config = settings.llm_configs[config_index]
    updated_config = LLMConfigSettings(
        id=config_id,
        name=config_request.name,
        model=config_request.model,
        api_key=config_request.api_key if config_request.api_key else existing_config.api_key,
        base_url=config_request.base_url,
        api_version=config_request.api_version,
        temperature=config_request.temperature,
        top_p=config_request.top_p,
        max_output_tokens=config_request.max_output_tokens,
    )
    
    settings.llm_configs[config_index] = updated_config
    
    # Save settings
    await settings_store.store(settings)
    
    return LLMConfigResponse(
        id=config_id,
        name=updated_config.name,
        model=updated_config.model,
        base_url=updated_config.base_url,
        api_version=updated_config.api_version,
        temperature=updated_config.temperature,
        top_p=updated_config.top_p,
        max_output_tokens=updated_config.max_output_tokens,
        api_key_set=updated_config.api_key is not None and bool(updated_config.api_key)
    )


@app.delete(
    '/llm-configs/{config_id}',
    responses={
        200: {'description': 'Configuration deleted', 'model': dict},
        401: {'description': 'Unauthorized', 'model': dict},
        404: {'description': 'Configuration not found', 'model': dict},
        400: {'description': 'Cannot delete default configuration', 'model': dict},
    },
)
async def delete_llm_config(
    config_id: str,
    settings: Settings = Depends(get_user_settings),
    settings_store: SettingsStore = Depends(get_user_settings_store),
) -> JSONResponse:
    """Delete an LLM configuration."""
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User settings not found"
        )
    
    # Don't allow deleting the default configuration if it's the only one
    if config_id == settings.default_llm_config_id and len(settings.llm_configs) == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the only remaining configuration"
        )
    
    # Find and remove the configuration
    config_found = False
    for i, config in enumerate(settings.llm_configs):
        if config.id == config_id:
            settings.llm_configs.pop(i)
            config_found = True
            break
    
    if not config_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM configuration not found"
        )
    
    # If we deleted the default config, set a new default
    if config_id == settings.default_llm_config_id and settings.llm_configs:
        settings.default_llm_config_id = settings.llm_configs[0].id
    
    # Save settings
    await settings_store.store(settings)
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={'message': 'LLM configuration deleted successfully'}
    )


@app.post(
    '/llm-configs/{config_id}/set-default',
    responses={
        200: {'description': 'Default configuration set', 'model': dict},
        401: {'description': 'Unauthorized', 'model': dict},
        404: {'description': 'Configuration not found', 'model': dict},
    },
)
async def set_default_llm_config(
    config_id: str,
    settings: Settings = Depends(get_user_settings),
    settings_store: SettingsStore = Depends(get_user_settings_store),
) -> JSONResponse:
    """Set an LLM configuration as the default."""
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User settings not found"
        )
    
    # Verify the configuration exists
    config_exists = any(config.id == config_id for config in settings.llm_configs)
    
    if not config_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM configuration not found"
        )
    
    # Set as default
    settings.default_llm_config_id = config_id
    
    # Save settings
    await settings_store.store(settings)
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={'message': 'Default LLM configuration updated'}
    )