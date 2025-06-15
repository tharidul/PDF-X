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
  loadingText?: string;
  loadingSubtext?: string;
  maxFileSize?: string;
  supportedFormats?: string;
  className?: string;
  theme?: 'blue' | 'green' | 'red';
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
  maxFileSize = "10MB",
  supportedFormats = "PDF, DOC, DOCX, JPG, PNG",
  className = "",
  theme = 'blue'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadId = `upload-${Math.random().toString(36).substr(2, 9)}`;  // Theme configurations - Dark color schemes for better visual appeal
  const themeConfig = {
    blue: {
      primary: 'blue',
      secondary: 'cyan',
      accent: 'purple',
      shadowColor: 'shadow-blue-900/40',
      bgColor: 'bg-gradient-to-br from-slate-800 to-blue-900',
      iconBg: 'bg-blue-800',
      iconColor: 'text-white',
      titleColor: 'text-white',
      subtitleColor: 'text-blue-200',
      borderHover: 'border-blue-600',
      dropzoneHover: 'bg-blue-900/50',
      dragOverBorder: 'border-blue-500',
      dragOverBg: 'bg-blue-800/70',
      dragOverShadow: 'shadow-blue-700/50',
      uploadButtonBg: 'bg-blue-700 hover:bg-blue-600',
      uploadButtonHover: 'group-hover:shadow-blue-600/50',
      infoTextColor: 'text-blue-600',
      dragOverIconBg: 'bg-blue-600',
      ballColor1: 'bg-slate-700/60',
      ballColor2: 'bg-blue-800/40'
    },
    green: {
      primary: 'green',
      secondary: 'emerald',
      accent: 'teal',
      shadowColor: 'shadow-green-900/40',
      bgColor: 'bg-gradient-to-br from-slate-800 to-green-900',
      iconBg: 'bg-green-800',
      iconColor: 'text-white',
      titleColor: 'text-white',
      subtitleColor: 'text-green-200',
      borderHover: 'border-green-600',
      dropzoneHover: 'bg-green-900/50',
      dragOverBorder: 'border-green-500',
      dragOverBg: 'bg-green-800/70',
      dragOverShadow: 'shadow-green-700/50',
      uploadButtonBg: 'bg-green-700 hover:bg-green-600',
      uploadButtonHover: 'group-hover:shadow-green-600/50',
      infoTextColor: 'text-green-600',
      dragOverIconBg: 'bg-green-600',
      ballColor1: 'bg-slate-700/60',
      ballColor2: 'bg-green-800/40'
    },
    red: {
      primary: 'red',
      secondary: 'rose',
      accent: 'pink',
      shadowColor: 'shadow-red-900/40',
      bgColor: 'bg-gradient-to-br from-slate-800 to-red-900',
      iconBg: 'bg-red-800',
      iconColor: 'text-white',
      titleColor: 'text-white',
      subtitleColor: 'text-red-200',
      borderHover: 'border-red-600',
      dropzoneHover: 'bg-red-900/50',
      dragOverBorder: 'border-red-500',
      dragOverBg: 'bg-red-800/70',
      dragOverShadow: 'shadow-red-700/50',
      uploadButtonBg: 'bg-red-700 hover:bg-red-600',
      uploadButtonHover: 'group-hover:shadow-red-600/50',
      infoTextColor: 'text-red-600',
      dragOverIconBg: 'bg-red-600',
      ballColor1: 'bg-slate-700/60',
      ballColor2: 'bg-red-800/40'
    }
  };

  const currentTheme = themeConfig[theme];

  const handleClick = () => {
    fileInputRef.current?.click();
  };  return (
    <div className={`group relative w-full max-w-md mx-auto h-[450px] ${className}`}>
      <div className={`relative overflow-hidden rounded-2xl ${currentTheme.bgColor} shadow-xl border border-white/20 transition-all duration-300 hover:-translate-y-2 hover:${currentTheme.shadowColor} h-full`}>        {/* Subtle decorative elements */}
        <div className={`absolute -left-8 -top-8 h-24 w-24 rounded-full ${currentTheme.ballColor1} blur-xl transition-all duration-500 group-hover:scale-125`}></div>
        <div className={`absolute -right-8 -bottom-8 h-24 w-24 rounded-full ${currentTheme.ballColor2} blur-xl transition-all duration-500 group-hover:scale-125`}></div>
        <div className={`absolute top-4 right-4 h-16 w-16 rounded-full ${currentTheme.iconBg} opacity-10 blur-lg`}></div>

        <div className="relative p-5 h-full flex flex-col">          {/* Header Section - Enhanced Glass Theme */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-semibold ${currentTheme.titleColor}`}>{title}</h3>
              <p className={`text-sm ${currentTheme.subtitleColor} font-medium`}>{subtitle}</p>
            </div>
          </div>          {/* Upload Section - Enhanced Glass Theme */}
          <div className="group/dropzone mt-5 flex-1 flex flex-col justify-center">            <div
              className={`relative rounded-xl border-2 border-dashed border-white/30 bg-black/20 backdrop-blur-sm p-8 transition-all duration-300 ${
                isDragOver 
                  ? `${currentTheme.dragOverBorder} ${currentTheme.dragOverBg} shadow-lg ${currentTheme.dragOverShadow}` 
                  : `hover:border-white/50 hover:bg-black/30`
              }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              role="button"
              tabIndex={isLoading ? -1 : 0}
              aria-label={isLoading ? "Processing files..." : `Click to upload ${supportedFormats} files or drag and drop`}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isLoading) {
                  e.preventDefault();
                  handleClick();
                }
              }}
            ><input
                ref={fileInputRef}
                id={uploadId}
                type="file"
                className="absolute inset-0 z-50 h-full w-full cursor-pointer opacity-0"
                multiple={multiple}
                accept={accept}
                onChange={onFileChange}
                aria-label={`Upload ${supportedFormats} files, maximum size ${maxFileSize}`}
                aria-describedby={`${uploadId}-desc`}
              />

              <div className="space-y-6 text-center">                {!isLoading && (                  <div className="relative w-full group" onClick={handleClick}>
                    <div className={`relative z-40 cursor-pointer group-hover:scale-105 transition-all duration-300 ${currentTheme.uploadButtonBg} border-2 border-white/30 flex items-center justify-center h-20 w-20 mx-auto rounded-xl shadow-lg hover:shadow-xl`}>
                      <svg
                        className={`h-6 w-6 ${currentTheme.iconColor} transform group-hover:scale-110 transition-transform duration-300`}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"></path>
                        <path d="M7 9l5 -5l5 5"></path>
                        <path d="M12 4l0 12"></path>
                      </svg>
                    </div>
                  </div>
                )}                <div className="space-y-3">
                  <p className="text-sm font-semibold text-white drop-shadow-sm">
                    {isLoading ? "Processing files..." : "Drop your files here or click above"}
                  </p>
                  <p className={`text-xs ${currentTheme.subtitleColor} font-medium`} id={`${uploadId}-desc`}>
                    Support files: {supportedFormats}
                  </p>
                  <p className="text-xs text-white/80 font-medium">Max file size: {maxFileSize}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      {/* Drag Overlay - Clean and elegant */}
      {isDragOver && (
        <div className={`absolute inset-0 rounded-2xl bg-white/90 border-4 border-dashed border-${currentTheme.primary}-500 flex items-center justify-center z-50 shadow-xl pointer-events-none backdrop-blur-sm`}>
          <div className="text-center pointer-events-none">
            <div className={`w-16 h-16 mx-auto mb-4 ${currentTheme.dragOverIconBg} rounded-full flex items-center justify-center animate-bounce shadow-lg`}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className={`${currentTheme.infoTextColor} font-bold text-xl`}>Drop files here!</p>
            <p className={`${currentTheme.infoTextColor} font-medium text-sm mt-1`}>Release to upload</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadCard;
