import apiClient from './client';
import { mockApi } from './mock';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const authApi = {
  login: async (credentials) => {
    if (USE_MOCK) return mockApi.login(credentials);
    const res = await apiClient.post('/api/auth/login', credentials);
    return res.data;
  },

  signup: async (data) => {
    if (USE_MOCK) return mockApi.signup(data);
    const res = await apiClient.post('/api/auth/signup', data);
    return res.data;
  },

  getMe: async () => {
    if (USE_MOCK) return mockApi.getMe();
    const res = await apiClient.get('/api/auth/me');
    return res.data;
  },
};

export const documentApi = {
  getDocuments: async () => {
    if (USE_MOCK) return mockApi.getDocuments();
    const res = await apiClient.get('/api/documents');
    return res.data;
  },

  getDocument: async (id) => {
    if (USE_MOCK) return mockApi.getDocument(id);
    const res = await apiClient.get(`/api/documents/${id}`);
    return res.data;
  },

  uploadDocument: async (file) => {
    if (USE_MOCK) return mockApi.uploadDocument(file);
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteDocument: async (id) => {
    if (USE_MOCK) return mockApi.deleteDocument(id);
    const res = await apiClient.delete(`/api/documents/${id}`);
    return res.data;
  },
};

export const chatApi = {
  getSessions: async () => {
    if (USE_MOCK) return mockApi.getSessions();
    const res = await apiClient.get('/api/chat/sessions');
    return res.data;
  },

  createSession: async (data) => {
    if (USE_MOCK) return mockApi.createSession(data);
    const res = await apiClient.post('/api/chat/sessions', data);
    return res.data;
  },

  deleteSession: async (id) => {
    if (USE_MOCK) return mockApi.deleteSession(id);
    const res = await apiClient.delete(`/api/chat/sessions/${id}`);
    return res.data;
  },

  renameSession: async (id, title) => {
    if (USE_MOCK) return mockApi.renameSession(id, title);
    const res = await apiClient.patch(`/api/chat/sessions/${id}`, { title });
    return res.data;
  },

  getMessages: async (sessionId) => {
    if (USE_MOCK) return mockApi.getMessages(sessionId);
    const res = await apiClient.get(`/api/chat/sessions/${sessionId}/messages`);
    return res.data;
  },

  sendMessage: async ({ sessionId, question, documentIds }) => {
    if (USE_MOCK) return mockApi.sendMessage({ sessionId, question, documentIds });
    const res = await apiClient.post('/api/chat', { sessionId, question, documentIds });
    return res.data;
  },

  streamMessage: ({ sessionId, question, documentIds, onToken, onDone, onError }) => {
    if (USE_MOCK) {
      return mockApi.streamMessage({ sessionId, question, documentIds, onToken, onDone, onError });
    }

    // Real SSE implementation
    const token = localStorage.getItem('token');
    const controller = new AbortController();

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ sessionId, question, documentIds }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Stream request failed');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let sources = [];
        let doneMessageId = null;
        let doneAssistantMsg = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.token) {
                  accumulated += parsed.token;
                  onToken(parsed.token, accumulated);
                } else if (parsed.text) {
                  accumulated += parsed.text;
                  onToken(parsed.text, accumulated);
                }
                if (parsed.sources) {
                  sources = parsed.sources;
                } else if (Array.isArray(parsed)) {
                  sources = parsed;
                }
                if (parsed.messageId) {
                  doneMessageId = parsed.messageId;
                }
                if (parsed.assistantMessage) {
                  doneAssistantMsg = parsed.assistantMessage;
                }
              } catch (e) {
                accumulated += dataStr;
                onToken(dataStr, accumulated);
              }
            }
          }
        }

        const assistantMessage = doneAssistantMsg || {
          id: doneMessageId || `msg-${Date.now()}`,
          role: 'assistant',
          content: accumulated,
          sources,
          createdAt: new Date().toISOString(),
        };

        onDone({
          answer: accumulated,
          sources,
          assistantMessage,
        });
      })
      .catch((err) => {
        if (err.name !== 'AbortError' && onError) onError(err);
      });

    return () => controller.abort();
  },

  submitFeedback: async (messageId, rating) => {
    if (USE_MOCK) return mockApi.submitFeedback(messageId, rating);
    const res = await apiClient.post('/api/chat/feedback', { messageId, rating });
    return res.data;
  },
};

export const adminApi = {
  getStats: async () => {
    if (USE_MOCK) return mockApi.getAdminStats();
    const res = await apiClient.get('/api/admin/stats');
    return res.data;
  },
};

export default {
  auth: authApi,
  documents: documentApi,
  chat: chatApi,
  admin: adminApi,
};
