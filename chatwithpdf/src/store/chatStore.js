import { create } from 'zustand';
import { chatApi } from '../api';

const defaultSettings = {
  model: 'gpt-4o',
  topK: 4,
  chunkSize: 512,
  showCitations: true,
  hybridSearch: true,
};

const savedSettings = (() => {
  try {
    const s = localStorage.getItem('rag_settings');
    return s ? { ...defaultSettings, ...JSON.parse(s) } : defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
})();

export const useChatStore = create((set, get) => ({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoadingSessions: false,
  isLoadingMessages: false,
  isStreaming: false,
  streamingContent: '',
  stopStreamingFn: null,
  selectedDocumentIds: [],
  
  // PDF citation panel split-view state
  activeCitation: null,
  isViewerOpen: false,

  // Settings
  ragSettings: savedSettings,

  setRagSettings: (newSettings) => {
    const updated = { ...get().ragSettings, ...newSettings };
    localStorage.setItem('rag_settings', JSON.stringify(updated));
    set({ ragSettings: updated });
  },

  setActiveCitation: (citation) => {
    set({ activeCitation: citation, isViewerOpen: !!citation });
  },

  setIsViewerOpen: (isOpen) => {
    set({ isViewerOpen: isOpen });
    if (!isOpen) {
      set({ activeCitation: null });
    }
  },

  setSelectedDocumentIds: (docIds) => {
    set({ selectedDocumentIds: docIds });
  },

  toggleDocumentId: (docId) => {
    const current = get().selectedDocumentIds;
    if (current.includes(docId)) {
      set({ selectedDocumentIds: current.filter((id) => id !== docId) });
    } else {
      set({ selectedDocumentIds: [...current, docId] });
    }
  },

  fetchSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const sessions = await chatApi.getSessions();
      set({ sessions, isLoadingSessions: false });
      return sessions;
    } catch (err) {
      set({ isLoadingSessions: false });
      throw err;
    }
  },

  selectSession: async (sessionId) => {
    set({ currentSessionId: sessionId, isLoadingMessages: true, isStreaming: false, streamingContent: '' });
    try {
      const messages = await chatApi.getMessages(sessionId);
      const session = get().sessions.find((s) => s.id === sessionId);
      
      // Find initial citation from assistant message if available
      const initialCitation = messages.find((m) => m.role === 'assistant' && m.sources && m.sources.length > 0)?.sources?.[0] || null;

      set({
        messages,
        isLoadingMessages: false,
        selectedDocumentIds: session?.documentIds || [],
        activeCitation: initialCitation,
        isViewerOpen: !!initialCitation,
      });
    } catch (err) {
      set({ isLoadingMessages: false });
    }
  },

  createSession: async (title = 'New conversation', documentIds = []) => {
    try {
      const newSession = await chatApi.createSession({ title, documentIds });
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        currentSessionId: newSession.id,
        messages: [],
        selectedDocumentIds: documentIds,
      }));
      return newSession;
    } catch (err) {
      throw err;
    }
  },

  deleteSession: async (id) => {
    try {
      await chatApi.deleteSession(id);
      set((state) => {
        const remaining = state.sessions.filter((s) => s.id !== id);
        const nextId = state.currentSessionId === id ? (remaining[0]?.id || null) : state.currentSessionId;
        return {
          sessions: remaining,
          currentSessionId: nextId,
          messages: state.currentSessionId === id ? [] : state.messages,
        };
      });
    } catch (err) {
      throw err;
    }
  },

  renameSession: async (id, title) => {
    try {
      await chatApi.renameSession(id, title);
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === id ? { ...s, title } : s)),
      }));
    } catch (err) {
      throw err;
    }
  },

  sendMessage: async (question) => {
    const { currentSessionId, selectedDocumentIds, isStreaming } = get();
    if (!question.trim() || isStreaming) return;

    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
      const created = await get().createSession('New conversation', selectedDocumentIds);
      targetSessionId = created.id;
    }

    const optimisticUserMsg = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, optimisticUserMsg],
      isStreaming: true,
      streamingContent: '',
    }));

    const stopFn = chatApi.streamMessage({
      sessionId: targetSessionId,
      question,
      documentIds: selectedDocumentIds,
      onToken: (_token, accumulated) => {
        set({ streamingContent: accumulated });
      },
      onDone: ({ assistantMessage }) => {
        set((state) => ({
          messages: [...state.messages, assistantMessage],
          isStreaming: false,
          streamingContent: '',
          stopStreamingFn: null,
        }));
        get().fetchSessions();
      },
      onError: (err) => {
        console.error('Streaming error', err);
        set({ isStreaming: false, streamingContent: '', stopStreamingFn: null });
      },
    });

    set({ stopStreamingFn: stopFn });
  },

  stopStreaming: () => {
    const { stopStreamingFn, streamingContent, currentSessionId } = get();
    if (stopStreamingFn) {
      stopStreamingFn();
    }
    if (streamingContent) {
      const stoppedAssistantMsg = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: streamingContent + ' *(Response stopped by user)*',
        sources: [],
        createdAt: new Date().toISOString(),
      };
      set((state) => ({
        messages: [...state.messages, stoppedAssistantMsg],
      }));
    }
    set({ isStreaming: false, streamingContent: '', stopStreamingFn: null });
  },

  submitFeedback: async (messageId, rating) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, feedback: m.feedback === rating ? null : rating } : m
      ),
    }));
    try {
      await chatApi.submitFeedback(messageId, rating);
    } catch (e) {
      console.error(e);
    }
  },
}));
