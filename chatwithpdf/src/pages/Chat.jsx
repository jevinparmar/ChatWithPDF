import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import ChatHistoryList from '../components/chat/ChatHistoryList';
import ChatWindow from '../components/chat/ChatWindow';

export default function Chat() {
  const { sessionId } = useParams();
  const { fetchSessions, selectSession, sessions, currentSessionId, createSession } = useChat();
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (sessionId) {
      selectSession(sessionId);
    } else if (sessions.length > 0 && !currentSessionId) {
      // If navigating to /chat with no id, select the latest session or let user start one
      navigate(`/chat/${sessions[0].id}`, { replace: true });
    }
  }, [sessionId, sessions, selectSession, currentSessionId, navigate]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-dark-bg">
      {/* Collapsible Chat History Left Sidebar */}
      {isHistoryOpen && (
        <div className="hidden md:flex h-full shrink-0 animate-in slide-in-from-left-2 duration-150">
          <ChatHistoryList onSelectSession={(id) => navigate(`/chat/${id}`)} />
        </div>
      )}

      {/* Main Chat Window & Split PDF Viewer */}
      <ChatWindow
        isHistoryOpen={isHistoryOpen}
        onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
      />
    </div>
  );
}
