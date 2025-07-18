import React from "react";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { LLMConfig } from "#/types/settings";
import {
  displayErrorToast,
  displaySuccessToast,
} from "#/utils/custom-toast-handlers";
import { retrieveAxiosErrorMessage } from "#/utils/retrieve-axios-error-message";
import { BrandButton } from "#/components/features/settings/brand-button";
import { SettingsInput } from "#/components/features/settings/settings-input";
import { useAIConfigOptions } from "#/hooks/query/use-ai-config-options";
import { organizeModelsAndProviders } from "#/utils/organize-models-and-providers";
import { KeyStatusIcon } from "#/components/features/settings/key-status-icon";
import { useSaveSettings } from "#/hooks/mutation/use-save-settings";
import { useSettings } from "#/hooks/query/use-settings";

interface LLMConfigFormData {
  id?: string;
  name: string;
  model: string;
  api_key?: string;
  base_url?: string | null;
  api_version?: string | null;
}

function LLMConfigForm({
  config,
  onSave,
  onCancel,
}: {
  config?: LLMConfig;
  onSave: (data: LLMConfigFormData) => void;
  onCancel: () => void;
}) {
  const { data: resources } = useAIConfigOptions();

  const [formData, setFormData] = React.useState<LLMConfigFormData>({
    id: config?.id,
    name: config?.name || "",
    model: config?.model || "",
    api_key: "",
    base_url: config?.base_url || "",
    api_version: config?.api_version || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-transparent rounded-lg p-6 space-y-4 border border-gray-200 dark:border-gray-700"
    >
      <h3 className="text-lg font-semibold">
        {config ? "Edit LLM Configuration" : "New LLM Configuration"}
      </h3>

      <SettingsInput
        label="Configuration Name"
        name="name"
        type="text"
        value={formData.name}
        onChange={(value) => setFormData({ ...formData, name: value })}
        required
      />

      <SettingsInput
        label="Model"
        name="model"
        type="text"
        value={formData.model}
        onChange={(value) => setFormData({ ...formData, model: value })}
        required
        placeholder="e.g., gpt-4o, claude-3-sonnet-20240229"
      />

      <SettingsInput
        label="API Key"
        name="api_key"
        type="password"
        value={formData.api_key}
        onChange={(value) => setFormData({ ...formData, api_key: value })}
        placeholder={config?.api_key_set ? "(unchanged)" : "Enter API key"}
      />

      <SettingsInput
        label="Base URL (optional)"
        name="base_url"
        type="text"
        value={formData.base_url || ""}
        onChange={(value) =>
          setFormData({ ...formData, base_url: value || null })
        }
        placeholder="https://api.openai.com/v1"
      />

      <div className="flex gap-2 pt-4">
        <BrandButton type="submit" variant="primary">
          {config ? "Update" : "Create"}
        </BrandButton>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function LLMConfigItem({
  config,
  isDefault,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  config: LLMConfig;
  isDefault: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{config.name}</h4>
            {isDefault && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Default
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{config.model}</p>
          {config.base_url && (
            <p className="text-xs text-gray-500">{config.base_url}</p>
          )}
        </div>
        <KeyStatusIcon isSet={config.api_key_set} />
      </div>

      <div className="flex gap-2">
        {!isDefault && (
          <button
            onClick={onSetDefault}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Set as Default
          </button>
        )}
        <button
          onClick={onEdit}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default function LLMConfigsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const { mutate: saveSettings } = useSaveSettings();

  const [showForm, setShowForm] = React.useState(false);
  const [editingConfig, setEditingConfig] = React.useState<
    LLMConfig | undefined
  >();

  // Query for LLM configurations
  const {
    data: configs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["llm-configs"],
    queryFn: OpenHands.getLLMConfigs,
  });

  // Diagnostic logging
  React.useEffect(() => {
    console.log("[LLM Configs Debug] Component state:", {
      configs,
      isLoading,
      error,
      configsType: typeof configs,
      isArray: Array.isArray(configs),
      showForm,
      editingConfig,
      shouldShowAddButton: !showForm && !editingConfig,
    });
  }, [configs, isLoading, error, showForm, editingConfig]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: LLMConfigFormData) =>
      OpenHands.createLLMConfig(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configs"] });
      displaySuccessToast("LLM configuration created successfully");
      setShowForm(false);
    },
    onError: (error: AxiosError) => {
      const message = retrieveAxiosErrorMessage(error);
      displayErrorToast(message || "Failed to create LLM configuration");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: LLMConfigFormData }) =>
      OpenHands.updateLLMConfig(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configs"] });
      displaySuccessToast("LLM configuration updated successfully");
      setEditingConfig(undefined);
    },
    onError: (error: AxiosError) => {
      const message = retrieveAxiosErrorMessage(error);
      displayErrorToast(message || "Failed to update LLM configuration");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: OpenHands.deleteLLMConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-configs"] });
      displaySuccessToast("LLM configuration deleted successfully");
    },
    onError: (error: AxiosError) => {
      const message = retrieveAxiosErrorMessage(error);
      displayErrorToast(message || "Failed to delete LLM configuration");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: OpenHands.setDefaultLLMConfig,
    onSuccess: async () => {
      // Batch invalidations to reduce cascading updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["llm-configs"] }),
        queryClient.invalidateQueries({ queryKey: ["settings"] }),
      ]);
      displaySuccessToast("Default LLM configuration updated");
    },
    onError: (error: AxiosError) => {
      const message = retrieveAxiosErrorMessage(error);
      displayErrorToast(message || "Failed to set default configuration");
    },
  });

  const handleSave = (data: LLMConfigFormData) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this LLM configuration?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  // Ensure configs is always an array
  const safeConfigs = Array.isArray(configs) ? configs : [];

  if (isLoading) {
    return <div className="p-9">Loading...</div>;
  }

  if (error) {
    console.error("[LLM Configs] Error fetching configs:", error);
    return (
      <div className="p-9">
        <div className="text-red-600">
          Error loading LLM configurations:{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="llm-configs-screen" className="h-full p-9">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">LLM Configurations</h2>
          {!showForm && !editingConfig && (
            <BrandButton
              onClick={() => setShowForm(true)}
              type="button"
              variant="primary"
            >
              Add Configuration
            </BrandButton>
          )}
        </div>

        {(showForm || editingConfig) && (
          <LLMConfigForm
            config={editingConfig}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingConfig(undefined);
            }}
          />
        )}

        <div className="space-y-2">
          {safeConfigs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No LLM configurations yet. Click "Add Configuration" to create
              one.
            </p>
          ) : (
            safeConfigs.map((config) => (
              <LLMConfigItem
                key={config.id}
                config={config}
                isDefault={config.id === settings?.DEFAULT_LLM_CONFIG_ID}
                onEdit={() => setEditingConfig(config)}
                onDelete={() => handleDelete(config.id)}
                onSetDefault={() => handleSetDefault(config.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
