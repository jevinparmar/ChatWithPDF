import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export default function FileUploader({ onUpload, isUploading = false, uploadProgress = 0 }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return false;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(`Invalid file format. Please upload PDF, DOCX, or TXT documents.`);
      toast.error('Only PDF, DOCX, and TXT files are supported');
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage(`File exceeds the 20MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
      toast.error('File size cannot exceed 20MB');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (validateFile(file)) {
      onUpload(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isUploading) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className="w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 text-center ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 scale-[1.01]'
            : 'border-gray-200 dark:border-dark-border hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-dark-card hover:bg-gray-50/50 dark:hover:bg-dark-hover/40'
        } ${isUploading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />

        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-subtle">
          <UploadCloud className="w-6 h-6 animate-pulse" />
        </div>

        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          {isDragOver ? 'Drop your document here' : 'Click or drag documents to upload'}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
          Supports <span className="font-medium text-gray-700 dark:text-gray-300">PDF, DOCX, TXT</span> up to 20MB. Automatically parsed and indexed for RAG retrieval.
        </p>

        {/* Upload progress bar */}
        {isUploading && (
          <div className="w-full max-w-xs mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
              <span>Uploading &amp; parsing...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
