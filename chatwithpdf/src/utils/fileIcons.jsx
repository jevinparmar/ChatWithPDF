import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  FileCode,
  File,
} from 'lucide-react';

export function getFileFormatMeta(fileNameOrType = '') {
  const ext = (fileNameOrType.includes('.')
    ? fileNameOrType.split('.').pop()
    : fileNameOrType
  ).toLowerCase();

  switch (ext) {
    case 'pdf':
      return {
        label: 'PDF',
        colorClass: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900',
        badgeColor: 'text-red-600 bg-red-50 dark:bg-red-950/50',
        icon: FileText,
      };
    case 'docx':
    case 'doc':
      return {
        label: 'Word',
        colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
        badgeColor: 'text-blue-600 bg-blue-50 dark:bg-blue-950/50',
        icon: FileText,
      };
    case 'pptx':
    case 'ppt':
      return {
        label: 'PowerPoint',
        colorClass: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900',
        badgeColor: 'text-orange-600 bg-orange-50 dark:bg-orange-950/50',
        icon: Presentation,
      };
    case 'xlsx':
    case 'xls':
      return {
        label: 'Excel',
        colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
        badgeColor: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50',
        icon: FileSpreadsheet,
      };
    case 'csv':
      return {
        label: 'CSV',
        colorClass: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900',
        badgeColor: 'text-teal-600 bg-teal-50 dark:bg-teal-950/50',
        icon: FileSpreadsheet,
      };
    case 'md':
      return {
        label: 'Markdown',
        colorClass: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
        badgeColor: 'text-purple-600 bg-purple-50 dark:bg-purple-950/50',
        icon: FileCode,
      };
    case 'txt':
      return {
        label: 'Text',
        colorClass: 'text-slate-500 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
        badgeColor: 'text-slate-600 bg-slate-50 dark:bg-slate-900/50',
        icon: FileText,
      };
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
      return {
        label: 'Image',
        colorClass: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-900',
        badgeColor: 'text-pink-600 bg-pink-50 dark:bg-pink-950/50',
        icon: ImageIcon,
      };
    default:
      return {
        label: ext.toUpperCase() || 'FILE',
        colorClass: 'text-gray-500 bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800',
        badgeColor: 'text-gray-600 bg-gray-50 dark:bg-gray-900/50',
        icon: File,
      };
  }
}

export default function FileIcon({ fileName = '', className = 'w-4 h-4' }) {
  const meta = getFileFormatMeta(fileName);
  const IconComponent = meta.icon;
  return <IconComponent className={className} />;
}
