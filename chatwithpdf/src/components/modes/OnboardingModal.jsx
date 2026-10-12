import React, { useState } from 'react';
import { Check, ArrowRight, X } from 'lucide-react';
import { MODE_METADATA } from '../../utils/modeMeta';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import toast from 'react-hot-toast';

export default function OnboardingModal({ isOpen, onClose }) {
  const { user, updateUserMode } = useAuthStore();
  const { setActiveMode } = useChatStore();
  const [selectedMode, setSelectedMode] = useState(user?.mode || 'student');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateUserMode(selectedMode);
      await setActiveMode(selectedMode);
      localStorage.setItem('onboarding_completed', 'true');
      toast.success(`Welcome to ${MODE_METADATA[selectedMode]?.name} mode!`);
      onClose();
    } catch (err) {
      toast.error('Failed to set preferred mode');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_completed', 'true');
    onClose();
  };

  const modes = Object.values(MODE_METADATA);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#12141C] border border-gray-200 dark:border-[#222733] shadow-2xl overflow-hidden p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-md">
              Personalize Your Experience
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-2">
              How will you use ChatWithPDF?
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Choose your primary workflow. You can easily switch modes anytime per conversation.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1C202C] transition-colors"
            title="Skip for now"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5 Mode Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;

            return (
              <div
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? `${mode.borderClass} bg-indigo-50/30 dark:bg-indigo-950/20 shadow-sm`
                    : 'border-gray-200 dark:border-[#1E232E] hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-[#151822]'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-[#202532] text-gray-700 dark:text-gray-300'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        {mode.name}
                        <span className={`w-2 h-2 rounded-full ${mode.dotClass}`} />
                      </h4>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {mode.tagline}
                      </span>
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1">
                  {mode.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[#1E232E]">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white px-3 py-2 rounded-xl transition-colors"
          >
            Skip for now
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-transform active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Saving...' : 'Get Started'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
