import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
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
  const { submitFeedback, setActiveCitation, selectedDocumentIds } = useChat();

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
    toast.success(rating === 'up' ? 'Feedback recorded!' : 'Feedback recorded.');
  };

  const handleCitationClick = (pageNum) => {
    // Find matching source or default to active document
    const found = message.sources?.find((s) => s.page === pageNum);
    if (found) {
      setActiveCitation(found);
    } else {
      setActiveCitation({
        documentId: selectedDocumentIds[0] || 'doc-annual-report',
        fileName: 'Annual Report 2024.pdf',
        page: pageNum,
        snippet: `Section ${pageNum}: Cited provisions and architectural details.`,
      });
    }
  };

  // Custom markdown components to style blockquotes and inline [Source: Page X] badges
  const markdownComponents = {
    // Intercept text or links to highlight [Source: Page X]
    p: ({ children }) => {
      return (
        <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3">
          {children}
        </p>
      );
    },
    blockquote: ({ children }) => (
      <blockquote className="my-3 pl-4 border-l-2 border-indigo-500 text-gray-800 dark:text-gray-200 italic text-xs sm:text-sm font-normal">
        {children}
      </blockquote>
    ),
    code: ({ children }) => {
      const text = String(children);
      const sourceMatch = text.match(/Source:\s*Page\s*(\d+)/i);
      if (sourceMatch) {
        const pageNum = parseInt(sourceMatch[1], 10);
        return (
          <button
            type="button"
            onClick={() => handleCitationClick(pageNum)}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs mx-1 transition-transform active:scale-95"
            title={`View page ${pageNum}`}
          >
            [Source: Page {pageNum}]
          </button>
        );
      }
      return (
        <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-[#202530] text-indigo-600 dark:text-indigo-400 font-mono text-xs">
          {children}
        </code>
      );
    },
  };

  // Helper to replace `[Source: Page X]` with backticks so ReactMarkdown renders it with our custom code component
  const formattedContent = (message.content || '').replace(
    /\[Source:\s*Page\s*(\d+)\]/gi,
    '`Source: Page $1`'
  );

  return (
    <div className="w-full mb-6 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="w-full">
        {/* Assistant Header matching screenshot */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            {/* Glowing violet/indigo circular avatar */}
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <span className="w-2 h-2 rounded-xs bg-white/90 rotate-45" />
            </div>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              Assistant
            </span>
          </div>

          {/* Action buttons */}
          {!isStreaming && (
            <div className="flex items-center gap-1 text-gray-400">
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded-md hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E232C] transition-colors"
                title="Copy text"
                aria-label="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="p-1 rounded-md hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1E232C] transition-colors"
                  title="Regenerate"
                  aria-label="Regenerate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="h-3 w-px bg-gray-200 dark:bg-[#272B35] mx-0.5" />
              <button
                type="button"
                onClick={() => handleFeedback('up')}
                className={`p-1 rounded-md transition-colors ${
                  message.feedback === 'up'
                    ? 'text-teal-500 bg-teal-50 dark:bg-teal-950/40'
                    : 'hover:text-teal-500 hover:bg-gray-100 dark:hover:bg-[#1E232C]'
                }`}
                title="Thumbs up"
                aria-label="Thumbs up"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback('down')}
                className={`p-1 rounded-md transition-colors ${
                  message.feedback === 'down'
                    ? 'text-red-500 bg-red-50 dark:bg-red-950/40'
                    : 'hover:text-red-500 hover:bg-gray-100 dark:hover:bg-[#1E232C]'
                }`}
                title="Thumbs down"
                aria-label="Thumbs down"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content pl-7 to align neatly under the Assistant header */}
        <div className="pl-7">
          <div className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
            <ReactMarkdown components={markdownComponents}>{formattedContent}</ReactMarkdown>
            {isStreaming && <StreamingCursor />}
          </div>

          {/* Citation Chips at bottom */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Sources:
              </span>
              {message.sources.map((src, idx) => (
                <SourceChip key={idx} source={src} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
