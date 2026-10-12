import { create } from 'zustand';
import { chatApi, modesApi } from '../api';

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

  // Modes State
  modes: [],
  activeMode: 'student',
  readingLevel: 'simple', // 'very_simple' | 'simple' | 'detailed'
  engineMode: 'question', // 'question' | 'full_file'
  progressStep: null,
  actionError: null,
  dailyHeavyRemaining: 50,

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

  fetchModes: async () => {
    try {
      const modesList = await modesApi.getModes();
      set({ modes: modesList });
      return modesList;
    } catch (err) {
      console.error('Failed to fetch modes:', err);
      return [];
    }
  },

  setActiveMode: async (modeId) => {
    const { currentSessionId, sessions } = get();
    set({ activeMode: modeId });
    if (currentSessionId) {
      try {
        await chatApi.updateSessionMode(currentSessionId, modeId);
        set({
          sessions: sessions.map((s) => (s.id === currentSessionId ? { ...s, mode: modeId } : s)),
        });
      } catch (err) {
        console.error('Failed to update session mode:', err);
      }
    }
  },

  setReadingLevel: (level) => {
    set({ readingLevel: level });
  },

  setEngineMode: (mode) => {
    set({ engineMode: mode });
  },

  fetchSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const sessions = await chatApi.getSessions();
      set({ sessions, isLoadingSessions: false });
      return sessions;
    } catch (err) {
      set({ isLoadingSessions: false });
      return [];
    }
  },

  selectSession: async (sessionId) => {
    set({
      currentSessionId: sessionId,
      isLoadingMessages: true,
      isStreaming: false,
      streamingContent: '',
      progressStep: null,
    });
    try {
      const messages = await chatApi.getMessages(sessionId);
      const session = get().sessions.find((s) => s.id === sessionId);

      set({
        messages,
        isLoadingMessages: false,
        selectedDocumentIds: session?.documentIds || [],
        activeMode: session?.mode || get().activeMode || 'student',
        activeCitation: null,
        isViewerOpen: false,
      });
    } catch (err) {
      set({ isLoadingMessages: false });
    }
  },

  createSession: async (title = 'New conversation', documentIds = [], mode = null) => {
    try {
      const chosenMode = mode || get().activeMode || 'student';
      const newSession = await chatApi.createSession({
        title,
        documentIds,
        mode: chosenMode,
      });
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        currentSessionId: newSession.id,
        messages: [],
        selectedDocumentIds: documentIds,
        activeMode: newSession.mode || chosenMode,
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
        const nextId =
          state.currentSessionId === id ? remaining[0]?.id || null : state.currentSessionId;
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
    const { currentSessionId, selectedDocumentIds, isStreaming, engineMode, activeMode, ragSettings } = get();
    if (!question.trim() || isStreaming) return;

    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
      const created = await get().createSession('New conversation', selectedDocumentIds, activeMode);
      targetSessionId = created.id;
    }

    let queryToSend = question;
    if (engineMode === 'full_file') {
      queryToSend = `Explain this full document thoroughly in detail. User query: ${question}`;
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
      progressStep: null,
    }));

    const stopFn = chatApi.streamMessage({
      sessionId: targetSessionId,
      question: queryToSend,
      documentIds: selectedDocumentIds,
      model: ragSettings?.model,
      topK: ragSettings?.topK,
      hybridSearch: ragSettings?.hybridSearch,
      onToken: (_token, accumulated) => {
        set({ streamingContent: accumulated });
      },
      onDone: ({ assistantMessage }) => {
        set((state) => ({
          messages: [...state.messages, assistantMessage],
          isStreaming: false,
          streamingContent: '',
          stopStreamingFn: null,
          progressStep: null,
        }));
        get().fetchSessions();
      },
      onError: (err) => {
        console.error('Streaming error', err);
        set({ isStreaming: false, streamingContent: '', stopStreamingFn: null, progressStep: null });
      },
    });

    set({ stopStreamingFn: stopFn });
  },

  runAction: async ({ actionId, actionLabel, documentIds = null, options = {} }) => {
    const { currentSessionId, selectedDocumentIds, isStreaming, activeMode, readingLevel, ragSettings } = get();
    if (isStreaming) return;

    let targetSessionId = currentSessionId;
    const targetDocIds = documentIds !== null ? documentIds : selectedDocumentIds;

    if (!targetSessionId) {
      const created = await get().createSession(actionLabel || `Action: ${actionId}`, targetDocIds, activeMode);
      targetSessionId = created.id;
    }

    const mergedOptions = { ...options };
    if (activeMode === 'student' && !mergedOptions.reading_level) {
      mergedOptions.reading_level = readingLevel;
    }

    const optimisticUserMsg = {
      id: `temp-action-user-${Date.now()}`,
      role: 'user',
      content: `Run action: ${actionLabel || actionId}`,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, optimisticUserMsg],
      isStreaming: true,
      streamingContent: '',
      progressStep: 'Initializing action...',
      actionError: null,
    }));

    let actionSources = [];

    const stopFn = chatApi.streamAction({
      sessionId: targetSessionId,
      actionId,
      documentIds: targetDocIds,
      options: mergedOptions,
      model: ragSettings?.model,
      topK: ragSettings?.topK,
      hybridSearch: ragSettings?.hybridSearch,
      onProgress: (stepText) => {
        set({ progressStep: typeof stepText === 'string' ? stepText : (stepText?.step || 'Processing document...') });
      },
      onUsage: (usage) => {
        if (usage && typeof usage.remaining === 'number') {
          set({ dailyHeavyRemaining: usage.remaining });
        }
      },
      onSources: (sources) => {
        actionSources = sources;
      },
      onToken: (_token, accumulated) => {
        set({ streamingContent: accumulated });
      },
      onDone: ({ content, outputType, messageId, sources, wasCached, remainingToday }) => {
        const assistantMsg = {
          id: messageId || `action-msg-${Date.now()}`,
          role: 'assistant',
          content: typeof content === 'string' ? content : JSON.stringify(content),
          outputType: outputType || 'markdown',
          actionId,
          sources: sources || actionSources,
          wasCached,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          messages: [...state.messages, assistantMsg],
          isStreaming: false,
          streamingContent: '',
          progressStep: null,
          stopStreamingFn: null,
          ...(typeof remainingToday === 'number' ? { dailyHeavyRemaining: remainingToday } : {}),
        }));
        get().fetchSessions();
      },
      onError: (err) => {
        console.error('Action error', err);
        set({
          isStreaming: false,
          streamingContent: '',
          progressStep: null,
          stopStreamingFn: null,
          actionError: err.message || 'Action execution failed',
        });
      },
    });

    set({ stopStreamingFn: stopFn });
  },

  stopStreaming: () => {
    const { stopStreamingFn, streamingContent } = get();
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
    set({ isStreaming: false, streamingContent: '', stopStreamingFn: null, progressStep: null });
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
