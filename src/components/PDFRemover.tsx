import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';

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
  const [pageRange, setPageRange] = useState('');  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pages, setPages] = useState<PageInfo[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const generatePageThumbnail = async (file: File, pageNumber: number): Promise<string> => {
    try {
      console.log(`Generating thumbnail for page ${pageNumber}`);
      const arrayBuffer = await file.arrayBuffer();
      
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNumber);
      
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      const targetWidth = 200;
      const targetHeight = 280;
      const scale = Math.min(targetWidth / viewport.width, targetHeight / viewport.height);
      const scaledViewport = page.getViewport({ scale });
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };
      
      const renderTask = page.render(renderContext);
      await renderTask.promise;
      
      console.log(`Successfully generated thumbnail for page ${pageNumber}`);
      return canvas.toDataURL('image/png', 0.8);    } catch (error: any) {
      console.error(`Error generating page thumbnail for page ${pageNumber}:`, error);
      
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 280;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 200, 280);
          
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(1, 1, 198, 278);
          
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Page ${pageNumber}`, 100, 120);
          ctx.font = '12px Arial';
          ctx.fillText('Preview unavailable', 100, 150);
        }
        
        resolve(canvas.toDataURL());
      });
    }
  };

  const generatePages = async (file: File, pageCount: number) => {
    console.log(`Starting to generate thumbnails for ${pageCount} pages`);
    const pageList: PageInfo[] = [];
    const maxThumbnails = 100;
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
    
    const batchSize = 3;
    for (let i = 0; i < thumbnailCount; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, thumbnailCount); j++) {
        const pageNumber = j + 1;
        batch.push(
          generatePageThumbnail(file, pageNumber).then(thumbnail => ({
            pageNumber,
            thumbnail
          })).catch(error => {
            console.error(`Failed to generate thumbnail for page ${pageNumber}:`, error);
            return {
              pageNumber,
              thumbnail: undefined
            };
          })
        );
      }
      
      const batchResults = await Promise.all(batch);
      
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
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 100MB.');
      return;
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
      };      setPdfFile(newFile);
      setSelectedPages([]);
      setPageRange('');
      setPages([]);

      await generatePages(file, pageCount);
      
      toast.success(`PDF loaded successfully! ${pageCount} pages found.`, { id: loadingToast });
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      toast.error(error.message || 'Failed to load PDF file', { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        if (fileInputRef.current) {
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInputRef.current.files = dt.files;
          handleFileUpload({ target: { files: dt.files } } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        toast.error('Please upload a PDF file');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };
  const removeFile = () => {
    setPdfFile(null);
    setSelectedPages([]);
    setPageRange('');
    setPages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePageClick = (pageNumber: number) => {
    if (selectedPages.includes(pageNumber)) {
      const newSelected = selectedPages.filter(p => p !== pageNumber);
      setSelectedPages(newSelected);
      setPageRange(newSelected.join(', '));
    } else {
      const newSelected = [...selectedPages, pageNumber].sort((a, b) => a - b);
      setSelectedPages(newSelected);
      setPageRange(newSelected.join(', '));
    }
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
      
      // Create new PDF with remaining pages (pages NOT in the remove list)
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

      // Copy the pages we want to keep
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
        { id: loadingToast }
      );
      
    } catch (error: any) {
      console.error('Error removing pages from PDF:', error);
      toast.error(error.message || 'Failed to remove pages from PDF', { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-col lg:flex-row gap-8 h-full">
        {/* Left Side - Upload and Controls */}
        <div className="lg:w-96 flex-shrink-0">
          <div 
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50/50' 
                : 'border-gray-300 hover:border-gray-400 bg-white/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {pdfFile ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border border-gray-200">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800 truncate">
                      {pdfFile.name}
                    </div>
                    <div className="text-sm text-gray-500 space-x-2">
                      <span>{pdfFile.size}</span>
                      <span>•</span>
                      <span>
                        {pdfFile.pageCount} page{pdfFile.pageCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <label htmlFor="pdf-upload" className="cursor-pointer flex-1">
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                      Change File
                    </div>
                  </label>
                  <button
                    onClick={removeFile}
                    className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium"
                  >
                    Remove
                  </button>
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
            ) : (
              <div className="space-y-6">
                <div className="mb-8">
                  <svg className="mx-auto h-20 w-20 text-red-400 mb-6" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">Upload Your PDF</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Drop your PDF file here or click to browse
                  </p>
                </div>
                
                <label htmlFor="pdf-upload" className="cursor-pointer block group">
                  <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-red-700 hover:to-pink-700 transition-all duration-200 transform group-hover:scale-105 shadow-lg">
                    Choose File
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Single PDF file to remove pages from • Max 100MB • Drag & drop enabled
                  </p>
                </label>
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
          </div>

          {/* Page Selection Controls */}
          {pdfFile && (
            <div className="mt-6 space-y-4">
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
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-sm">
                            Will remove {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          Remaining: {(pdfFile.pageCount || 0) - selectedPages.length} page{((pdfFile.pageCount || 0) - selectedPages.length) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>How to use:</strong></p>
                    <p>• Single pages: <span className="font-mono bg-gray-100 px-1 rounded">1, 5, 10</span></p>
                    <p>• Page ranges: <span className="font-mono bg-gray-100 px-1 rounded">1-5, 10-15</span></p>
                    <p>• Mixed: <span className="font-mono bg-gray-100 px-1 rounded">1-3, 7, 10-12</span></p>
                    <p>• Or simply click pages above to select them</p>
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

        {/* Right Side - Pages Grid */}
        <div className="flex-1 p-6 sm:p-8 bg-gray-50/30">
          {pdfFile && pages.length > 0 ? (
            <div className="h-full">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Select Pages to Remove ({pdfFile?.pageCount || 0} total pages)
                  </h3>
                  <p className="text-gray-600">
                    Click pages to select them for removal
                    {selectedPages.length > 0 && (
                      <span className="text-red-600 ml-2">• {selectedPages.length} selected for removal</span>
                    )}
                  </p>
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
              </div>

              {/* Pages Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
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
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading pages...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-500">
                <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg">Upload a PDF to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFRemover;
