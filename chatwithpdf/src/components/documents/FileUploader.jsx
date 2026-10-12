import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ALLOWED_EXTENSIONS = [
  'pdf',
  'docx',
  'doc',
  'pptx',
  'ppt',
  'txt',
  'md',
  'csv',
  'xlsx',
  'xls',
  'png',
  'jpg',
  'jpeg',
  'webp',
];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ROLE_OPTIONS = [
  { value: '', label: 'General / Auto' },
  { value: 'notes', label: 'Study Notes' },
  { value: 'paper', label: 'Research Paper' },
  { value: 'contract', label: 'Contract / Legal' },
  { value: 'resume', label: 'Resume' },
  { value: 'job_description', label: 'Job Description' },
  { value: 'other', label: 'Other Document' },
];

export default function FileUploader({ onUpload, isUploading = false, uploadProgress = 0 }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return false;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(`Invalid file format. Supported: PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, PNG, JPG.`);
      toast.error('Unsupported file format');
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
      onUpload(file, selectedRole || undefined);
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
    <div className="w-full space-y-3">
      {/* Role tagging dropdown */}
      <div className="flex items-center justify-between px-1">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-indigo-500" />
          <span>Tag upload as:</span>
        </label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          disabled={isUploading}
          className="text-xs py-1 px-2.5 rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-7 sm:p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 text-center ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 scale-[1.01]'
            : 'border-gray-200 dark:border-[#1F232B] hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-[#161920] hover:bg-gray-50/50 dark:hover:bg-[#1E232C]/40'
        } ${isUploading ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />

        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-subtle">
          <UploadCloud className="w-6 h-6 animate-pulse" />
        </div>

        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          {isDragOver ? 'Drop your document here' : 'Click or drag files to upload'}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-3">
          Supports <span className="font-semibold text-gray-700 dark:text-gray-300">PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, Images</span> (scans OCR'd automatically).
        </p>

        {/* Format icons row */}
        <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
            <FileText className="w-3 h-3" /> PDF
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
            <FileText className="w-3 h-3" /> DOCX
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900">
            <Presentation className="w-3 h-3" /> PPTX
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
            <FileSpreadsheet className="w-3 h-3" /> Excel/CSV
          </span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-900">
            <ImageIcon className="w-3 h-3" /> OCR
          </span>
        </div>

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

