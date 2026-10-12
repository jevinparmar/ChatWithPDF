import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Sparkles, BookOpen, Layers, Loader2 } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import toast from 'react-hot-toast';

export default function ChatInput({
  onSendMessage,
  onStopStreaming,
  isStreaming = false,
  placeholder,
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const { engineMode, setEngineMode, progressStep, selectedDocumentIds, dailyHeavyRemaining } = useChat();

  const isFullFile = engineMode === 'full_file';

  const defaultPlaceholder = isFullFile
    ? 'Ask full-file synthesis (e.g. Explain every topic in order, summarize, mind map)...'
    : 'Ask any specific question about your documents...';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isStreaming) {
      onStopStreaming();
      return;
    }
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAttachmentClick = () => {
    toast('Select documents from the top bar chips', {
      icon: '📎',
    });
  };

  return (
    <div className="w-full px-4 pb-4">
      {/* Progress Step Indicator Banner while processing long files or map-reduce */}
      {progressStep && (
        <div className="mb-2 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span className="font-medium">{progressStep}</span>
          </div>
          {isStreaming && (
            <button
              type="button"
              onClick={onStopStreaming}
              className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline"
            >
              Stop
            </button>
          )}
        </div>
      )}

      {/* Mode Controls Bar above input: Full file vs Ask a question toggle */}
      <div className="flex items-center justify-between pb-1.5 px-1 text-xs">
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#161922] p-0.5 rounded-xl border border-gray-200 dark:border-[#222733]">
          <button
            type="button"
            onClick={() => setEngineMode('question')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
              !isFullFile
                ? 'bg-white dark:bg-[#202532] text-gray-900 dark:text-white shadow-2xs font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Ask a question
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedDocumentIds.length === 0) {
                toast('Tip: Select files first for full-document synthesis', { icon: '💡' });
              }
              setEngineMode('full_file');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
              isFullFile
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Full file</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {dailyHeavyRemaining != null && (
            <span
              title="Daily heavy AI operation quota (full-file synthesis, quizzes, comparison, rewrites)"
              className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/40"
            >
              ⚡ {dailyHeavyRemaining}/50 actions left today
            </span>
          )}
          <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
            {isFullFile ? 'Comprehensive Map-Reduce Engine' : 'Grounded RAG Search'}
          </span>
        </div>
      </div>

      <div className="relative flex items-center bg-white dark:bg-[#181B21] border border-gray-200 dark:border-[#272B35] rounded-xl shadow-2xs px-3 py-2 transition-all focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/20">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          className="flex-1 bg-transparent resize-none border-0 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0 py-1 leading-relaxed max-h-32"
        />

        {/* Right Icons: Paperclip + Send / Stop */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            type="button"
            onClick={handleAttachmentClick}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#202530] transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4 rotate-45" />
          </button>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="Stop response"
            >
              <Square className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-indigo-600 dark:bg-[#222733] dark:hover:bg-indigo-600 text-gray-500 dark:text-gray-300 hover:text-white dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
