import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';
import UploadCard from './UploadCard';
import { isMemoryPressure, triggerGarbageCollection, getMemoryUsage, formatMemorySize } from '../utils/memoryManagement';

// Set up PDF.js worker with local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

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

const PDFRemover: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<PDFFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pageRange, setPageRange] = useState('');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
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
      
      // Draw page number with "DELETE" indicator for remover
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('DELETE', 120, 320);
      
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`${pageNumber}`, 120, 290);
      
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
        verbosity: 0,
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
      
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
        const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
        // Use lower quality under memory pressure
        renderInteractiveForms: false,
        intent: 'print' // Use print intent for better performance
      };
      
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
        throw thumbnailError;      }
      
      console.error(`Error generating page thumbnail for page ${pageNumber}:`, thumbnailError);
      
      return new Promise((resolve) => {        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 340;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 240, 340);
          
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(1, 1, 238, 338);
          
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
      
      for (let i = 1; i <= thumbnailCount; i++) {
        pageList.push({
          pageNumber: i,
          thumbnail: undefined
        });
      }
      
      if (pageCount > maxThumbnails) {
        pageList.push({
          pageNumber: -1,
          thumbnail: 'SUMMARY_CARD'
        });
      }
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
              thumbnail
            })).catch(error => {
              if (error.message === 'Operation cancelled') {
                throw error; // Re-throw cancellation errors
              }
              console.error(`Failed to generate thumbnail for page ${pageNumber}:`, error);
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
            batchResults.forEach(result => {
            if (result && result.thumbnail) {
              setPages(prevPages => 
                prevPages.map(page => 
                  page.pageNumber === result.pageNumber 
                    ? { ...page, thumbnail: result.thumbnail }
                    : page
                )
              );
            }
          });
          
          // Update progress tracking
          const completedCount = Math.min(i + batchSize, thumbnailCount);
          setThumbnailProgress({ current: completedCount, total: thumbnailCount });
        } catch (batchError: unknown) {
          if (batchError instanceof Error && batchError.message === 'Operation cancelled') {
            console.log('Thumbnail generation cancelled during batch processing');
            return;
          }
          // Continue with next batch if individual thumbnails fail
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));      }
        console.log('Thumbnail generation completed successfully');
        
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
  };
  const processFile = async (file: File) => {
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 100MB.');
      return;
    }

    // Cancel any existing processing before starting new upload
    if (abortControllerRef.current && isProcessingRef.current) {
      abortControllerRef.current.abort();
      isProcessingRef.current = false;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Loading PDF...');

    try {
      const pageCount = await getPageCount(file);
      if (pageCount === 0) {
        throw new Error('Invalid PDF file or unable to read pages');
      }

      const newFile: PDFFile = {
        file,
        id: Date.now().toString(),
        name: file.name,
        size: formatFileSize(file.size),
        pageCount
      };

      setPdfFile(newFile);
      setSelectedPages([]);
      setPageRange('');
      setPages([]);

      await generatePages(file, pageCount);      
      toast.success(`PDF loaded successfully! ${pageCount} pages found.`, { id: loadingToast });
    } catch (loadError: unknown) {
      console.error('Error loading PDF:', loadError);
      const errorMessage = loadError instanceof Error ? loadError.message : 'Failed to load PDF file';
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        await processFile(file);
      } else {
        toast.error('Please upload a PDF file');
      }
    }
  };
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };
  const removeFile = () => {
    // Cancel any ongoing processing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setPdfFile(null);
    setSelectedPages([]);
    setPageRange('');
    setPages([]);
    isProcessingRef.current = false;
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePageClick = (pageNumber: number) => {
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

  const handlePageRangeChange = (value: string) => {
    setPageRange(value);
    const pages = parsePageRange(value);
    const maxPages = pdfFile?.pageCount || 0;
    const validPages = pages.filter(p => p >= 1 && p <= maxPages);
    setSelectedPages(validPages);
  };

  const removePagesFromPDF = async (pagesToRemove: string) => {
    if (!pdfFile) return;

    const pagesToRemoveArray = parsePageRange(pagesToRemove);
    const maxPages = pdfFile.pageCount || 0;

    if (pagesToRemoveArray.length === 0) {
      toast.error('Please specify pages to remove');
      return;
    }

    const invalidPages = pagesToRemoveArray.filter(p => p < 1 || p > maxPages);
    if (invalidPages.length > 0) {
      toast.error(`Invalid page numbers: ${invalidPages.join(', ')}. This PDF has ${maxPages} pages.`);
      return;
    }

    if (pagesToRemoveArray.length >= maxPages) {
      toast.error('Cannot remove all pages from PDF. At least one page must remain.');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Removing pages from PDF...');

    try {
      const arrayBuffer = await pdfFile.file.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      
      const newPdf = await PDFDocument.create();
      const totalPages = originalPdf.getPageCount();
      
      const pagesToKeep: number[] = [];
      for (let i = 1; i <= totalPages; i++) {
        if (!pagesToRemoveArray.includes(i)) {
          pagesToKeep.push(i);
        }
      }

      if (pagesToKeep.length === 0) {
        throw new Error('Cannot remove all pages from PDF');
      }

      const copiedPages = await newPdf.copyPages(originalPdf, pagesToKeep.map(p => p - 1));
      copiedPages.forEach(page => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = pdfFile.name.replace('.pdf', '');
      link.download = `${fileName}_pages_removed.pdf`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(
        `Successfully removed ${pagesToRemoveArray.length} page${pagesToRemoveArray.length !== 1 ? 's' : ''} from PDF! ` +
        `${pagesToKeep.length} page${pagesToKeep.length !== 1 ? 's' : ''} remaining.`, 
        { id: loadingToast }      );
      
    } catch (removeError: unknown) {
      console.error('Error removing pages from PDF:', removeError);
      const errorMessage = removeError instanceof Error ? removeError.message : 'Failed to remove pages from PDF';
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl shadow-red-500/10 border border-gray-200/50 backdrop-blur-sm">
      {/* Main Content - Full Width Horizontal Layout */}
      <div className="flex flex-col xl:flex-row min-h-[600px]">
        {/* Left Side - Upload Area & Controls */}
        <div className="w-full xl:w-96 flex-shrink-0 border-b xl:border-b-0 xl:border-r border-gray-200/50 bg-gradient-to-br from-red-50/50 to-pink-50/50">
          <div className="p-6 sm:p-8 space-y-6">            {/* Upload Section */}
            {!pdfFile ? (              <UploadCard
                isLoading={isLoading}
                isDragOver={isDragOver}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onFileChange={handleFileUpload}
                multiple={false}
                title="Remove PDF Pages"
                subtitle="Delete unwanted pages from your PDF"
                loadingText="Processing PDF..."
                loadingSubtext="Please wait while we analyze your file"
                supportedFormats="Single PDF file"
                theme="red"              />
            ) : (
              <div className="border-2 border-red-400 bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6">
                <div className="space-y-4">
                  {/* File info section */}
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 truncate" title={pdfFile.name}>
                        {pdfFile.name}
                      </h3>                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-sm text-gray-500">{pdfFile.size}</span>
                        <span className="text-sm text-red-600 font-medium">
                          {pdfFile.pageCount || 0} pages
                        </span>
                      </div>
                    </div>                  </div>
                  
                  {/* Action buttons section */}
                  <div className="flex space-x-3">
                    <label
                      htmlFor="pdf-upload"
                      className="w-10 h-10 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-105 shadow-md"
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
                  className="hidden"
                />
              </div>
            )}

            {/* Page Selection Controls */}
            {pdfFile && (
              <div className="space-y-4">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Pages to Remove
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter page numbers to remove:
                      </label>
                      <input
                        type="text"
                        value={pageRange}
                        onChange={(e) => handlePageRangeChange(e.target.value)}
                        placeholder="e.g., 1, 3-5, 8"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                      {pageRange && selectedPages.length > 0 && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center text-red-700">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-sm font-medium">
                              Will remove {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-sm text-red-600 mt-1">
                            Pages: {selectedPages.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>• Enter individual pages: 1, 5, 10</div>
                      <div>• Enter page ranges: 1-5, 8-12</div>
                      <div>• Combine both: 1, 3-5, 8, 10-15</div>
                      <div>• Click pages in the preview to select them</div>
                      <div className="text-orange-600 font-medium">⚠️ At least one page must remain in the PDF</div>
                    </div>
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removePagesFromPDF(pageRange)}
                  disabled={isLoading || !pageRange.trim() || selectedPages.length === 0 || selectedPages.length >= (pdfFile.pageCount || 0)}
                  className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
                    isLoading || !pageRange.trim() || selectedPages.length === 0 || selectedPages.length >= (pdfFile.pageCount || 0)
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 transform hover:scale-105 shadow-xl'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Removing Pages...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Remove {selectedPages.length} Page{selectedPages.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Pages Grid */}
        <div className="flex-1 p-6 sm:p-8 bg-gray-50/30">
          {pdfFile && pages.length > 0 ? (
            <div className="h-full">              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Select Pages to Remove ({pdfFile?.pageCount || 0} total pages)
                    </h3>
                    {selectedPages.length > 0 && (
                      <p className="text-red-600 font-medium">
                        {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected for removal
                      </p>
                    )}
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
                          peer-checked:bg-gradient-to-r peer-checked:from-red-500 peer-checked:to-red-800
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
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-red-600 font-medium">
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
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
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
                            ? 'ring-4 ring-red-400 ring-opacity-75 shadow-xl'
                            : 'hover:shadow-lg'
                          }`
                    }`}
                  >
                    {/* Selection Checkbox */}
                    {page.pageNumber !== -1 && (
                      <div className="absolute -top-2 -right-2 z-20">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-all ${
                          selectedPages.includes(page.pageNumber)
                            ? 'bg-red-500 border-red-500 text-white'
                            : 'bg-white border-gray-300 hover:border-red-400'
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

                          {/* Remove overlay when selected */}
                          {selectedPages.includes(page.pageNumber) && (
                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                Will Remove
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : pdfFile ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading pages...</p>
              </div>
            </div>          ) : (
            <div className="flex items-center justify-center h-[450px] text-center py-8">
              <div className="max-w-lg mx-auto h-full flex flex-col justify-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  Ready to remove PDF pages
                </h4>
                <p className="text-gray-600 mb-6 text-base">
                  Upload a PDF file using the upload area to view its pages and remove unwanted pages.
                </p>
                
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-5 text-left border border-red-200">
                  <h5 className="font-bold text-gray-800 mb-3 flex items-center text-sm">
                    <span className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    How to remove pages:
                  </h5>
                  <div className="space-y-2 text-xs text-gray-700">
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                      <span>Upload a PDF file by clicking "Choose File" or dragging it into the upload area</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                      <span>Pages will automatically appear as thumbnails once the file is processed</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                      <span>Select pages by clicking them or enter page ranges (e.g., 1-3, 5, 7-10)</span>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                      <span>Click "Remove Pages" to download the new PDF with selected pages removed</span>
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

export default PDFRemover;
