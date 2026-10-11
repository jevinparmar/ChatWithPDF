import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, CornerDownLeft } from 'lucide-react';
import Button from '../ui/Button';

export default function ChatInput({
  onSendMessage,
  onStopStreaming,
  isStreaming = false,
  placeholder = 'Ask a question about your documents...',
}) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      <div className="relative rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card shadow-card focus-within:border-indigo-500 dark:focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent resize-none border-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0 px-2 py-1 max-h-44 leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 px-1 border-t border-gray-50 dark:border-dark-border/40 mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            <span>Use</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-border border border-gray-200 dark:border-gray-700 font-mono text-[10px]">
              Enter ↵
            </kbd>
            <span>to send,</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-border border border-gray-200 dark:border-gray-700 font-mono text-[10px]">
              Shift+Enter
            </kbd>
            <span>for new line</span>
          </div>

          <div>
            {isStreaming ? (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={onStopStreaming}
                icon={Square}
                className="rounded-xl px-3"
              >
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={!text.trim()}
                onClick={handleSubmit}
                icon={Send}
                className="rounded-xl px-3"
              >
                Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
