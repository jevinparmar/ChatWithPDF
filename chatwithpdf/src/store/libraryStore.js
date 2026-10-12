import { create } from 'zustand';

const STORAGE_KEY = 'chatwithpdf_study_library';

const loadSavedLibrary = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const useLibraryStore = create((set, get) => ({
  items: loadSavedLibrary(),

  saveItem: ({ title, type, content, fileName, mode }) => {
    const newItem = {
      id: `lib-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: title || 'Saved Study Item',
      type: type || 'notes', // 'notes' | 'flashcards' | 'quiz' | 'mind_map' | 'summary'
      content,
      fileName: fileName || 'Document',
      mode: mode || 'student',
      savedAt: new Date().toISOString(),
    };

    const updated = [newItem, ...get().items];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ items: updated });
    return newItem;
  },

  deleteItem: (id) => {
    const updated = get().items.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ items: updated });
  },

  clearAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ items: [] });
  },
}));
