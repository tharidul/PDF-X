import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import toast from 'react-hot-toast';
import UploadCard from './UploadCard';

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

const PDFMerger: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  const generateThumbnail = async (file: File): Promise<string> => {
    return new Promise(async (resolve) => {
      try {
        // Load PDF with PDF.js
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // Get the first page
        const page = await pdf.getPage(1);
        
        // Set up canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          resolve('');
          return;
        }
        
        // Calculate scale to fit thumbnail size
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(200 / viewport.width, 260 / viewport.height);
        const scaledViewport = page.getViewport({ scale });
        
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        
        // Render page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };
        
        await page.render(renderContext).promise;
        
        resolve(canvas.toDataURL());
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        // Fallback to simple PDF icon
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 260;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Draw PDF icon background
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(0, 0, 200, 260);
          
          // Draw PDF icon
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(40, 40, 120, 160);
          
          // Draw fold corner
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(140, 40);
          ctx.lineTo(160, 40);
          ctx.lineTo(160, 60);
          ctx.closePath();
          ctx.fill();
          
          // Draw text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('PDF', 100, 130);
          
          // Draw filename
          ctx.fillStyle = '#374151';
          ctx.font = '12px Arial';
          const fileName = file.name.length > 20 ? file.name.substring(0, 17) + '...' : file.name;
          ctx.fillText(fileName, 100, 230);
        }
        
        resolve(canvas.toDataURL());
      }
    });
  };
  const processFiles = async (files: FileList | File[]) => {
    setIsLoading(true);
    const newPdfFiles: PDFFile[] = [];
    const fileArray = Array.from(files);
    
    // Check file size limit (100MB)
    const maxFileSize = 100 * 1024 * 1024; // 100MB in bytes
    const oversizedFiles = fileArray.filter(file => file.size > maxFileSize);
    
    if (oversizedFiles.length > 0) {
      toast.error(`File size limit exceeded (100MB). Large files: ${oversizedFiles.map(f => f.name).join(', ')}`);
      setIsLoading(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const file of fileArray) {
      if (file.type === 'application/pdf') {
        try {
          const pageCount = await getPageCount(file);
          const thumbnail = await generateThumbnail(file);
          const pdfFile: PDFFile = {
            file,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            size: formatFileSize(file.size),
            pageCount,
            thumbnail
          };
          newPdfFiles.push(pdfFile);
          successCount++;
        } catch (error) {
          toast.error(`Failed to process "${file.name}". File may be corrupted.`);
          errorCount++;
        }
      } else {
        toast.error(`"${file.name}" is not a PDF file. Only PDF files are allowed.`);
        errorCount++;
      }
    }

    if (successCount > 0) {
      setPdfFiles(prev => [...prev, ...newPdfFiles]);
      toast.success(`Successfully uploaded ${successCount} PDF file${successCount > 1 ? 's' : ''}`);
    }

    setIsLoading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    await processFiles(files);
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
      await processFiles(files);
    }
  };
  const removeFile = (id: string) => {
    setPdfFiles(prev => prev.filter(file => file.id !== id));
    toast.success('File removed successfully');
  };

  const clearAllFiles = () => {
    setPdfFiles([]);
    toast.success('All files cleared');
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...pdfFiles];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setPdfFiles(newFiles);
  };

  // File reordering drag and drop handlers for grid
  const handleGridDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleGridDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleGridDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleGridDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      moveFile(draggedIndex, dropIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleGridDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const mergePDFs = async () => {
    if (pdfFiles.length < 2) {
      toast.error('Please upload at least 2 PDF files to merge.');
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading('Merging PDFs...');

    try {
      const mergedPdf = await PDFDocument.create();

      for (const pdfFile of pdfFiles) {
        const arrayBuffer = await pdfFile.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `merged-pdf-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      
      toast.success('PDFs merged successfully! Download started.', { id: loadingToast });
      
    } catch (err) {
      console.error('Error merging PDFs:', err);
      toast.error('Failed to merge PDFs. Please ensure all files are valid PDF documents.', { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };  return (
    <div className="bg-white rounded-3xl shadow-2xl shadow-blue-500/10 border border-gray-200/50 backdrop-blur-sm">
      {/* Main Content - Full Width Horizontal Layout */}
      <div className="flex flex-col xl:flex-row min-h-[600px]">{/* Left Side - Upload Area & Controls */}
        <div className="w-full xl:w-96 flex-shrink-0 border-b xl:border-b-0 xl:border-r border-gray-200/50 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">          <div className="p-6 sm:p-8 space-y-6">
              {/* Upload Section */}
            <UploadCard
              isLoading={isLoading}
              isDragOver={isDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileChange={handleFileUpload}
              multiple={true}
              title="Merge PDF Files"
              subtitle="Combine multiple PDFs into one"
              description="Drop multiple PDF files here or click to browse. Files will be merged in the order you arrange them."
              loadingText="Processing PDFs..."
              loadingSubtext="Please wait while we analyze your files"
              supportedFormats="Multiple PDF files"
            />

            {/* Merge Controls - Now directly below upload for better UX */}
            {pdfFiles.length > 0 && (
              <div className="border-2 border-blue-200 rounded-2xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                <h4 className="font-bold text-blue-800 mb-4 flex items-center text-lg">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Merge PDFs
                </h4>

                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>{pdfFiles.length}</strong> file{pdfFiles.length !== 1 ? 's' : ''} ready to merge
                  </p>
                  <p className="text-xs text-gray-500">
                    Total pages: {pdfFiles.reduce((total, pdf) => total + (pdf.pageCount || 0), 0)}
                  </p>
                  {pdfFiles.length > 1 && (
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Drag files in the grid to reorder them
                    </p>
                  )}
                </div>

                <button
                  onClick={mergePDFs}
                  disabled={isLoading || pdfFiles.length < 2}
                  className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
                    isLoading || pdfFiles.length < 2
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
                      Merging...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Merge {pdfFiles.length} PDF{pdfFiles.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </button>
                
                {pdfFiles.length === 1 && (
                  <p className="text-gray-500 mt-3 text-sm text-center">
                    Add at least one more PDF to merge
                  </p>
                )}

                {pdfFiles.length > 0 && (
                  <button
                    onClick={clearAllFiles}
                    className="w-full mt-3 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors font-medium"
                  >
                    Clear All Files
                  </button>
                )}
              </div>
            )}
          </div>
        </div>        {/* Right Side - PDF Grid */}
        <div className="flex-1 p-6 sm:p-8 bg-gray-50/30">
          {pdfFiles.length > 0 ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    Uploaded Files ({pdfFiles.length})
                  </h3>
                  <p className="text-gray-600">
                    {pdfFiles.reduce((total, pdf) => total + (pdf.pageCount || 0), 0)} total pages
                    {pdfFiles.length > 1 && (
                      <span className="text-blue-600 ml-2">• Drag to reorder</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                  {/* View Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center ${
                        viewMode === 'grid' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Grid
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 flex items-center ${
                        viewMode === 'list' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      List
                    </button>
                  </div>
                  <button
                    onClick={clearAllFiles}
                    className="px-3 py-1 text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center text-sm"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear All
                  </button>
                </div>
              </div>
              
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {pdfFiles.map((pdf, index) => (
                    <div 
                      key={pdf.id}
                      draggable
                      onDragStart={(e) => handleGridDragStart(e, index)}
                      onDragOver={(e) => handleGridDragOver(e, index)}
                      onDragLeave={handleGridDragLeave}
                      onDrop={(e) => handleGridDrop(e, index)}
                      onDragEnd={handleGridDragEnd}
                      className={`group relative bg-white border-2 border-gray-200 hover:border-blue-400 rounded-xl p-3 transition-all duration-200 hover:shadow-lg cursor-move ${
                        draggedIndex === index ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverIndex === index && draggedIndex !== index ? 'border-blue-500 bg-blue-50 transform scale-105' : ''
                      }`}
                    >
                      {/* Order Badge */}
                      <div className="absolute -top-2 -left-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10">
                        {index + 1}
                      </div>
                      
                      {/* Remove Button */}
                      <button
                        onClick={() => removeFile(pdf.id)}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                        title="Remove file"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      
                      {/* Thumbnail */}
                      <div className="aspect-[3/4] mb-3 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                        {pdf.thumbnail ? (
                          <img 
                            src={pdf.thumbnail} 
                            alt={pdf.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-red-100 flex items-center justify-center">
                            <svg className="w-12 h-12 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* File Info */}
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-900 text-sm truncate mb-1" title={pdf.name}>
                          {pdf.name}
                        </h4>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>{pdf.size}</div>
                          <div className="text-blue-600 font-medium">
                            {pdf.pageCount || 0} page{(pdf.pageCount || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      
                      {/* Drag Handle */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* List View */}
              {viewMode === 'list' && (
                <div className="space-y-3">
                  {pdfFiles.map((pdf, index) => (
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
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                                #{index + 1}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => removeFile(pdf.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
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
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-4">
                  No PDFs uploaded yet
                </h4>
                <p className="text-gray-600 mb-6">
                  Upload PDF files using the upload area on the left to see them here
                </p>
                <div className="bg-gray-50 rounded-lg p-6 text-left">
                  <h5 className="font-semibold text-gray-800 mb-3">
                    How to merge:
                  </h5>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</span>
                      Upload multiple PDF files
                    </div>
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</span>
                      Drag files to reorder them
                    </div>
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</span>
                      Click merge to download
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

export default PDFMerger;
