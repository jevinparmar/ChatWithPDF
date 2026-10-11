import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import AIMessage from './AIMessage';
import SuggestedQuestions from './SuggestedQuestions';
import ChatInput from './ChatInput';
import DocumentSelector from '../documents/DocumentSelector';
import PdfViewer from '../documents/PdfViewer';
import Skeleton from '../ui/Skeleton';
import { useChat } from '../../hooks/useChat';
import { Sparkles, History, ChevronLeft, ChevronRight } from 'lucide-react';

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
  } = useChat();

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white dark:bg-dark-bg">
      {/* Chat Area (Takes 100% when viewer is closed, or 45% when viewer is open) */}
      <div
        className={`flex flex-col h-full transition-all duration-300 ${
          isViewerOpen ? 'w-full lg:w-[45%]' : 'w-full'
        }`}
      >
        {/* Top Header */}
        <div className="h-16 px-4 sm:px-6 border-b border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleHistory}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
              title={isHistoryOpen ? 'Hide history' : 'Show history'}
              aria-label="Toggle history sidebar"
            >
              <History className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-gray-200 dark:bg-dark-border mx-1 hidden sm:block" />
            {/* Document Selector */}
            <DocumentSelector
              selectedIds={selectedDocumentIds}
              onChange={setSelectedDocumentIds}
            />
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
          {isLoadingMessages ? (
            <div className="space-y-4 max-w-xl mx-auto py-8">
              <Skeleton className="h-14 w-3/4 ml-auto rounded-2xl" />
              <Skeleton className="h-28 w-5/6 rounded-2xl" />
              <Skeleton className="h-14 w-2/3 ml-auto rounded-2xl" />
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center min-h-[60%]">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-subtle">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                How can I assist your research today?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
                Ask any question grounded in your documents. Every statement is verified with direct page citations.
              </p>
              <SuggestedQuestions onSelectQuestion={sendMessage} />
            </div>
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
                      // find preceding user message
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
        <div className="shrink-0 bg-gradient-to-t from-white via-white to-transparent dark:from-dark-bg dark:via-dark-bg pt-2">
          <ChatInput
            onSendMessage={sendMessage}
            onStopStreaming={stopStreaming}
            isStreaming={isStreaming}
          />
        </div>
      </div>

      {/* PDF Viewer Panel (Takes 55% when open) */}
      {isViewerOpen && (
        <div className="hidden lg:block w-[55%] h-full shrink-0 animate-in slide-in-from-right duration-200">
          <PdfViewer
            citation={activeCitation}
            onClose={() => setIsViewerOpen(false)}
          />
        </div>
      )}

      {/* Mobile Drawer version of PDF Viewer for smaller screens */}
      {isViewerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-dark-card animate-in slide-in-from-bottom duration-200">
          <PdfViewer
            citation={activeCitation}
            onClose={() => setIsViewerOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
