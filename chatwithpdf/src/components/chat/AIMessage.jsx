import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  FileCheck,
} from 'lucide-react';
import SourceChip from './SourceChip';
import StreamingCursor from './StreamingCursor';
import toast from 'react-hot-toast';
import { useChat } from '../../hooks/useChat';

export default function AIMessage({
  message,
  isStreaming = false,
  onRegenerate,
}) {
  const [copied, setCopied] = useState(false);
  const { submitFeedback } = useChat();

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (rating) => {
    if (!message.id) return;
    submitFeedback(message.id, rating);
    toast.success(rating === 'up' ? 'Feedback recorded! Glad it helped.' : 'Feedback recorded. We will improve.');
  };

  return (
    <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="max-w-[95%] sm:max-w-[85%] w-full">
        {/* Main AI Card */}
        <div className="p-4 sm:p-5 rounded-2xl rounded-tl-xs bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border shadow-subtle">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                Chatwithpdf AI
              </span>
            </div>

            {/* Actions: Copy, Regenerate, Thumbs */}
            {!isStreaming && (
              <div className="flex items-center gap-1 text-gray-400">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                  title="Copy text"
                  aria-label="Copy message"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {onRegenerate && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="p-1.5 rounded-lg hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                    title="Regenerate answer"
                    aria-label="Regenerate answer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="h-3 w-px bg-gray-200 dark:bg-dark-border mx-0.5" />
                <button
                  type="button"
                  onClick={() => handleFeedback('up')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    message.feedback === 'up'
                      ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40'
                      : 'hover:text-teal-600 hover:bg-gray-100 dark:hover:bg-dark-hover'
                  }`}
                  title="Good answer"
                  aria-label="Thumbs up"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback('down')}
                  className={`p-1.5 rounded-lg transition-colors ${
                    message.feedback === 'down'
                      ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40'
                      : 'hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-hover'
                  }`}
                  title="Poor answer"
                  aria-label="Thumbs down"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Markdown Content */}
          <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-0.5">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {isStreaming && <StreamingCursor />}
          </div>

          {/* Citations section */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                <FileCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Verified Sources ({message.sources.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((src, idx) => (
                  <SourceChip key={idx} source={src} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
