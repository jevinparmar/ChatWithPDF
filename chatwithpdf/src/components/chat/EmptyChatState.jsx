import React, { useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import { getModeMeta, ACTION_ICON_MAP } from '../../utils/modeMeta';
import { Sparkles, FileText, AlertCircle, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmptyChatState({ onOpenDocSelector }) {
  const {
    activeMode,
    modes,
    fetchModes,
    selectedDocumentIds,
    runAction,
  } = useChat();

  useEffect(() => {
    if (!modes || modes.length === 0) {
      fetchModes();
    }
  }, [modes, fetchModes]);

  const modeMeta = getModeMeta(activeMode);
  const currentModeData = modes?.find((m) => m.id === activeMode);
  const quickActions = currentModeData?.quick_actions || [];

  const handleActionClick = (action) => {
    const docCount = selectedDocumentIds.length;

    if (action.needs === 'one_file' && docCount === 0) {
      toast.error('Please select at least one document first', { icon: '📄' });
      if (onOpenDocSelector) onOpenDocSelector();
      return;
    }

    if (action.needs === 'two_files' && docCount < 2) {
      toast.error('This action requires 2 documents (e.g. Resume and Job Description)', { icon: '📑' });
      if (onOpenDocSelector) onOpenDocSelector();
      return;
    }

    runAction({
      actionId: action.id,
      actionLabel: action.label,
      documentIds: selectedDocumentIds,
      options: {},
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto py-6 sm:py-10 px-4 flex flex-col items-center animate-in fade-in duration-200">
      {/* Mode Greeting Banner */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-3 h-3 rounded-full ${modeMeta.dotClass} shadow-xs`} />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {modeMeta.name} Mode Active
        </span>
      </div>

      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white text-center mb-1">
        {modeMeta.tagline}
      </h3>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center max-w-lg mb-6 leading-relaxed">
        {modeMeta.description}
      </p>

      {/* Selected Docs Alert / Reminder */}
      {selectedDocumentIds.length === 0 && (
        <div className="mb-6 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Select documents from the top bar to unlock full file intelligence and quick actions.</span>
        </div>
      )}

      {/* Quick Action Grid */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickActions.map((action) => {
          const Icon = ACTION_ICON_MAP[action.id] || Sparkles;
          const needsOne = action.needs === 'one_file';
          const needsTwo = action.needs === 'two_files';
          const isMissingFile = (needsOne && selectedDocumentIds.length === 0) || (needsTwo && selectedDocumentIds.length < 2);

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionClick(action)}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 relative group cursor-pointer ${
                isMissingFile
                  ? 'border-gray-200 dark:border-[#1E232E] bg-gray-50/50 dark:bg-[#13161F]/60 opacity-80 hover:opacity-100 hover:border-gray-300 dark:hover:border-gray-700'
                  : `border-gray-200 dark:border-[#1E232E] bg-white dark:bg-[#141722] hover:shadow-md ${modeMeta.cardBorderHover}`
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#1E232E] flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                </div>

                <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {action.label}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                  {action.description}
                </p>
              </div>

              {isMissingFile && (
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  <FileText className="w-3 h-3" />
                  <span>{needsTwo ? 'Select 2 files first' : 'Select a file first'}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
