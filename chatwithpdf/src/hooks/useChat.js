import { useChatStore } from '../store/chatStore';
import { chatApi } from '../api';

export function useChat() {
  const chatState = useChatStore();

  return {
    ...chatState,
    streamMessage: chatApi.streamMessage,
  };
}
