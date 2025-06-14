import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';

interface PDFFile {
  file: File;
  id: string;
  name: string;
  size: string;
}

const PDFMerger: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setError(null);
    const newPdfFiles: PDFFile[] = [];

    Array.from(files).forEach((file) => {
      if (file.type === 'application/pdf') {
        const pdfFile: PDFFile = {
          file,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: formatFileSize(file.size)
        };
        newPdfFiles.push(pdfFile);
      } else {
        setError(`File "${file.name}" is not a PDF. Only PDF files are allowed.`);
      }
    });

    setPdfFiles(prev => [...prev, ...newPdfFiles]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setPdfFiles(prev => prev.filter(file => file.id !== id));
    setError(null);
  };

  const clearAllFiles = () => {
    setPdfFiles([]);
    setError(null);
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    const newFiles = [...pdfFiles];
    const [movedFile] = newFiles.splice(fromIndex, 1);
    newFiles.splice(toIndex, 0, movedFile);
    setPdfFiles(newFiles);
  };

  const mergePDFs = async () => {
    if (pdfFiles.length < 2) {
      setError('Please upload at least 2 PDF files to merge.');
      return;
    }

    setIsLoading(true);
    setError(null);

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

      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `merged-pdf-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error merging PDFs:', err);
      setError('Failed to merge PDFs. Please ensure all files are valid PDF documents.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">PDF Merger</h1>
        <p className="text-gray-600">Upload multiple PDF files and merge them into a single document</p>
      </div>

      {/* File Upload Section */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <span className="text-lg font-medium text-blue-600 hover:text-blue-500">
              Click to upload PDF files
            </span>
            <p className="text-gray-500 mt-1">or drag and drop</p>
          </label>
          <input
            ref={fileInputRef}
            id="pdf-upload"
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* PDF Files List */}
      {pdfFiles.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Uploaded Files ({pdfFiles.length})
            </h2>
            <button
              onClick={clearAllFiles}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-3">
            {pdfFiles.map((pdf, index) => (
              <div key={pdf.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col">
                    <button
                      onClick={() => index > 0 && moveFile(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => index < pdfFiles.length - 1 && moveFile(index, index + 1)}
                      disabled={index === pdfFiles.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">{pdf.name}</p>
                    <p className="text-sm text-gray-500">{pdf.size}</p>
                  </div>
                  
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    #{index + 1}
                  </span>
                </div>
                
                <button
                  onClick={() => removeFile(pdf.id)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Merge Button */}
      {pdfFiles.length > 0 && (
        <div className="text-center">
          <button
            onClick={mergePDFs}
            disabled={isLoading || pdfFiles.length < 2}
            className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
              isLoading || pdfFiles.length < 2
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 transform hover:scale-105'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Merging PDFs...
              </div>
            ) : (
              `Merge ${pdfFiles.length} PDF${pdfFiles.length > 1 ? 's' : ''}`
            )}
          </button>
          
          {pdfFiles.length < 2 && pdfFiles.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Add at least one more PDF to merge
            </p>
          )}
        </div>
      )}

      {/* Instructions */}
      {pdfFiles.length === 0 && (
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Get Started</h3>
          <p className="text-gray-600 mb-4">
            Upload multiple PDF files to merge them into a single document
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>• Files will be merged in the order shown</p>
            <p>• Use the arrow buttons to reorder files</p>
            <p>• All processing happens in your browser</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFMerger;
