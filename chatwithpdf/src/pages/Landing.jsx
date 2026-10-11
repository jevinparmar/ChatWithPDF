import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  CheckCircle2,
  Shield,
  Zap,
  Layers,
  ArrowRight,
  Database,
  Quote,
  Sparkles,
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';

export default function Landing() {
  const steps = [
    {
      num: '01',
      title: 'Upload Any Document',
      desc: 'Drag & drop PDFs, Word files, or text notes. Our async engine handles OCR, hierarchy parsing, and vector chunking in seconds.',
      icon: FileText,
    },
    {
      num: '02',
      title: 'Hybrid Semantic Retrieval',
      desc: 'When you ask a question, hybrid dense + BM25 sparse search retrieves the exact relevant paragraphs with zero hallucination.',
      icon: Search,
    },
    {
      num: '03',
      title: 'Answer with Page Citations',
      desc: 'Receive clear, synthesized answers. Click any source pill to instantly inspect the exact highlighted page in the built-in PDF viewer.',
      icon: CheckCircle2,
    },
  ];

  const features = [
    {
      title: 'Multi-Format Ingestion',
      desc: 'Support for PDF, DOCX, and TXT files up to 20MB with high-throughput async processing.',
      icon: Layers,
    },
    {
      title: 'Verifiable Source Citations',
      desc: 'Every single claim is linked to its originating page and exact sentence snippet.',
      icon: Quote,
    },
    {
      title: 'Hallucination Resistant',
      desc: 'Strict RAG grounding ensures answers are strictly derived from your trusted uploaded documents.',
      icon: Shield,
    },
    {
      title: 'Instant Streaming Responses',
      desc: 'Fast word-by-word token streaming with immediate feedback and stop response controls.',
      icon: Zap,
    },
    {
      title: 'Hybrid Vector + Keyword Search',
      desc: 'Combine semantic vector embeddings with exact BM25 keyword matching for optimal recall.',
      icon: Database,
    },
    {
      title: 'Team & Admin Governance',
      desc: 'Track query volumes, inspect downvoted answers, and monitor user feedback in real time.',
      icon: Sparkles,
    },
  ];

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-gray-900 dark:text-gray-100 flex flex-col transition-colors selection:bg-indigo-500/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 max-w-7xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-8 animate-in fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation RAG Document Intelligence</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-950 dark:text-white max-w-4xl mx-auto leading-[1.15] mb-6">
          Chat with your documents.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500">
            Get answers with sources.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Stop digging through hundreds of pages. Upload PDF, DOCX, and TXT files to chat with your knowledge base and verify answers with pinpoint citations.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-16">
          <Link to="/signup" className="w-full sm:w-auto">
            <Button size="lg" variant="primary" icon={ArrowRight} className="w-full sm:w-auto">
              Start Chatting Free
            </Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign In to Workspace
            </Button>
          </Link>
        </div>

        {/* Product Preview Card Mock */}
        <div className="relative max-w-5xl mx-auto rounded-2xl p-2 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent border border-gray-200/80 dark:border-dark-border shadow-2xl overflow-hidden">
          <div className="rounded-xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border p-6 sm:p-8 text-left shadow-subtle">
            {/* Mock Header */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-teal-400" />
                <span className="text-xs font-mono text-gray-400 ml-2">Chatwithpdf - Workspace Session</span>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                Grounded Mode
              </span>
            </div>

            {/* Mock Chat Q&A */}
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* User question */}
              <div className="flex justify-end">
                <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-indigo-600 text-white text-xs sm:text-sm font-medium">
                  What is our policy on customer refunds for digital software licenses?
                </div>
              </div>
              {/* AI answer with citation pill */}
              <div className="flex justify-start">
                <div className="p-4 rounded-2xl rounded-tl-xs bg-gray-50 dark:bg-dark-bg/80 border border-gray-200/70 dark:border-dark-border text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                  <p className="mb-2">
                    According to the refund policy document, digital licenses are generally <strong className="text-indigo-600 dark:text-indigo-400">non-refundable</strong> once generated, unless an unresolvable technical flaw is verified by our engineering team within 30 days.
                  </p>
                  <div className="pt-2 border-t border-gray-200/60 dark:border-dark-border flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase">Citation:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-dark-card border border-indigo-200 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                      <FileText className="w-3 h-3 text-indigo-500" />
                      refund_policy_2025.pdf · Page 4
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step How It Works */}
      <section id="how-it-works" className="py-20 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card/40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
              Workflow
            </h2>
            <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              How Chatwithpdf Works
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.num} className="p-6 rounded-2xl bg-light-bg dark:bg-dark-card border border-gray-100 dark:border-dark-border relative group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                  <span className="text-3xl font-extrabold text-indigo-200 dark:text-indigo-950/80 mb-4 block">
                    {st.num}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    {st.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6-Card Features Grid */}
      <section id="features" className="py-20 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
            Capabilities
          </h2>
          <h3 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Built for Modern Enterprise Research
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border hover:border-indigo-200 dark:hover:border-indigo-900 shadow-subtle transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                  {feat.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card py-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Chatwithpdf</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            &copy; 2026 Chatwithpdf. Engineered with modern React, Tailwind &amp; FastAPI RAG.
          </p>
        </div>
      </footer>
    </div>
  );
}
