import { useState, useEffect } from 'react';
import type { PDFDocument } from 'pdf-lib';
import type * as pdfjsLib from 'pdfjs-dist';

interface PDFLibraries {
  PDFDocument: typeof PDFDocument | null;
  pdfjsLib: typeof pdfjsLib | null;
  isLoaded: boolean;
  error: string | null;
}

export const usePDFLibraries = (): PDFLibraries => {
  const [libraries, setLibraries] = useState<PDFLibraries>({
    PDFDocument: null,
    pdfjsLib: null,
    isLoaded: false,
    error: null
  });

  useEffect(() => {
    const loadLibraries = async () => {
      try {
        // Dynamic import for PDF libraries
        const [pdfLib, pdfjsLib] = await Promise.all([
          import('pdf-lib'),
          import('pdfjs-dist')
        ]);

        // Set up PDF.js worker with local file
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

        setLibraries({
          PDFDocument: pdfLib.PDFDocument,
          pdfjsLib,
          isLoaded: true,
          error: null
        });      } catch (loadError) {
        console.error('Failed to load PDF libraries:', loadError);
        setLibraries(prev => ({
          ...prev,
          error: 'Failed to load PDF libraries',
          isLoaded: false
        }));
      }
    };

    loadLibraries();
  }, []);

  return libraries;
};
