import React, { useRef } from 'react';

interface UploadCardProps {
  isLoading: boolean;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  multiple?: boolean;
  title: string;
  subtitle: string;
  description: string;
  loadingText?: string;
  loadingSubtext?: string;
  maxFileSize?: string;
  supportedFormats?: string;
  className?: string;
}

const UploadCard: React.FC<UploadCardProps> = ({
  isLoading,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  accept = ".pdf,application/pdf",
  multiple = false,
  title,
  subtitle,
  description,
  loadingText = "Processing files...",
  loadingSubtext = "Please wait while we analyze your files",
  maxFileSize = "100MB",
  supportedFormats = "PDF files only",
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadId = `upload-${Math.random().toString(36).substr(2, 9)}`;

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Upload Card */}
      <label
        htmlFor={uploadId}
        className={`
          relative block cursor-pointer group
          border-2 border-dashed rounded-3xl p-8 text-center 
          transition-all duration-500 ease-out
          ${isDragOver 
            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-100 scale-[1.02] shadow-2xl shadow-blue-500/20' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gradient-to-br hover:from-gray-50 hover:to-blue-50/30 hover:scale-[1.01] hover:shadow-xl'
          }
          ${isLoading ? 'pointer-events-none' : ''}
        `}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl transform rotate-1"></div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {isLoading ? (
            <div className="flex flex-col items-center animate-in fade-in duration-500">
              {/* Loading Animation */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-gray-200"></div>
                <div className="w-20 h-20 rounded-full border-4 border-blue-500 border-t-transparent animate-spin absolute top-0 left-0"></div>
                <div className="w-16 h-16 rounded-full bg-blue-100 absolute top-2 left-2 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-blue-600 mb-2">{loadingText}</h3>
              <p className="text-gray-500">{loadingSubtext}</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Icon with Floating Animation */}
              <div className="relative mb-8">
                <div className={`
                  inline-flex items-center justify-center w-24 h-24 
                  bg-gradient-to-br from-blue-500 to-indigo-600 
                  rounded-2xl shadow-lg transform transition-all duration-500
                  ${isDragOver ? 'scale-110 rotate-3' : 'group-hover:scale-105 group-hover:-rotate-1'}
                `}>
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                {/* Floating Particles */}
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce"></div>
                <div className="absolute -bottom-1 -left-2 w-3 h-3 bg-green-400 rounded-full animate-bounce delay-300"></div>
                <div className="absolute top-1/2 -right-4 w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-700"></div>
              </div>

              {/* Text Content */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                    {title}
                  </h3>
                  <p className="text-lg text-blue-600 font-semibold mb-3">
                    {subtitle}
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    {description}
                  </p>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={handleClick}
                  className={`
                    inline-flex items-center px-6 py-3 
                    bg-gradient-to-r from-blue-600 to-indigo-600 
                    text-white font-semibold rounded-xl
                    transform transition-all duration-300
                    hover:from-blue-700 hover:to-indigo-700 
                    hover:scale-105 hover:shadow-lg
                    focus:outline-none focus:ring-4 focus:ring-blue-300
                    ${isDragOver ? 'scale-105 shadow-lg' : ''}
                  `}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose Files
                </button>
              </div>

              {/* File Info */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {supportedFormats}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Max {maxFileSize}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Drag & drop enabled
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          id={uploadId}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={onFileChange}
          className="hidden"
        />

        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 rounded-3xl bg-blue-500/10 border-2 border-blue-500 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-500 rounded-full flex items-center justify-center animate-bounce">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-blue-600 font-bold text-xl">Drop files here!</p>
            </div>
          </div>
        )}
      </label>
    </div>
  );
};

export default UploadCard;
