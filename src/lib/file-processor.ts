/**
 * File Processor - Extract text from PDF, DOCX, and TXT files
 * Supports up to 20MB file size
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - match the worker version to the API version
// Get the actual version from the library to ensure compatibility
const PDFJS_VERSION = pdfjsLib.version || '5.4.296';

// Try multiple CDN sources for reliability
const workerUrls = [
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`,
  `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`,
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`,
];

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrls[0];

console.log('PDF.js API version:', PDFJS_VERSION);
console.log('PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);

export interface ProcessedFile {
  text: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  processingTime: number;
  pageCount?: number;
  wordCount: number;
}

export class FileProcessor {
  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  /**
   * Process a file and extract text content
   */
  static async processFile(file: File): Promise<ProcessedFile> {
    const startTime = performance.now();

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 20MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // Validate file type
    const fileType = this.getFileType(file);
    if (!fileType) {
      throw new Error(`Unsupported file type. Please upload PDF, DOCX, or TXT files.`);
    }

    let text: string;
    let pageCount: number | undefined;

    try {
      switch (fileType) {
        case 'pdf':
          const pdfResult = await this.extractFromPDF(file);
          text = pdfResult.text;
          pageCount = pdfResult.pageCount;
          break;
        case 'docx':
          text = await this.extractFromDOCX(file);
          break;
        case 'txt':
          text = await this.extractFromTXT(file);
          break;
        default:
          throw new Error('Unsupported file type');
      }

      const processingTime = performance.now() - startTime;
      const wordCount = this.countWords(text);

      return {
        text: text.trim(),
        fileName: file.name,
        fileType,
        fileSize: file.size,
        processingTime,
        pageCount,
        wordCount,
      };
    } catch (error) {
      throw new Error(`Failed to process ${fileType.toUpperCase()} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF file
   */
  private static async extractFromPDF(file: File): Promise<{ text: string; pageCount: number }> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      console.log('Loading PDF with API version:', PDFJS_VERSION);
      
      // Load PDF document with configuration
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useSystemFonts: true,
        standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/standard_fonts/`,
        verbosity: 0, // Suppress warnings
      });
      
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      
      console.log(`Processing PDF with ${pageCount} pages...`);
      
      let fullText = '';

      // Extract text from each page
      for (let i = 1; i <= pageCount; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Simple and robust text extraction
          const pageText = textContent.items
            .map((item: any) => {
              // Extract str property, handle both old and new PDF.js formats
              if ('str' in item) {
                return item.str;
              }
              return '';
            })
            .filter((text: string) => text && text.trim().length > 0)
            .join(' ')
            .trim();
          
          if (pageText.length > 0) {
            fullText += pageText + '\n\n';
            console.log(`Page ${i}: Extracted ${pageText.length} characters`);
          } else {
            console.warn(`Page ${i}: No text extracted (might be an image or empty page)`);
          }
        } catch (pageError) {
          console.error(`Error processing page ${i}:`, pageError);
          // Continue with next page instead of failing
        }
      }

      // Clean up the extracted text
      fullText = fullText
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/\n\s+\n/g, '\n\n')  // Clean up excessive newlines
        .trim();

      if (fullText.length === 0) {
        throw new Error('No text could be extracted from this PDF. The file might be image-based or protected.');
      }

      console.log(`Total extracted text length: ${fullText.length} characters`);
      return { text: fullText, pageCount };
    } catch (error) {
      console.error('PDF extraction error:', error);
      
      // Provide more helpful error messages
      if (error instanceof Error) {
        // Handle version mismatch specifically
        if (error.message.includes('version') && error.message.includes('does not match')) {
          throw new Error('PDF.js version mismatch detected. Please refresh the page and try again.');
        }
        
        if (error.message.includes('No text could be extracted')) {
          throw error;
        }
        
        // Handle worker loading errors
        if (error.message.includes('worker') || error.message.includes('Worker')) {
          throw new Error('Failed to load PDF processor. Please check your internet connection and try again.');
        }
        
        throw new Error(`PDF processing failed: ${error.message}`);
      }
      
      throw new Error('PDF processing failed. Please try a different file or ensure the PDF contains selectable text.');
    }
  }

  /**
   * Extract text from DOCX file
   */
  private static async extractFromDOCX(file: File): Promise<string> {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  /**
   * Extract text from TXT file
   */
  private static async extractFromTXT(file: File): Promise<string> {
    return await file.text();
  }

  /**
   * Determine file type from file extension and MIME type
   */
  private static getFileType(file: File): 'pdf' | 'docx' | 'txt' | null {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();

    if (extension === 'pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    }
    if (
      extension === 'docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return 'docx';
    }
    if (extension === 'txt' || mimeType === 'text/plain') {
      return 'txt';
    }

    return null;
  }

  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Validate if file is supported
   */
  static isSupportedFile(file: File): boolean {
    return this.getFileType(file) !== null;
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }
}
