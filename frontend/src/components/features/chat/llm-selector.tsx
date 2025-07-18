import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import OpenHands from "#/api/open-hands";
import { useSettings } from "#/hooks/query/use-settings";
import ChevronDownIcon from "#/icons/angle-down-solid.svg?react";

interface LLMSelectorProps {
  selectedConfigId?: string;
  onSelect: (configId: string) => void;
  disabled?: boolean;
}

export function LLMSelector({
  selectedConfigId,
  onSelect,
  disabled = false,
}: LLMSelectorProps) {
  const { data: settings } = useSettings();
  const {
    data: configs = [],
    isError,
    error,
  } = useQuery({
    queryKey: ["llm-configs"],
    queryFn: OpenHands.getLLMConfigs,
    retry: 2,
    staleTime: 60000, // Cache for 1 minute to reduce instability
  });

  // Track if auto-selection has been attempted
  const autoSelectionAttempted = React.useRef(false);

  // Determine active config with validation
  let activeConfigId = selectedConfigId;

  // Validate selected config exists
  if (activeConfigId && !configs.some((c) => c.id === activeConfigId)) {
    activeConfigId = undefined;
  }

  // Fall back to default or first available config
  if (!activeConfigId) {
    activeConfigId = settings?.DEFAULT_LLM_CONFIG_ID || configs[0]?.id;
  }

  const activeConfig = configs.find((c) => c.id === activeConfigId);

  React.useEffect(() => {
    // Auto-select default only once when all data is loaded
    if (
      !autoSelectionAttempted.current &&
      configs.length > 0 &&
      !selectedConfigId &&
      settings?.DEFAULT_LLM_CONFIG_ID
    ) {
      // Verify the default config exists
      const defaultConfigExists = configs.some(
        (c) => c.id === settings.DEFAULT_LLM_CONFIG_ID,
      );
      if (defaultConfigExists) {
        autoSelectionAttempted.current = true;
        onSelect(settings.DEFAULT_LLM_CONFIG_ID);
      }
    }
  }, [configs, selectedConfigId, settings?.DEFAULT_LLM_CONFIG_ID, onSelect]);

  // Handle invalid selected config (e.g., deleted config)
  React.useEffect(() => {
    if (
      selectedConfigId &&
      configs.length > 0 &&
      !configs.some((c) => c.id === selectedConfigId)
    ) {
      // Selected config no longer exists, fallback to default or first available
      const fallbackId = settings?.DEFAULT_LLM_CONFIG_ID || configs[0]?.id;
      if (fallbackId && configs.some((c) => c.id === fallbackId)) {
        onSelect(fallbackId);
      }
    }
  }, [selectedConfigId, configs, settings?.DEFAULT_LLM_CONFIG_ID, onSelect]);

  if (isError) {
    console.error("[LLMSelector] Failed to load LLM configs:", error);
    return (
      <div className="text-sm text-red-600 px-3 py-1.5">
        Failed to load LLM configs
      </div>
    );
  }

  if (configs.length === 0) {
    return null;
  }

  return (
    <Popover placement="top" showArrow offset={10}>
      <PopoverTrigger>
        <button
          type="button"
          disabled={disabled}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="font-medium">
            {activeConfig?.name || "Select LLM"}
          </span>
          <ChevronDownIcon className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="py-1" role="menu">
          {configs.map((config) => (
            <button
              key={config.id}
              onClick={() => {
                onSelect(config.id);
              }}
              className={`
                w-full text-left px-4 py-2 text-sm hover:bg-gray-50/50 transition-colors
                ${config.id === activeConfigId ? "bg-blue-50/50 text-blue-700" : "text-gray-700"}
              `}
              role="menuitem"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{config.name}</div>
                  <div className="text-xs text-gray-500">{config.model}</div>
                </div>
                {config.id === settings?.DEFAULT_LLM_CONFIG_ID && (
                  <span className="text-xs bg-blue-100/50 text-blue-800 px-2 py-0.5 rounded">
                    Default
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
