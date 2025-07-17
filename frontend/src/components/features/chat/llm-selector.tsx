import React from "react";
import { useQuery } from "@tanstack/react-query";
import OpenHands from "#/api/open-hands";
import { useSettings } from "#/hooks/query/use-settings";
import { LLMConfig } from "#/types/settings";
import ChevronDownIcon from "#/icons/angle-down-solid.svg?react";

interface LLMSelectorProps {
  selectedConfigId?: string;
  onSelect: (configId: string) => void;
  disabled?: boolean;
}

export function LLMSelector({ 
  selectedConfigId, 
  onSelect, 
  disabled = false 
}: LLMSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { data: settings } = useSettings();
  const { data: configs = [] } = useQuery({
    queryKey: ["llm-configs"],
    queryFn: OpenHands.getLLMConfigs,
  });

  // Use default config if none selected
  const activeConfigId = selectedConfigId || settings?.DEFAULT_LLM_CONFIG_ID || configs[0]?.id;
  const activeConfig = configs.find(c => c.id === activeConfigId);

  React.useEffect(() => {
    // Auto-select default if no selection
    if (configs.length > 0 && !selectedConfigId && settings?.DEFAULT_LLM_CONFIG_ID) {
      onSelect(settings.DEFAULT_LLM_CONFIG_ID);
    }
  }, [configs, selectedConfigId, settings?.DEFAULT_LLM_CONFIG_ID, onSelect]);

  if (configs.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="font-medium">{activeConfig?.name || "Select LLM"}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && !disabled && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1" role="menu">
              {configs.map((config) => (
                <button
                  key={config.id}
                  onClick={() => {
                    onSelect(config.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full text-left px-4 py-2 text-sm hover:bg-gray-100 
                    ${config.id === activeConfigId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                  `}
                  role="menuitem"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{config.name}</div>
                      <div className="text-xs text-gray-500">{config.model}</div>
                    </div>
                    {config.id === settings?.DEFAULT_LLM_CONFIG_ID && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}