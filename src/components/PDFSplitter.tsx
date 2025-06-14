import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';

interface PDFFile {
  file: File;
  id: string;
  name: string;
  size: string;
  pageCount?: number;
}

const PDFSplitter: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileForSplit, setSelectedFileForSplit] = useState<string | null>(null);
  const [pageRange, setPageRange] = useState('');
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
    }
  };

  const clearAllFiles = () => {
    setPdfFiles([]);
    setError(null);
    setSelectedFileForSplit(null);
    setPageRange('');
  };

  const splitPDF = async (fileId: string, pageRangeInput: string) => {
    const pdfFile = pdfFiles.find(f => f.id === fileId);
    if (!pdfFile) {
      setError('PDF file not found.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pages = parsePageRange(pageRangeInput);
      if (pages.length === 0) {
        setError('Invalid page range. Use format like "1-3, 5" or "1, 3, 5-7".');
        setIsLoading(false);
        return;
      }

      const arrayBuffer = await pdfFile.file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(arrayBuffer);
      const totalPages = sourcePdf.getPageCount();

      const invalidPages = pages.filter(p => p < 1 || p > totalPages);
      if (invalidPages.length > 0) {
        setError(`Invalid page numbers: ${invalidPages.join(', ')}. PDF has ${totalPages} pages.`);
        setIsLoading(false);
        return;
      }

      const newPdf = await PDFDocument.create();
      const pageIndices = pages.map(p => p - 1);
      const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const baseName = pdfFile.name.replace('.pdf', '');
      link.download = `${baseName}_pages_${pageRangeInput.replace(/\s/g, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      
      setSelectedFileForSplit(null);
      setPageRange('');
      
    } catch (err) {
      console.error('Error splitting PDF:', err);
      setError('Failed to split PDF. Please ensure the file is valid and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Split PDF
        </h2>
        <p className="text-gray-600">
          Upload a PDF file to extract specific pages into a new document
        </p>
      </div>

      {/* File Upload Section */}
      <div className="mb-8">
        <div 
          className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-300 ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50 scale-102' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isLoading ? (
            <div className="flex flex-col items-center">
              <div className="relative">
                <svg className="animate-spin h-16 w-16 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-lg font-medium text-blue-600">Processing files...</p>
              <p className="text-gray-500">Please wait while we analyze your PDF</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <label htmlFor="pdf-upload" className="cursor-pointer block">
                <span className="text-2xl font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Drop PDF file here
                </span>
                <p className="text-gray-500 mt-2 text-lg">or click to browse</p>
                <p className="text-sm text-gray-400 mt-4">
                  Upload a single PDF file to split
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
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
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

      {/* PDF Files List */}
      {pdfFiles.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-1">
                Uploaded Files
              </h3>
              <p className="text-gray-600">
                {pdfFiles.length} file{pdfFiles.length !== 1 ? 's' : ''} • {pdfFiles.reduce((total, pdf) => total + (pdf.pageCount || 0), 0)} total pages
              </p>
            </div>
            <button
              onClick={clearAllFiles}
              className="mt-4 sm:mt-0 px-4 py-2 text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          </div>
          
          <div className="space-y-3">
            {pdfFiles.map((pdf) => (
              <div 
                key={pdf.id}
                className="group bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl p-4 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="h-8 w-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate text-lg">{pdf.name}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-500">{pdf.size}</span>
                        <span className="text-sm text-blue-600 font-medium">
                          {pdf.pageCount || 0} page{(pdf.pageCount || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedFileForSplit(pdf.id);
                        setPageRange('');
                        setError(null);
                      }}
                      className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors font-medium"
                    >
                      <svg className="w-4 h-4 mr-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Split
                    </button>
                    
                    <button
                      onClick={() => removeFile(pdf.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 group-hover:opacity-100 opacity-70"
                      title="Remove file"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Split Interface */}
      {selectedFileForSplit && (
        <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <h3 className="text-xl font-bold text-blue-800">Split PDF Pages</h3>
          </div>
          
          <div className="mb-6">
            <label htmlFor="page-range" className="block text-sm font-semibold text-gray-700 mb-2">
              Page Range
            </label>
            <input
              id="page-range"
              type="text"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="e.g., 1-3, 5, 7-10"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
            <div className="mt-3 space-y-2">
              <p className="text-sm text-gray-600">
                Enter page numbers and ranges separated by commas.
              </p>
              <div className="text-sm text-gray-500">
                <strong>Examples:</strong> "1-3" for pages 1 to 3, "1, 5, 7-10" for pages 1, 5, and 7 to 10
              </div>
              {(() => {
                const file = pdfFiles.find(f => f.id === selectedFileForSplit);
                return file?.pageCount ? (
                  <p className="text-sm text-blue-600 font-medium">
                    📄 This PDF has {file.pageCount} pages total
                  </p>
                ) : null;
              })()}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => splitPDF(selectedFileForSplit, pageRange)}
              disabled={isLoading || !pageRange.trim()}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                isLoading || !pageRange.trim()
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105 shadow-lg'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Splitting PDF...
                </div>
              ) : (
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Extract Pages
                </span>
              )}
            </button>
            
            <button
              onClick={() => {
                setSelectedFileForSplit(null);
                setPageRange('');
                setError(null);
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {pdfFiles.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <h4 className="text-2xl font-bold text-gray-900 mb-4">
              Split PDF Pages
            </h4>
            <p className="text-gray-600 mb-6 text-lg">
              Upload a PDF file to extract specific pages into a new document
            </p>
            <div className="bg-gray-50 rounded-lg p-6 text-left">
              <h5 className="font-semibold text-gray-800 mb-3">
                How to split:
              </h5>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
                  Upload a single PDF file
                </div>
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
                  Specify page ranges (e.g., "1-3, 5, 7-10")
                </div>
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
                  Extract pages to a new PDF
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFSplitter;
