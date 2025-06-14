import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

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
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileForSplit, setSelectedFileForSplit] = useState<string | null>(null);
  const [pageRange, setPageRange] = useState('');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [viewMode, setViewMode] = useState<'range' | 'visual'>('visual');
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
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(pageNumber);
      
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      // Set canvas size based on PDF page dimensions
      const scale = Math.min(200 / viewport.width, 260 / viewport.height);
      const scaledViewport = page.getViewport({ scale });
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };
      
      await page.render(renderContext).promise;
      return canvas.toDataURL();
    } catch (error) {
      console.error('Error generating page thumbnail:', error);
      // Fallback to placeholder
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 260;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Draw page background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 200, 260);
          
          // Draw border
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, 200, 260);
          
          // Draw page number
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(`Page ${pageNumber}`, 100, 130);
          
          // Draw page lines simulation
          ctx.strokeStyle = '#f3f4f6';
          ctx.lineWidth = 1;
          for (let i = 50; i < 200; i += 20) {
            ctx.beginPath();
            ctx.moveTo(20, i);
            ctx.lineTo(180, i);
            ctx.stroke();
          }
        }
        
        resolve(canvas.toDataURL());
      });
    }
  };
  const generatePages = async (file: File, pageCount: number) => {
    const pageList: PageInfo[] = [];
    for (let i = 1; i <= pageCount; i++) {
      const thumbnail = await generatePageThumbnail(file, i);
      pageList.push({
        pageNumber: i,
        thumbnail
      });
    }
    setPages(pageList);
  };

  const processFiles = async (files: FileList | File[]) => {
    setError(null);
    setIsLoading(true);
    const newPdfFiles: PDFFile[] = [];
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (file.type === 'application/pdf') {
        const pageCount = await getPageCount(file);
        const pdfFile: PDFFile = {
          file,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: formatFileSize(file.size),
          pageCount
        };
        newPdfFiles.push(pdfFile);
      } else {
        setError(`File "${file.name}" is not a PDF. Only PDF files are allowed.`);
      }
    }

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    setIsLoading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    await processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const removeFile = (id: string) => {
    setPdfFiles(prev => prev.filter(file => file.id !== id));
    setError(null);
    if (selectedFileForSplit === id) {
      setSelectedFileForSplit(null);
      setPageRange('');
      setSelectedPages([]);
      setPages([]);
    }
  };

  const clearAllFiles = () => {
    setPdfFiles([]);
    setError(null);
    setSelectedFileForSplit(null);
    setPageRange('');
    setSelectedPages([]);
    setPages([]);
  };
  const handleSelectFile = async (fileId: string) => {
    setSelectedFileForSplit(fileId);
    setPageRange('');
    setSelectedPages([]);
    setError(null);
    
    const file = pdfFiles.find(f => f.id === fileId);
    if (file?.pageCount) {
      await generatePages(file.file, file.pageCount);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    setSelectedPages(prev => {
      const newSelected = prev.includes(pageNumber)
        ? prev.filter(p => p !== pageNumber)
        : [...prev, pageNumber].sort((a, b) => a - b);
      
      // Update page range text
      updatePageRangeFromSelection(newSelected);
      return newSelected;
    });
  };

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
    const file = pdfFiles.find(f => f.id === selectedFileForSplit);
    const validPages = parsedPages.filter(p => p >= 1 && p <= (file?.pageCount || 0));
    setSelectedPages(validPages);
  };

  const splitPDF = async (fileId: string, range: string) => {
    const file = pdfFiles.find(f => f.id === fileId);
    if (!file) {
      setError('File not found.');
      return;
    }

    const pagesToExtract = parsePageRange(range);
    if (pagesToExtract.length === 0) {
      setError('Please specify valid page numbers.');
      return;
    }

    const maxPages = file.pageCount || 0;
    const invalidPages = pagesToExtract.filter(page => page < 1 || page > maxPages);
    if (invalidPages.length > 0) {
      setError(`Invalid page numbers: ${invalidPages.join(', ')}. This PDF has ${maxPages} pages.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.file.arrayBuffer();
      const originalPdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      // Extract specified pages (convert to 0-based index)
      const pageIndices = pagesToExtract.map(page => page - 1);
      const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
      
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace('.pdf', '')}-pages-${range.replace(/\s/g, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error splitting PDF:', err);
      setError('Failed to split PDF. Please ensure the file is a valid PDF document.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="bg-white rounded-3xl shadow-2xl shadow-blue-500/10 border border-gray-200/50 backdrop-blur-sm">
      {/* Error Display */}
      {error && (
        <div className="mb-6 mx-6 sm:mx-8 mt-6 sm:mt-8 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
          <div className="flex items-center">
            <svg className="h-6 w-6 text-red-400 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Full Width Horizontal Layout */}
      <div className="flex flex-col xl:flex-row min-h-[600px]">
        {/* Left Side - Upload Area & Controls */}
        <div className="w-full xl:w-96 flex-shrink-0 border-b xl:border-b-0 xl:border-r border-gray-200/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Upload Section */}
            <div 
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50 scale-102 shadow-lg' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}            >
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <svg className="animate-spin h-20 w-20 text-blue-600 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-xl font-semibold text-blue-600">Processing files...</p>
                  <p className="text-gray-500 mt-2">Please wait while we analyze your PDF</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="mb-8">
                    <svg className="mx-auto h-20 w-20 text-blue-400 mb-6" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">Upload Your PDF</h3>
                    <p className="text-gray-600 text-lg leading-relaxed">
                      Drop your PDF file here or click to browse
                    </p>
                  </div>
                  
                  <label htmlFor="pdf-upload" className="cursor-pointer block group">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform group-hover:scale-105 shadow-lg">
                      Choose File
                    </div>
                    <p className="text-sm text-gray-500 mt-4">
                      Single PDF file to split • Drag & drop enabled
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

            {/* File List */}
            {pdfFiles.length > 0 && (
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Uploaded Files ({pdfFiles.length})
                </h3>
                <div className="space-y-3">
                  {pdfFiles.map((pdf) => (
                    <div 
                      key={pdf.id}
                      className={`group border-2 rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                        selectedFileForSplit === pdf.id
                          ? 'border-blue-500 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => handleSelectFile(pdf.id)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                            <svg className="h-7 w-7 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{pdf.name}</h4>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-sm text-gray-500">{pdf.size}</span>
                            <span className="text-sm text-blue-600 font-medium">
                              {pdf.pageCount || 0} pages
                            </span>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(pdf.id);
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          title="Remove file"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split Controls */}
            {selectedFileForSplit && (
              <div className="border-2 border-blue-200 rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                <h4 className="font-bold text-blue-800 mb-4 flex items-center text-lg">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Split Pages
                </h4>
                
                {/* Mode Toggle */}
                <div className="flex items-center bg-white rounded-xl p-1.5 mb-6 shadow-sm">
                  <button
                    onClick={() => setViewMode('visual')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center flex-1 justify-center ${
                      viewMode === 'visual' 
                        ? 'bg-blue-100 text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Visual
                  </button>
                  <button
                    onClick={() => setViewMode('range')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center flex-1 justify-center ${
                      viewMode === 'range' 
                        ? 'bg-blue-100 text-blue-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Range
                  </button>
                </div>

                {/* Page Range Input */}
                <div className="mb-6">
                  <label htmlFor="page-range" className="block text-sm font-semibold text-gray-700 mb-3">
                    Page Range
                  </label>
                  <input
                    id="page-range"
                    type="text"
                    value={pageRange}
                    onChange={(e) => handlePageRangeChange(e.target.value)}
                    placeholder="e.g., 1-3, 5, 7-10"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                  {selectedPages.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2 font-medium">
                      {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                {/* Split Button */}
                <button
                  onClick={() => splitPDF(selectedFileForSplit, pageRange)}
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

                {pdfFiles.length > 0 && (
                  <button
                    onClick={clearAllFiles}
                    className="w-full mt-3 px-6 py-3 text-red-600 hover:text-red-700 border border-red-300 rounded-xl hover:bg-red-50 transition-all duration-200 font-medium"
                  >
                    Clear All Files
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Pages Grid - Full Width */}
        <div className="flex-1 p-6 sm:p-8 bg-gray-50/30">
          {selectedFileForSplit && pages.length > 0 ? (
            <div className="h-full">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Select Pages ({pages.length} total)
                  </h3>
                  <p className="text-gray-600">
                    Click pages to select them for extraction
                    {selectedPages.length > 0 && (
                      <span className="text-blue-600 ml-2">• {selectedPages.length} selected</span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Pages Grid - Optimized for full width */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-4">
                {pages.map((page) => (
                  <div 
                    key={page.pageNumber}
                    onClick={() => handlePageClick(page.pageNumber)}
                    className={`group relative border-2 rounded-2xl p-3 transition-all duration-200 cursor-pointer ${
                      selectedPages.includes(page.pageNumber)
                        ? 'border-blue-500 bg-blue-50 shadow-xl transform scale-105'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-lg bg-white'
                    }`}
                  >
                    {/* Selection Badge */}
                    {selectedPages.includes(page.pageNumber) && (
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10">
                        ✓
                      </div>
                    )}
                    
                    {/* Page Number Badge */}
                    <div className="absolute -top-2 -left-2 w-8 h-6 bg-gray-700 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-10">
                      {page.pageNumber}
                    </div>
                    
                    {/* Page Thumbnail */}
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm">
                      {page.thumbnail ? (
                        <img 
                          src={page.thumbnail} 
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Page Number Label */}
                    <div className="text-center mt-3">
                      <span className="text-xs font-medium text-gray-600">
                        Page {page.pageNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedFileForSplit ? (
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
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center py-20">
              <div className="max-w-lg mx-auto">
                <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4">
                  {pdfFiles.length === 0 ? 'Ready to split your PDF' : 'Select a PDF to split'}
                </h4>
                <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                  {pdfFiles.length === 0 
                    ? 'Upload a PDF file using the upload area to view its pages and extract specific sections.'
                    : 'Click on a PDF file in the left panel to view its pages and start splitting.'
                  }
                </p>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-left border border-blue-100">
                  <h5 className="font-bold text-gray-800 mb-4 text-lg">
                    How to split PDFs:
                  </h5>
                  <div className="space-y-3 text-gray-600">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                      <span>Upload a PDF file by clicking "Choose File" or dragging it into the upload area</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                      <span>Click on the uploaded PDF to view all its pages as thumbnails</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                      <span>Select pages by clicking them or enter page ranges (e.g., 1-3, 5, 7-10)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</div>
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
                </button>
                <button
                  onClick={() => setViewMode('range')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center flex-1 justify-center ${
                    viewMode === 'range' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Range
                </button>
              </div>

              {/* Page Range Input */}
              <div className="mb-4">
                <label htmlFor="page-range" className="block text-sm font-semibold text-gray-700 mb-2">
                  Page Range
                </label>
                <input
                  id="page-range"
                  type="text"
                  value={pageRange}
                  onChange={(e) => handlePageRangeChange(e.target.value)}
                  placeholder="e.g., 1-3, 5, 7-10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
                />
                {selectedPages.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {/* Split Button */}
              <button
                onClick={() => splitPDF(selectedFileForSplit, pageRange)}
                disabled={isLoading || !pageRange.trim() || selectedPages.length === 0}
                className={`w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 text-sm ${
                  isLoading || !pageRange.trim() || selectedPages.length === 0
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Splitting...
                  </div>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Extract Pages
                  </span>
                )}
              </button>

              {pdfFiles.length > 0 && (
                <button
                  onClick={clearAllFiles}
                  className="w-full mt-2 px-4 py-2 text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200 text-sm"
                >
                  Clear All Files
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side - Pages Grid */}
        <div className="flex-1 min-w-0">
          {selectedFileForSplit && pages.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-1">
                    Select Pages ({pages.length} total)
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Click pages to select them for extraction
                    {selectedPages.length > 0 && (
                      <span className="text-blue-600 ml-2">• {selectedPages.length} selected</span>
                    )}
                  </p>
                </div>
              </div>
              
              {/* Pages Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                {pages.map((page) => (
                  <div 
                    key={page.pageNumber}
                    onClick={() => handlePageClick(page.pageNumber)}
                    className={`group relative border-2 rounded-xl p-2 transition-all duration-200 cursor-pointer ${
                      selectedPages.includes(page.pageNumber)
                        ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                        : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {/* Selection Badge */}
                    {selectedPages.includes(page.pageNumber) && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-10">
                        ✓
                      </div>
                    )}
                    
                    {/* Page Number Badge */}
                    <div className="absolute -top-2 -left-2 w-8 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-10">
                      {page.pageNumber}
                    </div>
                    
                    {/* Page Thumbnail */}
                    <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white flex items-center justify-center">
                      {page.thumbnail ? (
                        <img 
                          src={page.thumbnail} 
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Page Number Label */}
                    <div className="text-center mt-2">
                      <span className="text-xs font-medium text-gray-600">
                        Page {page.pageNumber}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedFileForSplit ? (
            <div className="flex items-center justify-center h-full text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">
                  Loading Pages...
                </h4>
                <p className="text-gray-600">
                  Please wait while we prepare the page preview
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  {pdfFiles.length === 0 ? 'No PDF uploaded yet' : 'Select a PDF to split'}
                </h4>
                <p className="text-gray-600 mb-6">
                  {pdfFiles.length === 0 
                    ? 'Upload a PDF file using the upload area on the left to get started'
                    : 'Click on a PDF file in the left panel to view its pages'
                  }
                </p>
                <div className="bg-gray-50 rounded-lg p-6 text-left">
                  <h5 className="font-semibold text-gray-800 mb-3">
                    How to split:
                  </h5>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
                      Upload a PDF file
                    </div>
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
                      Select the PDF to view pages
                    </div>
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
                      Click pages or enter ranges
                    </div>
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">4</span>
                      Extract selected pages
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
