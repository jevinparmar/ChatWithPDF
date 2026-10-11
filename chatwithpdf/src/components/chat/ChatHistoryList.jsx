import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
} from 'lucide-react';
import Button from '../ui/Button';
import Skeleton from '../ui/Skeleton';
import { groupChatsByDate } from '../../utils/groupChatsByDate';
import { useChat } from '../../hooks/useChat';

export default function ChatHistoryList({ onSelectSession }) {
  const {
    sessions,
    currentSessionId,
    isLoadingSessions,
    createSession,
    deleteSession,
    renameSession,
  } = useChat();

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const navigate = useNavigate();

  const grouped = groupChatsByDate(sessions);

  const handleNewChat = async () => {
    try {
      const session = await createSession();
      if (onSelectSession) onSelectSession(session.id);
      navigate(`/chat/${session.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartRename = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = async (e, id) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      await renameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation?')) {
      await deleteSession(id);
      if (currentSessionId === id) {
        navigate('/chat');
      }
    }
  };

  const handleSelect = (id) => {
    if (onSelectSession) onSelectSession(id);
    navigate(`/chat/${id}`);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-card border-r border-gray-100 dark:border-dark-border w-72 shrink-0">
      <div className="p-3 border-b border-gray-100 dark:border-dark-border">
        <Button
          onClick={handleNewChat}
          variant="primary"
          icon={Plus}
          className="w-full justify-center shadow-xs"
        >
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {isLoadingSessions ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-gray-400 dark:text-gray-500">
            <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No chat history yet
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className="space-y-1">
              <h5 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 py-1">
                {group.label}
              </h5>
              {group.items.map((session) => {
                const isActive = currentSessionId === session.id;
                const isEditing = editingId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => !isEditing && handleSelect(session.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-gray-400 group-hover:text-indigo-500" />
                      {isEditing ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white dark:bg-dark-bg border border-indigo-400 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-white outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="truncate">{session.title}</span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleSaveRename(e, session.id)}
                          className="p-1 hover:text-teal-600 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelRename}
                          className="p-1 hover:text-gray-500 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="hidden group-hover:flex items-center gap-1 shrink-0 text-gray-400">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(e, session)}
                          className="p-1 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, session.id)}
                          className="p-1 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
