import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  Trash2,
  ExternalLink,
  AlertTriangle,
  FileCode,
  FileSpreadsheet,
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Skeleton from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { formatFileSize } from '../../utils/formatFileSize';
import { formatDate } from '../../utils/formatDate';
import { useChat } from '../../hooks/useChat';

export default function DocumentTable({
  documents = [],
  isLoading = false,
  onDelete,
  onUploadClick,
}) {
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { createSession } = useChat();
  const navigate = useNavigate();

  const handleStartChat = async (docId) => {
    try {
      const doc = documents.find((d) => d.id === docId);
      const session = await createSession(doc ? `Chat with ${doc.name}` : 'New chat', [docId]);
      navigate(`/chat/${session.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(docToDelete.id);
      setDocToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDocIcon = (type = '') => {
    const t = type.toLowerCase();
    if (t === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
    if (t === 'docx') return <FileSpreadsheet className="w-4 h-4 text-blue-500" />;
    return <FileCode className="w-4 h-4 text-emerald-500" />;
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl overflow-hidden shadow-subtle p-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3 w-1/3">
              <Skeleton className="w-8 h-8" />
              <Skeleton className="w-32 h-4" />
            </div>
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-20 h-6" />
            <Skeleton className="w-24 h-8" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload your first PDF, DOCX, or TXT file above to index it and start chatting."
        actionLabel="Upload document"
        onAction={onUploadClick}
      />
    );
  }

  return (
    <>
      <div className="w-full bg-white dark:bg-[#161920] border border-gray-200 dark:border-[#1F232B] rounded-2xl shadow-subtle overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 dark:bg-[#12151B] text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-[#1F232B]">
              <tr>
                <th className="py-3.5 px-5">Document Name</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Size</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Pages</th>
                <th className="py-3.5 px-4 hidden lg:table-cell">Uploaded</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F232B]">
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-[#1E232C]/60 transition-colors"
                >
                  <td className="py-3.5 px-5">
                    <Link
                      to={`/documents/${doc.id}`}
                      className="flex items-center gap-3 group max-w-xs md:max-w-sm truncate"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-dark-border flex items-center justify-center shrink-0">
                        {getDocIcon(doc.type)}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                        {doc.name}
                      </span>
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {formatFileSize(doc.size)}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {doc.pages || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        icon={MessageSquare}
                        disabled={doc.status !== 'ready'}
                        onClick={() => handleStartChat(doc.id)}
                        title="Chat with this document"
                      >
                        <span className="hidden sm:inline">Chat</span>
                      </Button>
                      <Link to={`/documents/${doc.id}`}>
                        <Button size="sm" variant="ghost" title="View document details">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Delete document"
                        aria-label="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        title="Delete Document"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Are you sure you want to delete <span className="font-semibold">{docToDelete?.name}</span>?
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will remove the document and its vector embeddings permanently. Ongoing chats referencing this file may lose source context.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDocToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={confirmDelete}
            >
              Delete Document
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
