import React, { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import AIMessage from './AIMessage';
import SuggestedQuestions from './SuggestedQuestions';
import ChatInput from './ChatInput';
import DocumentSelector from '../documents/DocumentSelector';
import PdfViewer from '../documents/PdfViewer';
import Skeleton from '../ui/Skeleton';
import { useChat } from '../../hooks/useChat';
import ModeSelector from '../modes/ModeSelector';
import ReadingLevelSelector from '../modes/ReadingLevelSelector';
import EmptyChatState from './EmptyChatState';
import { History, MoreHorizontal, Trash2, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChatWindow({ onToggleHistory, isHistoryOpen }) {
  const {
    currentSessionId,
    messages,
    isLoadingMessages,
    isStreaming,
    streamingContent,
    selectedDocumentIds,
    activeCitation,
    isViewerOpen,
    setSelectedDocumentIds,
    sendMessage,
    stopStreaming,
    setIsViewerOpen,
    deleteSession,
    ragSettings,
  } = useChat();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleClearSession = async () => {
    setIsMenuOpen(false);
    if (currentSessionId && window.confirm('Reset this conversation?')) {
      await deleteSession(currentSessionId);
      toast.success('Conversation reset');
    }
  };

  const modelLabels = {
    'gpt-4o': 'GPT-4o',
    'claude-3-5-sonnet': 'Claude 3.5 Sonnet',
    'llama-3-70b': 'Llama 3 70B',
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-light-bg dark:bg-[#0B0D12] p-2 sm:p-3 gap-2 sm:gap-3">
      {/* Left Chat Pane */}
      <div
        className={`flex flex-col h-full rounded-2xl bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-[#1F232B] shadow-2xs overflow-hidden transition-all duration-300 ${
          isViewerOpen ? 'w-full lg:w-[48%] xl:w-[46%]' : 'w-full'
        }`}
      >
        {/* Chat Pane Header */}
        <div className="h-14 px-3 sm:px-4 border-b border-gray-200 dark:border-[#1F232B] bg-white dark:bg-[#0E1015] flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onToggleHistory}
              className="p-1 rounded-md text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21] transition-colors shrink-0"
              title="Toggle chat history"
              aria-label="Toggle chat history"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Mode dropdown with colored dot */}
            <ModeSelector />

            {/* Reading level selector (Student mode only) */}
            <ReadingLevelSelector />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Active Model Indicator */}
            <div
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100/80 dark:bg-[#181B21] border border-gray-200 dark:border-[#272B35] text-[11px] font-medium text-gray-700 dark:text-gray-300 shadow-2xs"
              title={`Active inference model: ${modelLabels[ragSettings?.model] || ragSettings?.model || 'GPT-4o'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"></span>
              <span>{modelLabels[ragSettings?.model] || ragSettings?.model || 'GPT-4o'}</span>
              {ragSettings?.hybridSearch && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider ml-0.5">
                  Hybrid
                </span>
              )}
            </div>

            <DocumentSelector
              selectedIds={selectedDocumentIds}
              onChange={setSelectedDocumentIds}
            />

            {/* Three-dots menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#181B21] transition-colors"
                title="Conversation options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 mt-1 w-44 rounded-xl bg-white dark:bg-[#181B21] border border-gray-200 dark:border-[#272B35] shadow-dropdown z-40 py-1 text-xs"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (messages.length > 0) {
                        sendMessage('Can you elaborate further?');
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#202530]"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Follow-up</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSession}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-2">
          {isLoadingMessages ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-28 w-5/6 rounded-2xl" />
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <EmptyChatState />
          ) : (
            <>
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <MessageBubble key={msg.id} message={msg} />
                ) : (
                  <AIMessage
                    key={msg.id}
                    message={msg}
                    onRegenerate={() => {
                      const idx = messages.findIndex((m) => m.id === msg.id);
                      if (idx > 0 && messages[idx - 1]?.role === 'user') {
                        sendMessage(messages[idx - 1].content);
                      }
                    }}
                  />
                )
              )}

              {/* Streaming Partial Assistant Response */}
              {isStreaming && (
                <AIMessage
                  message={{
                    content: streamingContent,
                    sources: [],
                  }}
                  isStreaming={true}
                />
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="shrink-0 bg-white dark:bg-[#0E1015]">
          <ChatInput
            onSendMessage={sendMessage}
            onStopStreaming={stopStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </div>

      {/* Right Document Viewer Split Panel (Matches screenshot) */}
      {isViewerOpen && (
        <div className="hidden lg:flex flex-1 h-full min-w-0 rounded-2xl bg-white dark:bg-[#0E1015] border border-gray-200 dark:border-[#1F232B] shadow-2xs overflow-hidden animate-in fade-in duration-150">
          <PdfViewer
            citation={activeCitation}
            onClose={() => setIsViewerOpen(false)}
          />
        </div>
      )}

      {/* Mobile Modal / Sheet version for small screens */}
      {isViewerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-[#0E1015] animate-in slide-in-from-bottom duration-200">
          <PdfViewer
            citation={activeCitation}
            onClose={() => setIsViewerOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
