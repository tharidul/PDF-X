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
  const [pageRange, setPageRange] = useState('');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
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
      return canvas.toDataURL('image/png', 0.8);
    } catch (error: any) {
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
      };

      setPdfFile(newFile);
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

  const handleDrop = (event: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
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

  const handleDragOver = (event: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement | HTMLLabelElement>) => {
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
    <div className="bg-white rounded-3xl shadow-2xl shadow-red-500/10 border border-gray-200/50 backdrop-blur-sm">
      {/* Main Content - Full Width Horizontal Layout */}
      <div className="flex flex-col xl:flex-row min-h-[600px]">
        {/* Left Side - Upload Area & Controls */}
        <div className="w-full xl:w-96 flex-shrink-0 border-b xl:border-b-0 xl:border-r border-gray-200/50 bg-gradient-to-br from-red-50/50 to-pink-50/50">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Upload Section */}
            <label 
              htmlFor="pdf-upload"
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer block ${
                isDragOver 
                  ? 'border-red-500 bg-red-50 scale-102 shadow-lg' 
                  : 'border-gray-300 hover:border-red-400 hover:bg-gray-50/50 hover:scale-[1.02]'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-20 w-20 text-red-600 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-xl font-semibold text-red-600">Processing PDF...</p>
                  <p className="text-gray-500 mt-2">Please wait while we analyze your file</p>
                </div>
              ) : pdfFile ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center">
                      <svg className="h-10 w-10 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 truncate">{pdfFile.name}</h3>
                    <div className="flex items-center justify-center space-x-3 mt-2">
                      <span className="text-sm text-gray-500">{pdfFile.size}</span>
                      <span className="text-sm text-red-600 font-medium">
                        {pdfFile.pageCount || 0} pages
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex-1">
                      Change File
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        removeFile();
                      }}
                      className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="mb-8">
                    <svg className="mx-auto h-20 w-20 text-red-400 mb-6" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Upload Your PDF</h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      Drop your PDF file here or click anywhere to browse
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Single PDF file to remove pages from • Max 100MB • Drag & drop enabled
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="pdf-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

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
            <div className="h-full">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Select Pages to Remove ({pdfFile?.pageCount || 0} total pages)
                  </h3>
                  {selectedPages.length > 0 && (
                    <p className="text-red-600 font-medium">
                      {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected for removal
                    </p>
                  )}
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
              </div>

              {/* Pages Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
                {pages.map((page) => (
                  <div key={page.pageNumber} className="relative group">
                    {page.pageNumber === -1 ? (
                      // Summary card for remaining pages
                      <div className="bg-gray-100 border-2 border-gray-300 rounded-xl p-4 text-center">
                        <div className="aspect-[3/4] flex items-center justify-center bg-gray-200 rounded-lg mb-3">
                          <div className="text-center">
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="text-sm font-medium text-gray-600">
                              Pages 101-{pdfFile?.pageCount}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(pdfFile?.pageCount || 0) - 100} more pages
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          Use page range input to select
                        </div>
                      </div>
                    ) : (
                      // Regular page thumbnail
                      <div 
                        onClick={() => handlePageClick(page.pageNumber)}
                        className={`relative bg-white border-2 rounded-xl p-3 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                          selectedPages.includes(page.pageNumber) 
                            ? 'border-red-500 bg-red-50 ring-2 ring-red-200' 
                            : 'border-gray-200 hover:border-red-300'
                        }`}
                      >
                        {/* Selection overlay */}
                        {selectedPages.includes(page.pageNumber) && (
                          <div className="absolute inset-0 bg-red-500/20 rounded-xl flex items-center justify-center z-10">
                            <div className="bg-red-500 text-white rounded-full p-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                        
                        {/* Page number badge */}
                        <div className="absolute -top-2 -left-2 w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-20">
                          {page.pageNumber}
                        </div>
                        
                        {/* Thumbnail */}
                        <div className="aspect-[3/4] mb-3 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                          {page.thumbnail ? (
                            <img 
                              src={page.thumbnail} 
                              alt={`Page ${page.pageNumber}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                            </div>
                          )}
                        </div>
                        
                        {/* Page info */}
                        <div className="text-center">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            Page {page.pageNumber}
                          </div>
                          {selectedPages.includes(page.pageNumber) && (
                            <div className="text-xs text-red-600 font-medium mt-1">
                              Selected for removal
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
