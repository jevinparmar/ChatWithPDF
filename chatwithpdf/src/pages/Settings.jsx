import React, { useState } from 'react';
import {
  User,
  Cpu,
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  Save,
} from 'lucide-react';
import Tabs from '../components/ui/Tabs';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Toggle from '../components/ui/Toggle';
import Slider from '../components/ui/Slider';
import Badge from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../hooks/useChat';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, updateUserMode } = useAuth();
  const { theme, setTheme } = useTheme();
  const { ragSettings, setRagSettings } = useChat();

  const [activeTab, setActiveTab] = useState('retrieval');
  const [profileName, setProfileName] = useState(user?.name || 'Alex Johnson');
  const [localSettings, setLocalSettings] = useState(ragSettings);

  const tabs = [
    { id: 'retrieval', label: 'AI & Retrieval', icon: Cpu },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  const handleSaveRetrieval = () => {
    setRagSettings(localSettings);
    toast.success('RAG retrieval settings saved');
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    toast.success('Profile information updated');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-150">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Settings &amp; Preferences
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure model parameters, RAG retrieval thresholds, and visual appearance.
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab: AI & Retrieval */}
      {activeTab === 'retrieval' && (
        <div className="bg-white dark:bg-[#161920] border border-gray-200 dark:border-[#1F232B] rounded-2xl p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="border-b border-gray-100 dark:border-[#1F232B] pb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              RAG Pipeline Configuration
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Adjust context window density, chunk boundaries, and vector search parameters.
            </p>
          </div>

          {/* Model selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Inference LLM Model
              </label>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium border border-emerald-200/50 dark:border-emerald-800/40">
                Live Cloud &amp; Offline Fallback Active
              </span>
            </div>
            <select
              value={localSettings.model}
              onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
              className="w-full sm:w-80 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-900 dark:text-white px-3.5 py-2.5 outline-none focus:border-indigo-500"
            >
              <option value="gpt-4o">GPT-4o (High precision &amp; multi-lingual)</option>
              <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Deep synthesis)</option>
              <option value="llama-3-70b">Llama 3 70B (Fast via Groq / Ollama)</option>
            </select>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
              Powered by unified OpenAI-compatible routing with zero-crash deterministic offline fallback.
            </p>
          </div>

          {/* Sliders */}
          <div className="space-y-4 pt-2">
            <Slider
              label="Top-K Retrieved Chunks"
              description="Maximum number of context paragraphs injected into the prompt"
              min={1}
              max={10}
              step={1}
              value={localSettings.topK}
              onChange={(val) => setLocalSettings({ ...localSettings, topK: val })}
              unit="chunks"
            />

            <div>
              <Slider
                label="Target Chunk Size"
                description="Token size for document recursive character splitting during ingestion"
                min={256}
                max={1024}
                step={64}
                value={localSettings.chunkSize}
                onChange={(val) => setLocalSettings({ ...localSettings, chunkSize: val })}
                unit="tokens"
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 italic">
                * Note: Applied when uploading new documents. Previously indexed files retain their existing chunk boundaries.
              </p>
            </div>
          </div>

          {/* Toggles */}
          <div className="pt-2 border-t border-gray-100 dark:border-dark-border space-y-3">
            <Toggle
              label="Display Verifiable Citations"
              description="Render interactive page tags beneath every assistant response"
              checked={localSettings.showCitations}
              onChange={(checked) => setLocalSettings({ ...localSettings, showCitations: checked })}
            />

            <div>
              <Toggle
                label="Hybrid Dense + BM25 Sparse Search"
                description="Combine semantic vector distance with reciprocal rank BM25 keyword matching"
                checked={localSettings.hybridSearch}
                onChange={(checked) => setLocalSettings({ ...localSettings, hybridSearch: checked })}
              />
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-1">
                Fuses pgvector cosine embeddings with PostgreSQL full-text search (<code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">ts_rank_cd</code>) using Reciprocal Rank Fusion (RRF).
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button variant="primary" icon={Save} onClick={handleSaveRetrieval}>
              Save RAG Preferences
            </Button>
          </div>
        </div>
      )}

      {/* Tab: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                User Profile
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Manage your identity and role settings.
              </p>
            </div>
            <Badge variant="indigo" size="sm">
              Role: {user?.role?.toUpperCase() || 'USER'}
            </Badge>
          </div>

          <div className="space-y-4 max-w-md">
            <Input
              label="Display Name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
            <Input
              label="Email Address"
              value={user?.email || 'user@test.com'}
              disabled
              helperText="Managed by workspace administrator"
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                Default Workspace Mode
              </label>
              <select
                value={user?.mode || 'student'}
                onChange={async (e) => {
                  try {
                    await updateUserMode(e.target.value);
                    toast.success(`Default mode updated to ${e.target.value}`);
                  } catch (err) {
                    toast.error('Failed to update default mode');
                  }
                }}
                className="w-full rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg text-sm text-gray-900 dark:text-white px-3.5 py-2.5 outline-none focus:border-indigo-500"
              >
                <option value="student">Student (Friendly explanations, glossary, flashcards &amp; quizzes)</option>
                <option value="researcher">Researcher (Academic synthesis, matrix comparison, literature review)</option>
                <option value="business">Business (Executive summaries, policy verification, SOP checklist)</option>
                <option value="legal">Legal (Contract breakdown, Red/Amber/Green risk badges)</option>
                <option value="career">Career (Resume matching, achievement rewrites, interview prep)</option>
              </select>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                New chats will automatically start in this mode. You can switch per chat anytime.
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="submit" variant="primary" icon={Save}>
              Save Profile
            </Button>
          </div>
        </form>
      )}

      {/* Tab: Appearance */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="border-b border-gray-100 dark:border-dark-border pb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Color Theme
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select your interface theme. Persisted to your local storage across sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Crisp white with subtle shadows' },
              { id: 'dark', label: 'Dark Mode', icon: Moon, desc: '#0F1115 canvas with #181B21 cards' },
              { id: 'system', label: 'System Theme', icon: Laptop, desc: 'Automatically adapt to OS setting' },
            ].map((mode) => {
              const Icon = mode.icon;
              const isSelected = theme === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setTheme(mode.id)}
                  className={`p-5 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20'
                      : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center text-gray-700 dark:text-gray-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {mode.label}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {mode.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
