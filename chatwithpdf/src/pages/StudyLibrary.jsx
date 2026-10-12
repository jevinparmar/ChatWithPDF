import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Copy,
  Trash2,
  Printer,
  FileCode,
  FileText,
  FileQuestion,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import { downloadMarkdown, downloadDocx, printContent } from '../utils/exportUtils';
import QuizPlayer from '../components/modes/renderers/QuizPlayer';
import FlashcardDeck from '../components/modes/renderers/FlashcardDeck';
import MindMapViewer from '../components/modes/renderers/MindMapViewer';
import toast from 'react-hot-toast';

export default function StudyLibrary() {
  const { items, deleteItem, clearAll } = useLibraryStore();
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filteredItems = items.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (typeof item.content === 'string' && item.content.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleCopy = (content) => {
    const textToCopy = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    navigator.clipboard.writeText(textToCopy);
    toast.success('Copied content to clipboard');
  };

  const handleDelete = (id) => {
    deleteItem(id);
    toast.success('Removed from Study Library');
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'quiz':
        return <FileQuestion className="w-4 h-4 text-purple-500" />;
      case 'flashcards':
        return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'mind_map':
        return <Sparkles className="w-4 h-4 text-teal-500" />;
      default:
        return <FileText className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-light-bg dark:bg-[#0B0D12] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#1F232B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Study Library
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your saved revision notes, interactive quizzes, flashcards, and concept outlines
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all saved items in Study Library?')) {
                  clearAll();
                  toast.success('Study Library cleared');
                }
              }}
              className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Library
            </button>
          )}
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-white dark:bg-[#12141C] p-1 rounded-xl border border-gray-200 dark:border-[#202532] overflow-x-auto text-xs">
            {['all', 'notes', 'flashcards', 'quiz', 'mind_map'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                  filterType === type
                    ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {type === 'all' ? 'All Items' : type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-white dark:bg-[#12141C] border border-gray-200 dark:border-[#202532] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Content List */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-12 text-center bg-white/50 dark:bg-[#10121A]/50">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              No study items found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Use Student or Researcher quick actions in chat (Explain Full, Flashcards, Quiz, Revision Notes) and click the bookmark button to save them here!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => {
              const isExpanded = expandedId === item.id;
              const formattedDate = new Date(item.savedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              let parsedJson = null;
              if (typeof item.content === 'object') {
                parsedJson = item.content;
              } else if (typeof item.content === 'string' && item.content.trim().startsWith('{')) {
                try {
                  parsedJson = JSON.parse(item.content);
                } catch (e) {
                  parsedJson = null;
                }
              }

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-gray-200 dark:border-[#202532] bg-white dark:bg-[#12141C] shadow-2xs overflow-hidden transition-all"
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-[#1E232E]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#1A1D27] flex items-center justify-center shrink-0">
                        {getTypeIcon(item.type)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                          <span>{item.fileName}</span>
                          <span>•</span>
                          <span className="capitalize">{item.mode} Mode</span>
                          <span>•</span>
                          <span>{formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.content)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1D27] transition-colors"
                        title="Copy text"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadMarkdown(item.fileName, typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2))}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1D27] transition-colors"
                        title="Download Markdown (.md)"
                      >
                        <FileCode className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadDocx(item.fileName, typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2))}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1D27] transition-colors"
                        title="Download Word (.docx)"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => printContent(item.title, typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2))}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1D27] transition-colors"
                        title="Print / PDF View"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1A1D27] transition-colors ml-1"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Preview */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 bg-gray-50/50 dark:bg-[#0E1017] border-t border-gray-100 dark:border-[#1E232E] animate-in fade-in duration-150">
                      {parsedJson?.questions ? (
                        <QuizPlayer data={parsedJson} />
                      ) : parsedJson?.flashcards ? (
                        <FlashcardDeck data={parsedJson} />
                      ) : parsedJson?.children ? (
                        <MindMapViewer data={parsedJson} />
                      ) : (
                        <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
