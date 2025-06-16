import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';
import UploadCard from './UploadCard';
import { isMemoryPressure, triggerGarbageCollection, getMemoryUsage, formatMemorySize } from '../utils/memoryManagement';

// Set up PDF.js worker with local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Type for window with garbage collection
interface WindowWithGC extends Window {
  gc?: () => void;
}

interface PDFFile {
  file: File;
  id: string;
  name: string;
  size: string;
  pageCount?: number;
  thumbnail?: string;
}

interface PageInfo {
  pageNumber: number;
  thumbnail?: string;
}

const PDFSplitter: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<PDFFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pageRange, setPageRange] = useState('');  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pages, setPages] = useState<PageInfo[]>([]);  // Add preview mode toggle
  const [useRealPreviews, setUseRealPreviews] = useState(false);
  // Add thumbnail generation progress tracking
  const [thumbnailProgress, setThumbnailProgress] = useState({ current: 0, total: 0 });
  const [showReadyStatus, setShowReadyStatus] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Add cancellation control
  const abortControllerRef = useRef<AbortController | null>(null);
  const isProcessingRef = useRef(false);
  // Cleanup function when component unmounts
  useEffect(() => {
    return () => {
      // Cancel any ongoing processing when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const parsePageRange = (range: string): number[] => {
    const pages: number[] = [];
    const parts = range.split(',').map(part => part.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(num => parseInt(num.trim()));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            pages.push(i);
          }
        }
      } else {
        const pageNum = parseInt(part);
        if (!isNaN(pageNum)) {
          pages.push(pageNum);
        }
      }
    }
    
    return [...new Set(pages)].sort((a, b) => a - b);
  };

  const getPageCount = async (file: File): Promise<number> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      return pdf.getPageCount();
    } catch {
      return 0;
    }
  };

  // Simple thumbnail generator for performance mode
  const generateSimpleThumbnail = (pageNumber: number, fileName: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw clean background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 240, 340);
      
      // Draw border
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 238, 338);
      
      // Draw document icon background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(20, 30, 200, 260);
      
      // Draw document fold
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(180, 30);
      ctx.lineTo(220, 70);
      ctx.lineTo(220, 290);
      ctx.lineTo(20, 290);
      ctx.lineTo(20, 30);
      ctx.closePath();
      ctx.fill();
      
      // Draw fold triangle
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(180, 30);
      ctx.lineTo(220, 70);
      ctx.lineTo(180, 70);
      ctx.closePath();
      ctx.fill();
      
      // Draw page lines
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const y = 80 + (i * 25);
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(200, y);
        ctx.stroke();
      }
      
      // Draw page number
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${pageNumber}`, 120, 320);
      
      // Draw file name (truncated)
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Arial';
      const truncatedName = fileName.length > 25 ? fileName.substring(0, 22) + '...' : fileName;
      ctx.fillText(truncatedName, 120, 50);
    }
    
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const generatePageThumbnail = async (file: File, pageNumber: number, signal?: AbortSignal): Promise<string> => {
    try {
      // Check if operation was cancelled
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      // Check memory pressure before starting heavy operations
      const memoryUsage = getMemoryUsage();
      if (memoryUsage.used && memoryUsage.limit && (memoryUsage.used / memoryUsage.limit) > 0.85) {
        console.warn(`Memory pressure detected (${formatMemorySize(memoryUsage.used)}/${formatMemorySize(memoryUsage.limit)}). Delaying thumbnail generation.`);
        // Force garbage collection and wait a bit
        triggerGarbageCollection();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // If still under pressure, use a simplified placeholder
        if (isMemoryPressure()) {
          throw new Error('Memory pressure - using placeholder');
        }
      }

      console.log(`Generating thumbnail for page ${pageNumber}`);
      const arrayBuffer = await file.arrayBuffer();
      
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0, // Reduce console noise
        disableStream: true, // Force complete loading for better memory management
        disableAutoFetch: true, // Prevent prefetching other pages
        disableFontFace: true, // Reduce font loading overhead
        cMapPacked: true, // Use packed CMaps for better performance
        useSystemFonts: true // Use system fonts when available
      });
      const pdf = await loadingTask.promise;
      
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }

      const page = await pdf.getPage(pageNumber);
      
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
        // Use larger thumbnails for better visual appeal, smaller under memory pressure
      const isUnderPressure = isMemoryPressure();
      const targetWidth = isUnderPressure ? 180 : 240;
      const targetHeight = isUnderPressure ? 250 : 340;
      const scale = Math.min(targetWidth / viewport.width, targetHeight / viewport.height);
      const scaledViewport = page.getViewport({ scale });
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      // Fill canvas with white background first
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
        // Use lower quality under memory pressure
        renderInteractiveForms: false,
        intent: 'print' // Use print intent for better performance
      };
        // Render the actual PDF page content
      const renderTask = page.render(renderContext);
      await renderTask.promise;
      
      // Final check before returning
      if (signal?.aborted) {
        throw new Error('Operation cancelled');
      }
      
      // Clean up PDF document to free memory
      pdf.destroy();
        console.log(`Successfully generated thumbnail for page ${pageNumber}`);
      // Use lower quality for thumbnails under memory pressure
      const quality = isUnderPressure ? 0.6 : 0.8;
      return canvas.toDataURL('image/jpeg', quality); // Use JPEG for better compression
    } catch (thumbnailError: unknown) {
      // Don't log errors for cancelled operations
      if (thumbnailError instanceof Error && thumbnailError.message === 'Operation cancelled') {
        throw thumbnailError;
      }
      console.error(`Error generating page thumbnail for page ${pageNumber}:`, thumbnailError);
      
      // Only return placeholder if PDF rendering completely fails
      return new Promise((resolve) => {        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 340;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {          // Draw page background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 240, 340);
          
          // Draw border
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(1, 1, 238, 338);
          
          // Draw page number
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 18px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Page ${pageNumber}`, 120, 160);
          ctx.font = '14px Arial';
          ctx.fillText('Preview unavailable', 120, 190);
        }
        
        resolve(canvas.toDataURL());
      });
    }
  };  const generatePages = async (file: File, pageCount: number) => {
    console.log(`Starting to generate thumbnails for ${pageCount} pages (mode: ${useRealPreviews ? 'real previews' : 'simple thumbnails'})`);
    
    // Check if file is too large and show warning (only for real previews)
    const fileSize = file.size;
    const fileSizeMB = fileSize / (1024 * 1024);
    const isLargeFile = fileSizeMB > 50; // 50MB threshold
    const isVeryLargeFile = fileSizeMB > 100; // 100MB threshold
    
    if (useRealPreviews && isVeryLargeFile && pageCount > 50) {
      const proceed = confirm(
        `⚠️ Large File Warning\n\n` +
        `File size: ${formatFileSize(fileSize)}\n` +
        `Pages: ${pageCount}\n\n` +
        `Real preview mode may cause performance issues or freeze your browser. ` +
        `Consider switching to simple thumbnails or using a smaller file.\n\n` +
        `Continue anyway?`
      );
      if (!proceed) {
        return;
      }
    }
    
    // Create new abort controller for this operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    isProcessingRef.current = true;
      try {
      const pageList: PageInfo[] = [];
      // Reduce thumbnail count for large files to prevent memory issues (only for real previews)
      const maxThumbnails = useRealPreviews && isLargeFile ? Math.min(50, pageCount) : Math.min(100, pageCount);
      const thumbnailCount = Math.min(pageCount, maxThumbnails);
      console.log(`Generating thumbnails for first ${thumbnailCount} pages${pageCount > maxThumbnails ? ` (pages ${maxThumbnails + 1}-${pageCount} will be shown as one summary card)` : ''}`);
        // Add pages 1-50/100 (or less if PDF has fewer pages)
      for (let i = 1; i <= thumbnailCount; i++) {
        pageList.push({
          pageNumber: i,
          thumbnail: undefined
        });
      }
      
      // If there are more than maxThumbnails pages, add ONE summary card for the rest
      if (pageCount > maxThumbnails) {
        pageList.push({
          pageNumber: -1, // Special marker for summary card
          thumbnail: 'SUMMARY_CARD' // Special marker
        });
      }
        // Set initial state with pages
      setPages([...pageList]);
      
      // Initialize progress tracking
      setThumbnailProgress({ current: 0, total: thumbnailCount });
        // For simple thumbnails, generate them immediately without heavy processing
      if (!useRealPreviews) {
        console.log('Generating simple thumbnails...');
        // No need to show progress for instant generation
        setThumbnailProgress({ current: 0, total: 0 });
        
        for (let i = 0; i < thumbnailCount; i++) {
          const pageNumber = i + 1;
          const simpleThumbnail = generateSimpleThumbnail(pageNumber, file.name);
          pageList[i] = {
            pageNumber,
            thumbnail: simpleThumbnail
          };
        }
        setPages([...pageList]);
        console.log(`Generated ${thumbnailCount} simple thumbnails instantly`);
        return;
      }
      
      // Generate real PDF previews with adaptive batch size based on file size and memory
      const baseBatchSize = isLargeFile ? 2 : 3;
      const batchSize = isMemoryPressure() ? 1 : baseBatchSize;
      
      for (let i = 0; i < thumbnailCount; i += batchSize) {
        // Check if operation was cancelled before processing each batch
        if (signal.aborted) {
          console.log('Thumbnail generation cancelled');
          return;
        }
        
        // Check memory pressure and delay if needed
        if (isMemoryPressure()) {
          console.warn('Memory pressure detected, cleaning up before next batch');
          triggerGarbageCollection();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, thumbnailCount); j++) {
          const pageNumber = j + 1;
          batch.push(
            generatePageThumbnail(file, pageNumber, signal).then(thumbnail => ({
              pageNumber,
              thumbnail            })).catch((thumbnailError: unknown) => {
              if (thumbnailError instanceof Error && thumbnailError.message === 'Operation cancelled') {
                throw thumbnailError; // Re-throw cancellation errors
              }
              console.error(`Failed to generate thumbnail for page ${pageNumber}:`, thumbnailError);
              return {
                pageNumber,
                thumbnail: undefined
              };
            })
          );
        }
        
        try {
          const batchResults = await Promise.all(batch);
          
          // Check again after batch completion
          if (signal.aborted) {
            console.log('Thumbnail generation cancelled after batch completion');
            return;
          }
            // Update thumbnails in the existing pageList
          batchResults.forEach(result => {
            const index = pageList.findIndex(p => p.pageNumber === result.pageNumber);
            if (index !== -1) {
              pageList[index] = result;
            }
          });
          
          // Update progress tracking
          const completedCount = Math.min(i + batchSize, thumbnailCount);
          setThumbnailProgress({ current: completedCount, total: thumbnailCount });
          
          // Update pages incrementally so user sees progress
          setPages([...pageList]);
        } catch (batchError: unknown) {
          if (batchError instanceof Error && batchError.message === 'Operation cancelled') {
            console.log('Thumbnail generation cancelled during batch processing');
            return;
          }
          // Continue with next batch if individual thumbnails fail
        }
        
        // Increase delay between batches for large files and under memory pressure
        const delay = isLargeFile ? (isMemoryPressure() ? 200 : 100) : 50;
        await new Promise(resolve => setTimeout(resolve, delay));      }
        console.log(`Completed generating ${thumbnailCount} page thumbnails out of ${pageCount} total pages`);
        
        // Show ready status for real previews and auto-hide after 3 seconds
        if (useRealPreviews) {
          setShowReadyStatus(true);
          setTimeout(() => {
            setShowReadyStatus(false);
          }, 3000);
        }
    } catch (processError: unknown) {
      if (processError instanceof Error && processError.message !== 'Operation cancelled') {
        console.error('Error during thumbnail generation:', processError);
      }
    } finally {
      isProcessingRef.current = false;
    }
  };  const processFile = async (file: File) => {
    // Check file size limit (100MB)
    const maxFileSize = 100 * 1024 * 1024; // 100MB in bytes
    if (file.size > maxFileSize) {
      toast.error(`File size (${formatFileSize(file.size)}) exceeds the 100MB limit. Please use a smaller PDF file.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Cancel any existing processing before starting new upload
    if (abortControllerRef.current && isProcessingRef.current) {
      abortControllerRef.current.abort();
      isProcessingRef.current = false;
    }

    setIsLoading(true);

    if (file.type === 'application/pdf') {
      const pageCount = await getPageCount(file);
      const newPdfFile: PDFFile = {
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: formatFileSize(file.size),
        pageCount
      };
      setPdfFile(newPdfFile);
      
      // Automatically load pages for the uploaded file
      if (pageCount > 0) {
        toast.success(`PDF loaded successfully! ${pageCount} pages found.`);
        await generatePages(file, pageCount);
      } else {
        toast.error('Could not read PDF pages. Please check if the file is valid.');
      }
    } else {
      toast.error(`"${file.name}" is not a PDF. Only PDF files are allowed.`);
    }

    setIsLoading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await processFile(files[0]); // Only process the first file
  };  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]); // Only process the first file
    }
  };  const removeFile = () => {
    // Cancel any ongoing processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setPdfFile(null);
    setPageRange('');
    setSelectedPages([]);
    setPages([]);
    isProcessingRef.current = false;
    toast.success('File removed successfully');
  };const handlePageClick = (pageNumber: number) => {
    // Normal page selection (summary card is not clickable)
    setSelectedPages(prev => {
      const newSelected = prev.includes(pageNumber)
        ? prev.filter(p => p !== pageNumber)
        : [...prev, pageNumber].sort((a, b) => a - b);
      
      // Update page range text
      updatePageRangeFromSelection(newSelected);
      return newSelected;
    });
  };  // Handle preview mode toggle
  const handlePreviewModeToggle = async () => {
    // Cancel any ongoing thumbnail generation first
    if (abortControllerRef.current && isProcessingRef.current) {
      console.log('Canceling ongoing thumbnail generation due to mode toggle');
      abortControllerRef.current.abort();
      isProcessingRef.current = false;
      
      // Wait a bit for the cancellation to take effect
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const newMode = !useRealPreviews;
    setUseRealPreviews(newMode);
  };
  // Effect to regenerate thumbnails when preview mode changes
  useEffect(() => {
    // Only regenerate if we have a PDF loaded and this isn't the initial render
    if (pdfFile && pdfFile.pageCount && pages.length > 0) {
      const regenerateThumbnails = async () => {
        const loadingToast = toast.loading(
          useRealPreviews ? 'Generating real previews...' : 'Switching to simple thumbnails...'
        );
        
        try {
          await generatePages(pdfFile.file, pdfFile.pageCount!);
          toast.success(
            useRealPreviews ? 'Real previews generated!' : 'Switched to simple thumbnails',
            { id: loadingToast }
          );
        } catch (error) {
          toast.error('Failed to regenerate thumbnails', { id: loadingToast });
        }
      };
      
      regenerateThumbnails();
    }
  }, [useRealPreviews]); // Only depend on useRealPreviews change

  const updatePageRangeFromSelection = (pages: number[]) => {
    if (pages.length === 0) {
      setPageRange('');
      return;
    }

    const ranges: string[] = [];
    let start = pages[0];
    let end = pages[0];

    for (let i = 1; i < pages.length; i++) {
      if (pages[i] === end + 1) {
        end = pages[i];
      } else {
        if (start === end) {
          ranges.push(start.toString());
        } else {
          ranges.push(`${start}-${end}`);
        }
        start = pages[i];
        end = pages[i];
      }
    }

    if (start === end) {
      ranges.push(start.toString());
    } else {
      ranges.push(`${start}-${end}`);
    }

    setPageRange(ranges.join(', '));
  };
  const handlePageRangeChange = (range: string) => {
    setPageRange(range);
    const parsedPages = parsePageRange(range);
    const validPages = parsedPages.filter(p => p >= 1 && p <= (pdfFile?.pageCount || 0));
    setSelectedPages(validPages);
  };  const splitPDF = async (range: string) => {
    if (!pdfFile) {
      toast.error('No file selected.');
      return;
    }

    const pagesToExtract = parsePageRange(range);
    if (pagesToExtract.length === 0) {
      toast.error('Please specify valid page numbers.');
      return;
    }

    const maxPages = pdfFile.pageCount || 0;
    const invalidPages = pagesToExtract.filter(page => page < 1 || page > maxPages);
    if (invalidPages.length > 0) {
      toast.error(`Invalid page numbers: ${invalidPages.join(', ')}. This PDF has ${maxPages} pages.`);
      return;
    }// Check if we're dealing with a large extraction
    const isLargeExtraction = pagesToExtract.length > 500;
    const isLargeFile = pdfFile.file.size > 75 * 1024 * 1024; // 75MB (warn for files close to limit)

    if (isLargeExtraction && isLargeFile) {
      const confirmed = window.confirm(
        `You're extracting ${pagesToExtract.length} pages from a ${formatFileSize(pdfFile.file.size)} file. This may take several minutes and use significant memory. Continue?`
      );
      if (!confirmed) return;
    }    setIsLoading(true);

    // Show loading toast
    const loadingToast = toast.loading('Processing PDF split...');

    let arrayBuffer: ArrayBuffer | null = null;
    
    try {
      console.log(`Starting PDF split: ${pagesToExtract.length} pages from ${formatFileSize(pdfFile.file.size)} file`);
      
      // Try to read the file with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.log(`Reading file attempt ${retryCount + 1}/${maxRetries}`);
          arrayBuffer = await pdfFile.file.arrayBuffer();
          console.log('File loaded into memory successfully');
          break;        } catch (readError: unknown) {
          retryCount++;
          console.warn(`File read attempt ${retryCount} failed:`, readError);
            if (retryCount >= maxRetries) {
            throw new Error('Failed to read file after multiple attempts. The file may be too large or corrupted.');
          }
          
          // Update loading toast with retry info
          toast.loading(`Reading file... (attempt ${retryCount + 1}/${maxRetries})`, { id: loadingToast });
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }      if (!arrayBuffer) {
        throw new Error('Failed to load file into memory');
      }
      
      toast.loading('Parsing PDF...', { id: loadingToast });
      const originalPdf = await PDFDocument.load(arrayBuffer);
      console.log('PDF parsed successfully');
      
      const newPdf = await PDFDocument.create();
      console.log('New PDF document created');

      // Extract specified pages (convert to 0-based index)
      const pageIndices = pagesToExtract.map(page => page - 1);
      
      // For large extractions, process pages in smaller batches to avoid memory issues
      if (isLargeExtraction || isLargeFile) {
        const batchSize = isLargeFile && isLargeExtraction ? 50 : 100; // Smaller batches for very large files
        console.log(`Processing ${pageIndices.length} pages in batches of ${batchSize}`);
        
        for (let i = 0; i < pageIndices.length; i += batchSize) {
          const batchIndices = pageIndices.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(pageIndices.length / batchSize);
            console.log(`Processing batch ${batchNum}/${totalBatches}: pages ${batchIndices[0] + 1}-${batchIndices[batchIndices.length - 1] + 1}`);
          
          // Update loading toast with progress
          toast.loading(`Processing pages... (${batchNum}/${totalBatches})`, { id: loadingToast });
          
          try {
            const copiedPages = await newPdf.copyPages(originalPdf, batchIndices);
            copiedPages.forEach((page) => newPdf.addPage(page));              // Force garbage collection hint and longer delay for large files
            if (isLargeFile) {
              const windowWithGC = window as WindowWithGC;
              if (windowWithGC.gc) {
                windowWithGC.gc();
              }
            }
            
            // Longer delay between batches for large files to prevent memory pressure
            if (i + batchSize < pageIndices.length) {
              await new Promise(resolve => setTimeout(resolve, isLargeFile ? 100 : 10));
            }          } catch (batchError: unknown) {
            console.error(`Error in batch ${batchNum}:`, batchError);
            const errorMessage = batchError instanceof Error ? batchError.message : 'Unknown error';
            throw new Error(`Failed to process pages ${batchIndices[0] + 1}-${batchIndices[batchIndices.length - 1] + 1}. ${errorMessage}`);
          }
        }      } else {
        // For smaller extractions, process all at once
        console.log('Processing all pages at once');
        toast.loading('Copying pages...', { id: loadingToast });
        const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
        copiedPages.forEach((page) => newPdf.addPage(page));
      }

      console.log('Pages copied successfully, saving PDF...');
      toast.loading('Saving PDF...', { id: loadingToast });
      
      // For large files, use different save options
      const saveOptions = isLargeFile ? { 
        useObjectStreams: false, // Reduces memory usage but increases file size slightly
        addDefaultPage: false 
      } : {};
      
      const pdfBytes = await newPdf.save(saveOptions);
      console.log(`PDF saved successfully: ${formatFileSize(pdfBytes.length)}`);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdfFile.name.replace('.pdf', '')}-pages-${range.replace(/\s/g, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
        // Clear the array buffer to free memory
      arrayBuffer = null;
      
      console.log('PDF split completed successfully');
        // Success toast
      toast.success(`Successfully extracted ${pagesToExtract.length} pages! File downloaded.`, { id: loadingToast });
      
    } catch (splitError: unknown) {
      console.error('Error splitting PDF:', splitError);
        // Provide more specific error messages
      let errorMessage = 'Failed to split PDF. ';
      const errorMsg = splitError instanceof Error ? splitError.message : '';
      
      if (errorMsg.includes('NotReadableError') || errorMsg.includes('not be read') || errorMsg.includes('permission')) {
        errorMessage += 'The file could not be read. This may happen with very large files. Try refreshing the page and uploading the file again, or try extracting fewer pages.';
      } else if (errorMsg.includes('Invalid PDF')) {
        errorMessage += 'The file appears to be corrupted or not a valid PDF.';
      } else if (errorMsg.includes('memory') || errorMsg.includes('Memory')) {
        errorMessage += 'Not enough memory to process this large file. Try selecting fewer pages (less than 200) or restart your browser.';
      } else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
        errorMessage += 'The operation timed out. This file might be too large or complex to process.';
      } else if (isLargeExtraction && isLargeFile) {
        errorMessage += 'The file is too large for this operation. Try extracting fewer pages (less than 200) or break the extraction into smaller chunks.';
      } else if (errorMsg.includes('Failed to read file')) {
        errorMessage += 'Could not read the file after multiple attempts. Try refreshing the page and uploading the file again.';      } else {
        errorMessage += errorMsg || 'Please ensure the file is a valid PDF document and try again.';
      }
      
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsLoading(false);
      // Clear memory references
      arrayBuffer = null;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl shadow-green-500/10 border border-gray-200/50 backdrop-blur-sm">
      {/* Main Content - Full Width Horizontal Layout */}
      <div className="flex flex-col xl:flex-row min-h-[600px]">
        {/* Left Side - Upload Area & Controls */}
        <div className="w-full xl:w-96 flex-shrink-0 border-b xl:border-b-0 xl:border-r border-gray-200/50 bg-gradient-to-br from-green-50/50 to-teal-50/50">
          <div className="p-6 sm:p-8 space-y-6">            {/* Upload Section with Current File Preview */}
            {!pdfFile ? (              <UploadCard
                isLoading={isLoading}
                isDragOver={isDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onFileChange={handleFileUpload}
                multiple={false}
                title="Split PDF Pages"
                subtitle="Extract specific pages from your PDF"
                loadingText="Processing PDF..."
                loadingSubtext="Please wait while we analyze your file"
                supportedFormats="Single PDF file"
                theme="green"
              />
            ) : (              <div className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6">
                <div className="space-y-4">
                  {/* File info section */}
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 truncate" title={pdfFile.name}>
                        {pdfFile.name}
                      </h3>                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-sm text-gray-500">{pdfFile.size}</span>
                        <span className="text-sm text-green-600 font-medium">
                          {pdfFile.pageCount || 0} pages
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action buttons section */}
                  <div className="flex space-x-3 mt-4">
                    <label
                      htmlFor="pdf-upload"
                      className="w-10 h-10 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 shadow-md"
                      title="Change File"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </label>
                    <button
                      onClick={removeFile}
                      className="w-10 h-10 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 hover:border-red-400 transition-all duration-200 flex items-center justify-center hover:scale-105 shadow-md"
                      title="Remove File"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  id="pdf-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"                />
              </div>
            )}
            
            {/* Split Controls */}
            {pdfFile && (<div className="border-2 border-green-200 rounded-2xl p-6 bg-gradient-to-br from-green-50 to-teal-50">
                <h4 className="font-bold text-green-800 mb-4 flex items-center text-lg">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Split Pages
                </h4>

                {/* Page Range Input */}                <div className="mb-6">
                  <label htmlFor="page-range" className="block text-sm font-semibold text-gray-700 mb-3">
                    Page Range
                  </label>
                  <input
                    id="page-range"
                    type="text"
                    value={pageRange}
                    onChange={(e) => handlePageRangeChange(e.target.value)}
                    placeholder="e.g., 1-3, 5, 7-10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  />
                  <div className="mt-3 space-y-2">
                    {selectedPages.length > 0 && (
                      <div>
                        <p className="text-sm text-green-600 font-medium">
                          {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
                        </p>                        {/* Warning for large extractions */}
                        {selectedPages.length > 200 && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start">
                              <svg className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              <span className="text-xs text-yellow-800">
                                <strong>Large extraction:</strong> Extracting {selectedPages.length} pages may take several minutes and use significant memory.
                              </span>
                            </div>                          </div>
                        )}
                        
                        {/* Warning for large files */}
                        {pdfFile && pdfFile.file.size > 75 * 1024 * 1024 && selectedPages.length > 50 && (
                          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-start">
                              <svg className="w-4 h-4 text-orange-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-xs text-orange-800">
                                <strong>Large file + many pages:</strong> This combination may cause memory issues. Consider extracting fewer pages (under 200) at a time.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 space-y-1">
                      <p><strong>How to use:</strong></p>
                      <p>• Single pages: <span className="font-mono bg-gray-100 px-1 rounded">1, 5, 10</span></p>
                      <p>• Page ranges: <span className="font-mono bg-gray-100 px-1 rounded">1-5, 10-15</span></p>
                      <p>• Mixed: <span className="font-mono bg-gray-100 px-1 rounded">1-3, 7, 10-12</span></p>
                      <p>• Or simply click pages above to select them</p>
                    </div>
                  </div>
                </div>

                {/* Split Button */}
                <button
                  onClick={() => splitPDF(pageRange)}
                  disabled={isLoading || !pageRange.trim() || selectedPages.length === 0}
                  className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
                    isLoading || !pageRange.trim() || selectedPages.length === 0
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transform hover:scale-105 shadow-xl'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Splitting...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Extract {selectedPages.length} Page{selectedPages.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>        {/* Right Side - Pages Grid - Full Width */}
        <div className="flex-1 p-6 sm:p-8 bg-gray-50/30">
          {pdfFile && pages.length > 0 ? (
            <div className="h-full">              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Select Pages ({pdfFile?.pageCount || 0} total pages)
                    </h3>
                    <p className="text-gray-600">
                      Click pages to select them for extraction
                      {selectedPages.length > 0 && (
                        <span className="text-green-600 ml-2">• {selectedPages.length} selected</span>
                      )}
                    </p>
                  </div>                  {/* Preview Mode Toggle - Beautiful Switch Design */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">Preview Quality:</span>
                        {/* Beautiful Toggle Switch - Simplified */}
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={useRealPreviews}
                          onChange={handlePreviewModeToggle}
                          disabled={isLoading}
                          className="sr-only peer"
                        />                        <div className={`
                          peer ring-0 bg-gradient-to-bl from-neutral-800 via-neutral-700 to-neutral-600 
                          rounded-full outline-none duration-300 after:duration-200 w-12 h-6 shadow-md 
                          peer-focus:outline-none after:content-[''] after:rounded-full after:absolute 
                          after:h-4 after:w-4 after:top-1 after:left-1 
                          peer-checked:after:translate-x-6 peer-hover:after:scale-95 
                          peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-green-800
                          after:bg-gradient-to-br after:from-gray-100 after:via-white after:to-gray-200
                          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        title={
                          isLoading 
                            ? 'Please wait for current operation to complete'
                            : useRealPreviews 
                              ? 'Switch to Fast Mode: Simple icons for quick loading'
                              : 'Switch to Quality Mode: Real page previews with full detail'
                        }
                        />
                      </label>
                      
                      {/* Current Mode Text */}
                      <span className="text-xs font-medium text-gray-600 min-w-0">
                        {useRealPreviews ? 'High Quality' : 'Fast Mode'}
                      </span>
                    </div>
                    
                    {/* Progress/Status Indicator */}
                    <div className="flex items-center gap-3">
                      {useRealPreviews && thumbnailProgress.total > 0 && thumbnailProgress.current < thumbnailProgress.total && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-600 font-medium">
                            {Math.round((thumbnailProgress.current / thumbnailProgress.total) * 100)}%
                          </span>
                        </div>
                      )}
                      
                      {/* Ready Status */}
                      {useRealPreviews && showReadyStatus && (
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600 font-medium">
                            ✓ Ready
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {selectedPages.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedPages([]);
                      setPageRange('');
                    }}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Selection
                  </button>
                )}
              </div>              {/* Pages Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
                {pages.map((page) => (
                  <div 
                    key={page.pageNumber === -1 ? 'summary' : page.pageNumber}
                    onClick={() => page.pageNumber !== -1 && handlePageClick(page.pageNumber)}
                    className={`group relative rounded-2xl transition-all duration-200 ${
                      page.pageNumber === -1 
                        ? 'cursor-default'
                        : `cursor-pointer hover:shadow-xl ${
                            selectedPages.includes(page.pageNumber)
                            ? 'ring-4 ring-green-400 ring-opacity-75 shadow-xl'
                            : 'hover:shadow-lg'
                          }`
                    }`}
                  >
                    {/* Selection Checkbox */}
                    {page.pageNumber !== -1 && (
                      <div className="absolute -top-2 -right-2 z-20">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                          selectedPages.includes(page.pageNumber)
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-white border-gray-300 hover:border-green-400'
                        }`}>
                          {selectedPages.includes(page.pageNumber) && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Page content */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                      {page.pageNumber === -1 ? (
                        // Summary card for remaining pages
                        <div className="aspect-[3/4] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-gray-700 mb-1">
                              +{(pdfFile?.pageCount || 0) - 100} more
                            </div>
                            <div className="text-xs text-gray-500">
                              Pages 101-{pdfFile?.pageCount || 0}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              Use page numbers to select
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] relative">
                          {page.thumbnail ? (
                            page.thumbnail === 'SUMMARY_CARD' ? null : (
                              <img 
                                src={page.thumbnail} 
                                alt={`Page ${page.pageNumber}`}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  console.error(`Error loading thumbnail for page ${page.pageNumber}`);
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                            </div>
                          )}

                          {/* Page number overlay */}
                          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                            {page.pageNumber}
                          </div>

                          {/* Split overlay when selected */}
                          {selectedPages.includes(page.pageNumber) && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                Will Split
                              </div>
                            </div>
                          )}                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : pdfFile && pages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center py-20">
              <div className="max-w-lg mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4">
                  Loading Pages...
                </h4>
                <p className="text-gray-600 text-lg">
                  Please wait while we prepare the page preview
                </p>
              </div>
            </div>          ) : (            <div className="flex items-center justify-center h-[450px] text-center py-8">
              <div className="max-w-lg mx-auto h-full flex flex-col justify-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  {!pdfFile ? 'Ready to split your PDF' : 'Upload a PDF file'}
                </h4>
                <p className="text-gray-600 mb-6 text-base leading-relaxed">
                  {!pdfFile 
                    ? 'Upload a PDF file using the upload area to view its pages and extract specific sections.'
                    : 'Your file is being processed. Pages will appear here once ready.'
                  }
                </p>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 text-left border border-green-200">
                  <h5 className="font-bold text-gray-800 mb-3 flex items-center text-base">
                    <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    How to split PDFs:
                  </h5>
                  <div className="space-y-2 text-xs text-gray-700">
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                      <span>Upload a PDF file by clicking "Choose File" or dragging it into the upload area</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                      <span>Pages will automatically appear as thumbnails once the file is processed</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                      <span>Select pages by clicking them or enter page ranges (e.g., 1-3, 5, 7-10)</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                      <span>Click "Extract Pages" to download the selected pages as a new PDF</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFSplitter;
