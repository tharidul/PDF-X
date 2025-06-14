import React, { useState } from 'react';
import PDFMerger from './PDFMerger';
import PDFSplitter from './PDFSplitter';

const PDFToolbox: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'merge' | 'split'>('merge');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Full-width Header Navigation */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    PDF-X
                  </h1>
                  <p className="text-sm text-gray-500">Professional PDF Tools</p>
                </div>
              </div>
            </div>

            {/* Mode Toggle - Centered */}
            <div className="flex-1 flex justify-center">
              <div className="inline-flex bg-gray-100/70 backdrop-blur-sm rounded-2xl p-1.5 shadow-lg border border-gray-200/50">
                <button
                  onClick={() => setActiveMode('merge')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ease-out ${
                    activeMode === 'merge' 
                      ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/20 transform scale-105 border border-blue-100' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    <span>Merge PDFs</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveMode('split')}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ease-out ${
                    activeMode === 'split' 
                      ? 'bg-white text-blue-600 shadow-lg shadow-blue-500/20 transform scale-105 border border-blue-100' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Split PDF</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Right side - Feature badges */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Fast
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Secure
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                  Free
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Full-width Content Area */}
      <main className="w-full px-6 py-8">
        {/* Hero Section with Mode Description */}
        <div className="w-full mb-8">
          <div className="text-center max-w-4xl mx-auto">
            {activeMode === 'merge' ? (
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-gray-800">
                  Merge Multiple PDFs
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Combine multiple PDF files into a single document. Simply upload your files, arrange them in the desired order, and download the merged result.
                </p>
                <div className="flex justify-center items-center space-x-8 mt-6">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>No file limit</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Drag & Drop reordering</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>High quality output</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-gray-800">
                  Split PDF into Pages
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Extract specific pages from your PDF documents. Select individual pages or page ranges to create new PDF files with exactly the content you need.
                </p>
                <div className="flex justify-center items-center space-x-8 mt-6">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Visual page selection</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Page range support</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Preview thumbnails</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content - Full Width */}
        <div className="w-full">
          {activeMode === 'merge' ? <PDFMerger /> : <PDFSplitter />}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full mt-16 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
        <div className="px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-800 font-semibold">PDF-X</p>
                <p className="text-gray-500 text-sm">Professional PDF Processing</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <span>© 2025 PDF-X. All processing done locally in your browser.</span>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PDFToolbox;
