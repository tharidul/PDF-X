import React, { useState } from 'react';
import PDFMerger from './PDFMerger';
import PDFSplitter from './PDFSplitter';

const PDFToolbox: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'merge' | 'split'>('merge');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-4">
            PDF-X
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Professional PDF Merger & Splitter
          </p>
          
          {/* Mode Toggle */}
          <div className="inline-flex bg-white rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setActiveMode('merge')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeMode === 'merge' 
                  ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                Merge PDFs
              </span>
            </button>
            <button
              onClick={() => setActiveMode('split')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                activeMode === 'split' 
                  ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Split PDF
              </span>
            </button>
          </div>
        </div>

        {/* Content */}
        {activeMode === 'merge' ? <PDFMerger /> : <PDFSplitter />}
      </div>
    </div>
  );
};

export default PDFToolbox;
