import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChatInput({
  onSendMessage,
  onStopStreaming,
  isStreaming = false,
  placeholder = 'Ask anything about this document...',
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

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
    toast('Select additional documents in the top bar dropdown', {
      icon: '📎',
    });
  };

  return (
    <div className="w-full px-4 pb-4">
      <div className="relative flex items-center bg-white dark:bg-[#181B21] border border-gray-200 dark:border-[#272B35] rounded-xl shadow-2xs px-3 py-2 transition-all focus-within:border-indigo-500/80 focus-within:ring-1 focus-within:ring-indigo-500/20">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
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
