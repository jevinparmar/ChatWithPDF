import { useState, useEffect, useCallback } from 'react';
import { documentApi } from '../api';
import toast from 'react-hot-toast';

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setError(null);
      const docs = await documentApi.getDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err.message || 'Failed to fetch documents');
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Polling check if any document is processing
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 2000);

    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const uploadFile = async (file) => {
    setIsUploading(true);
    setUploadProgress(20);
    try {
      // Simulate progressive visual feedback
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 90 ? prev + 25 : prev));
      }, 200);

      const newDoc = await documentApi.uploadDocument(file);
      clearInterval(progressTimer);
      setUploadProgress(100);
      toast.success(`${file.name} uploaded! Processing embeddings...`);
      await fetchDocuments();
      return newDoc;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document');
      throw err;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 600);
    }
  };

  const deleteDocument = async (id) => {
    try {
      await documentApi.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success('Document deleted');
    } catch (err) {
      toast.error('Failed to delete document');
      throw err;
    }
  };

  return {
    documents,
    isLoading,
    isUploading,
    uploadProgress,
    error,
    fetchDocuments,
    uploadFile,
    deleteDocument,
  };
}
