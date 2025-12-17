/**
 * PDF Utilities
 * Extract text from PDF files using PDF.js
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js - match the installed package version (5.4.449)
// Note: Using legacy build as the modern build may not be available on all CDNs
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.449/build/pdf.worker.min.mjs';

/**
 * Extract text content from a PDF file
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }
    return textParts.join('\n\n');
  } catch (err) {
    console.error('PDF extraction error for', file.name, err);
    throw new Error(`PDF extraction failed for ${file.name}: ${err instanceof Error ? err.message : String(err)}`);
  }
};

/**
 * Check if a file is a supported document type
 */
export const isSupportedFile = (fileName: string): boolean => {
  const ext = fileName.toLowerCase();
  return ext.endsWith('.txt') || ext.endsWith('.md') || ext.endsWith('.pdf');
};

/**
 * Get file extension
 */
export const getFileExtension = (fileName: string): string => {
  return fileName.toLowerCase().split('.').pop() || '';
};

/**
 * Read file content based on file type
 */
export const readFileContent = async (file: File): Promise<string> => {
  const ext = getFileExtension(file.name);
  
  if (ext === 'pdf') {
    return extractTextFromPDF(file);
  } else {
    // For .txt and .md files, just read as text
    return file.text();
  }
};