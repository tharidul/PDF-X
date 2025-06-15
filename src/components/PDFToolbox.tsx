import React, { useState, Suspense } from 'react';
import Footer from './Footer';
import MemoryWarning from './MemoryWarning';

// Lazy load PDF components for better code splitting
const PDFMerger = React.lazy(() => import('./PDFMerger'));
const PDFSplitter = React.lazy(() => import('./PDFSplitter'));
const PDFRemover = React.lazy(() => import('./PDFRemover'));

// Loading component for suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
  </div>
);

const PDFToolbox: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'merge' | 'split' | 'remove'>('merge');  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Mobile-Optimized Header Navigation with Enhanced Glass Effect */}
      <header className="bg-white/20 backdrop-blur-xl border-b border-white/30 sticky top-0 z-50 shadow-lg shadow-black/5 flex-shrink-0">
        <div className="w-full px-4 sm:px-6 py-3 sm:py-4">
          {/* Mobile Layout: Stacked */}
          <div className="flex flex-col space-y-3 sm:hidden">            {/* Logo and Title - Mobile */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">                <div className="w-12 h-12 flex items-center justify-center p-1">
                  <img 
                    src="/images/favicon.ico" 
                    alt="PDF-X Logo" 
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    PDF-X
                  </h1>
                  <p className="text-xs text-gray-500">PDF Tools</p>
                </div>
              </div>              <div className="flex items-center space-x-2">
                {/* Mobile Navigation Menu */}
                <div className="relative group">
                  <button className="flex items-center p-2 bg-white/20 backdrop-blur-md text-gray-700 rounded-lg border border-white/30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  
                  {/* Mobile Dropdown */}
                  <div className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                    <div className="py-2">
                      <a 
                        href="https://lkml.live" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center px-3 py-2 text-gray-700 hover:bg-blue-50/80 hover:text-blue-600 transition-colors duration-200"
                      >
                        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-md flex items-center justify-center mr-2">
                          <span className="text-white font-bold text-xs">L</span>
                        </div>
                        <div className="text-sm font-medium">LKML</div>
                      </a>
                      <a 
                        href="https://imgx.lkml.live" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center px-3 py-2 text-gray-700 hover:bg-green-50/80 hover:text-green-600 transition-colors duration-200"
                      >                        <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center mr-2 p-1">
                          <img 
                            src="/images/ICO_IMG-X.ico" 
                            alt="IMG-X" 
                            className="w-4 h-4 object-contain"
                          />
                        </div>
                        <div className="text-sm font-medium">IMG-X</div>
                      </a>
                      <a 
                        href="https://vinci.lkml.live" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center px-3 py-2 text-gray-700 hover:bg-purple-50/80 hover:text-purple-600 transition-colors duration-200"
                      >                        <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center mr-2 p-1">
                          <img 
                            src="/images/ICO_VINCI AI .ico" 
                            alt="Vinci" 
                            className="w-4 h-4 object-contain"
                          />
                        </div>
                        <div className="text-sm font-medium">Vinci</div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
              {/* Mode Toggle - Mobile with Enhanced Glass Effect */}
            <div className="flex bg-white/30 backdrop-blur-md rounded-xl p-1 shadow-lg shadow-black/10 border border-white/40">
              <button
                onClick={() => setActiveMode('merge')}
                className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300 ease-out ${
                  activeMode === 'merge' 
                    ? 'bg-white/90 backdrop-blur-sm text-blue-600 shadow-md shadow-blue-500/20 border border-blue-100/60' 
                    : 'text-gray-600 hover:bg-white/40 hover:backdrop-blur-sm'
                }`}
              >
                <span className="flex items-center justify-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  <span>Merge</span>                </span>
              </button>
              
              <button
                onClick={() => setActiveMode('split')}
                className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300 ease-out ${
                  activeMode === 'split' 
                    ? 'bg-white/90 backdrop-blur-sm text-green-600 shadow-md shadow-green-500/20 border border-green-100/60' 
                    : 'text-gray-600 hover:bg-white/40 hover:backdrop-blur-sm'
                }`}
              >
                <span className="flex items-center justify-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <span>Split</span>                </span>
              </button>
              
              <button
                onClick={() => setActiveMode('remove')}
                className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300 ease-out ${
                  activeMode === 'remove' 
                    ? 'bg-white/90 backdrop-blur-sm text-red-600 shadow-md shadow-red-500/20 border border-red-100/60' 
                    : 'text-gray-600 hover:bg-white/40 hover:backdrop-blur-sm'
                }`}
              >
                <span className="flex items-center justify-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Remove</span>
                </span>
              </button>
            </div>
          </div>

          {/* Desktop Layout: Horizontal */}
          <div className="hidden sm:flex items-center justify-between">
            {/* Logo and Title - Desktop */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">                <div className="w-14 h-14 flex items-center justify-center p-2">
                  <img 
                    src="/images/favicon.ico" 
                    alt="PDF-X Logo" 
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    PDF-X
                  </h1>
                  <p className="text-sm text-gray-500">Professional PDF Tools</p>
                </div>
              </div>
            </div>            {/* Mode Toggle - Desktop with Enhanced Glass Effect */}
            <div className="flex-1 flex justify-center">
              <div className="inline-flex bg-white/30 backdrop-blur-md rounded-2xl p-1.5 shadow-lg shadow-black/10 border border-white/40 space-x-8">
                <button
                  onClick={() => setActiveMode('merge')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ease-out ${
                    activeMode === 'merge' 
                      ? 'bg-white/90 backdrop-blur-sm text-blue-600 shadow-lg shadow-blue-500/30 transform scale-105 border border-blue-100/60' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:backdrop-blur-sm'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    <span>Merge</span>                  </span>
                </button>
                
                <button
                  onClick={() => setActiveMode('split')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ease-out ${
                    activeMode === 'split' 
                      ? 'bg-white/90 backdrop-blur-sm text-green-600 shadow-lg shadow-green-500/30 transform scale-105 border border-green-100/60' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:backdrop-blur-sm'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>Split</span>                  </span>
                </button>
                
                <button
                  onClick={() => setActiveMode('remove')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ease-out ${
                    activeMode === 'remove' 
                      ? 'bg-white/90 backdrop-blur-sm text-red-600 shadow-lg shadow-red-500/30 transform scale-105 border border-red-100/60' 
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:backdrop-blur-sm'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Remove</span>
                  </span>
                </button>
              </div>
            </div>            {/* Right side - Navigation and Feature badges - Desktop with Glass Effect */}
            <div className="flex items-center space-x-3">
              {/* Navigation Menu */}
              <div className="relative group">
                <button className="flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-md text-gray-700 hover:text-gray-900 rounded-lg border border-white/30 hover:bg-white/40 transition-all duration-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-sm font-medium">More Tools</span>
                  <svg className="w-4 h-4 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-lg rounded-xl shadow-xl border border-white/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                  <div className="py-2">
                    <a 
                      href="https://imgx.lkml.live" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-green-50/80 hover:text-green-600 transition-colors duration-200"
                    >                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3 p-1">
                        <img 
                          src="/images/ICO_IMG-X.ico" 
                          alt="IMG-X" 
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-medium">IMG-X</div>
                        <div className="text-xs text-gray-500">Image Tools</div>
                      </div>
                    </a>
                    
                    <a 
                      href="https://vinci.lkml.live" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center px-4 py-3 text-gray-700 hover:bg-purple-50/80 hover:text-purple-600 transition-colors duration-200"
                    >                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3 p-1">
                        <img 
                          src="/images/ICO_VINCI AI .ico" 
                          alt="Vinci" 
                          className="w-6 h-6 object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-medium">Vinci</div>
                        <div className="text-xs text-gray-500">AI Art Tools</div>
                      </div>                    </a>
                  </div>
                </div></div>
            </div>
          </div>
        </div>
      </header>      {/* Mobile-Optimized Content Area */}
      <main className="w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {/* Hero Section with Mode Description */}
        <div className="w-full mb-6 sm:mb-8">
          <div className="text-center max-w-4xl mx-auto">
            {activeMode === 'merge' ? (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-2xl sm:text-4xl font-bold text-gray-800">
                  Merge Multiple PDFs
                </h2>
                <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
                  Combine multiple PDF files into a single document. Simply upload your files, arrange them in the desired order, and download the merged result.
                </p>
                {/* Mobile: Stacked features */}
                <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center space-y-2 sm:space-y-0 sm:space-x-8 mt-4 sm:mt-6">
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base">No file limit</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base">Drag & Drop reordering</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base">High quality output</span>
                  </div>
                </div>
              </div>
            ) : activeMode === 'split' ? (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-2xl sm:text-4xl font-bold text-gray-800">
                  Split PDF into Pages
                </h2>
                <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
                  Extract specific pages from your PDF documents. Select individual pages or page ranges to create new PDF files with exactly the content you need.
                </p>
                {/* Mobile: Stacked features */}
                <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center space-y-2 sm:space-y-0 sm:space-x-8 mt-4 sm:mt-6">
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base">Visual page selection</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base">Page range support</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base">Preview thumbnails</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <h2 className="text-2xl sm:text-4xl font-bold text-gray-800">
                  Remove Pages from PDF
                </h2>
                <p className="text-base sm:text-xl text-gray-600 leading-relaxed">
                  Delete unwanted pages from your PDF documents. Select specific pages or page ranges to remove them and create a cleaner, more focused document.
                </p>
                {/* Mobile: Stacked features */}
                <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center space-y-2 sm:space-y-0 sm:space-x-8 mt-4 sm:mt-6">
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base">Visual page selection</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base">Page range support</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm sm:text-base">Preview thumbnails</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>        {/* Content - Full Width */}
        <div className="w-full flex-1">
          {/* Memory Warning - Show at top of content area */}
          <div className="p-4 pb-0">
            <MemoryWarning showDetails={false} />
          </div>
          
          <Suspense fallback={<LoadingSpinner />}>
            {activeMode === 'merge' && <PDFMerger key="merger" />}
            {activeMode === 'split' && <PDFSplitter key="splitter" />}
            {activeMode === 'remove' && <PDFRemover key="remover" />}          </Suspense>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PDFToolbox;
