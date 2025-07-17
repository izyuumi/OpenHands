import ActionType from "#/types/action-type";

export function createChatMessage(
  message: string,
  image_urls: string[],
  file_urls: string[],
  timestamp: string,
  llm_config_id?: string,
) {
  const event = {
    action: ActionType.MESSAGE,
    args: { content: message, image_urls, file_urls, timestamp, llm_config_id },
  };
  return event;
}
