import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Layers,
  CheckCircle2,
  Plus,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import { useChat } from '../hooks/useChat';
import StatCard from '../components/admin/StatCard';
import FileUploader from '../components/documents/FileUploader';
import DocumentTable from '../components/documents/DocumentTable';
import Button from '../components/ui/Button';

export default function Dashboard() {
  const { user } = useAuth();
  const {
    documents,
    isLoading,
    isUploading,
    uploadProgress,
    uploadFile,
    deleteDocument,
  } = useDocuments();
  const { createSession } = useChat();
  const navigate = useNavigate();
  const uploaderRef = useRef(null);

  const totalPages = documents.reduce((acc, d) => acc + (d.pages || 0), 0);
  const readyCount = documents.filter((d) => d.status === 'ready').length;

  const handleStartGeneralChat = async () => {
    try {
      const readyDocIds = documents.filter((d) => d.status === 'ready').map((d) => d.id);
      const session = await createSession('Document Knowledge Base', readyDocIds);
      navigate(`/chat/${session.id}`);
    } catch (e) {
      navigate('/chat');
    }
  };

  const handleScrollToUpload = () => {
    uploaderRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Researcher'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your document knowledge base and chat across indexed files.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            icon={Plus}
            onClick={handleScrollToUpload}
          >
            Upload File
          </Button>
          <Button
            variant="primary"
            icon={MessageSquare}
            onClick={handleStartGeneralChat}
            disabled={readyCount === 0}
          >
            Start Chat
          </Button>
        </div>
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Documents"
          value={documents.length}
          change="+2 this week"
          icon={FileText}
          description="PDF, DOCX, and TXT files"
        />
        <StatCard
          title="Indexed Pages"
          value={totalPages}
          change="+36 pages"
          icon={Layers}
          description="Parsed into semantic vectors"
        />
        <StatCard
          title="Ready for RAG"
          value={readyCount}
          change="100% active"
          icon={CheckCircle2}
          description="Available for grounded Q&A"
        />
      </div>

      {/* Upload Zone */}
      <div ref={uploaderRef} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Ingest Knowledge
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Max 20MB per document
          </span>
        </div>
        <FileUploader
          onUpload={uploadFile}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </div>

      {/* Documents Table */}
      <div id="documents" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            All Documents ({documents.length})
          </h3>
        </div>
        <DocumentTable
          documents={documents}
          isLoading={isLoading}
          onDelete={deleteDocument}
          onUploadClick={handleScrollToUpload}
        />
      </div>
    </div>
  );
}
