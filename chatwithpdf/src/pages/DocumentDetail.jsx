import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  Trash2,
  ArrowLeft,
  Calendar,
  Layers,
  Sparkles,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { documentApi } from '../api';
import { formatFileSize } from '../utils/formatFileSize';
import { formatDate } from '../utils/formatDate';
import StatusBadge from '../components/documents/StatusBadge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Skeleton from '../components/ui/Skeleton';
import { useChat } from '../hooks/useChat';
import toast from 'react-hot-toast';

export default function DocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { createSession, sendMessage } = useChat();

  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const doc = await documentApi.getDocument(id);
        if (isMounted) setDocument(doc);
      } catch (err) {
        toast.error('Document not found');
        navigate('/dashboard');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const handleStartChatWithQuestion = async (question) => {
    try {
      const session = await createSession(
        `Chat: ${document.name}`,
        [document.id]
      );
      navigate(`/chat/${session.id}`);
      if (question) {
        setTimeout(() => sendMessage(question), 250);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await documentApi.deleteDocument(id);
      toast.success('Document deleted');
      navigate('/dashboard');
    } catch (e) {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Top back link */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Documents</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            icon={Trash2}
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Delete
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleStartChatWithQuestion()}
            icon={MessageSquare}
          >
            Start Chat
          </Button>
        </div>
      </div>

      {/* Main Document Summary Card */}
      <div className="bg-white dark:bg-[#161920] border border-gray-200 dark:border-[#1F232B] rounded-2xl p-6 sm:p-8 shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-[#1F232B]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {document.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>{formatFileSize(document.size)}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  {document.pages} Pages
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Uploaded {formatDate(document.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div>
            <StatusBadge status={document.status} />
          </div>
        </div>

        {/* Executive Summary */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
            AI Ingestion Summary
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-dark-bg/60 p-4 rounded-xl border border-gray-100 dark:border-dark-border">
            {document.summary}
          </p>
        </div>

        {/* Key Topics Tags */}
        {document.topics && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">
              <Tag className="w-3.5 h-3.5" />
              <span>Extracted Topics</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {document.topics.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-dark-border text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      {document.suggestedQuestions && (
        <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 sm:p-8 shadow-subtle">
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-4 h-4" />
            <span>Suggested Research Questions</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {document.suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleStartChatWithQuestion(q)}
                className="text-left p-4 rounded-xl bg-gray-50/70 hover:bg-indigo-50/50 dark:bg-dark-bg/60 dark:hover:bg-indigo-950/30 border border-gray-100 dark:border-dark-border hover:border-indigo-200 dark:hover:border-indigo-900 transition-all text-xs font-medium text-gray-800 dark:text-gray-200 group"
              >
                <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-relaxed block">
                  "{q}"
                </span>
                <span className="text-[11px] text-gray-400 group-hover:text-indigo-500 mt-2 block font-normal">
                  Click to launch chat →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Page Thumbnails Preview */}
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-6 sm:p-8 shadow-subtle">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
          Page Thumbnails &amp; Structure ({document.pages} Pages)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: Math.min(document.pages || 6, 6) }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg/80 flex flex-col items-center justify-between p-3 text-center hover:border-indigo-400 transition-colors cursor-pointer group"
              onClick={() => handleStartChatWithQuestion(`Tell me what is covered on page ${i + 1}`)}
            >
              <span className="text-[10px] font-mono text-gray-400">P. {i + 1}</span>
              <div className="w-full space-y-1 my-auto opacity-40 group-hover:opacity-80 transition-opacity">
                <div className="h-1 bg-gray-400 rounded-full w-4/5 mx-auto" />
                <div className="h-1 bg-gray-400 rounded-full w-full mx-auto" />
                <div className="h-1 bg-gray-400 rounded-full w-3/4 mx-auto" />
              </div>
              <span className="text-[9px] font-medium text-gray-400 group-hover:text-indigo-500">Inspect</span>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Document"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Delete {document.name}?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will delete the file and all associated embeddings permanently.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
