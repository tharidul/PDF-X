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
  const uploadId = `upload-${Math.random().toString(36).substr(2, 9)}`;

  // Theme configurations
  const themeConfig = {
    blue: {
      primary: 'blue',
      secondary: 'cyan',
      accent: 'purple',
      gradientFrom: 'from-blue-50/50',
      gradientTo: 'to-purple-50/20',
      shadowColor: 'shadow-blue-500/20',
      bgGradient: 'from-white/20 via-blue-50/30 to-purple-50/20',
      iconBg: 'from-blue-500/20 to-purple-500/20',
      iconColor: 'text-blue-600',
      titleColor: 'text-gray-900',
      subtitleColor: 'text-blue-600',
      borderHover: 'border-blue-500/70',
      dropzoneHover: 'bg-white/50',
      dragOverBorder: 'border-blue-500/80',
      dragOverBg: 'from-blue-100/60 to-cyan-100/40',
      dragOverShadow: 'shadow-blue-500/20',
      uploadButtonBg: 'from-white/50 to-blue-50/80',
      uploadButtonHover: 'group-hover:shadow-blue-500/30',
      infoTextColor: 'text-blue-700',
      dragOverIconBg: 'from-blue-500 to-blue-600',
      ballGradient1: 'from-blue-400/30 to-cyan-300/20',
      ballGradient2: 'from-purple-400/20 to-blue-400/30'
    },
    green: {
      primary: 'green',
      secondary: 'emerald',
      accent: 'teal',
      gradientFrom: 'from-green-50/50',
      gradientTo: 'to-teal-50/20',
      shadowColor: 'shadow-green-500/20',
      bgGradient: 'from-white/20 via-green-50/30 to-teal-50/20',
      iconBg: 'from-green-500/20 to-teal-500/20',
      iconColor: 'text-green-600',
      titleColor: 'text-gray-900',
      subtitleColor: 'text-green-600',
      borderHover: 'border-green-500/70',
      dropzoneHover: 'bg-white/50',
      dragOverBorder: 'border-green-500/80',
      dragOverBg: 'from-green-100/60 to-emerald-100/40',
      dragOverShadow: 'shadow-green-500/20',
      uploadButtonBg: 'from-white/50 to-green-50/80',
      uploadButtonHover: 'group-hover:shadow-green-500/30',
      infoTextColor: 'text-green-700',
      dragOverIconBg: 'from-green-500 to-green-600',
      ballGradient1: 'from-green-400/30 to-emerald-300/20',
      ballGradient2: 'from-teal-400/20 to-green-400/30'
    },
    red: {
      primary: 'red',
      secondary: 'rose',
      accent: 'pink',
      gradientFrom: 'from-red-50/50',
      gradientTo: 'to-pink-50/20',
      shadowColor: 'shadow-red-500/20',
      bgGradient: 'from-white/20 via-red-50/30 to-pink-50/20',
      iconBg: 'from-red-500/20 to-pink-500/20',
      iconColor: 'text-red-600',
      titleColor: 'text-gray-900',
      subtitleColor: 'text-red-600',
      borderHover: 'border-red-500/70',
      dropzoneHover: 'bg-white/50',
      dragOverBorder: 'border-red-500/80',
      dragOverBg: 'from-red-100/60 to-rose-100/40',
      dragOverShadow: 'shadow-red-500/20',
      uploadButtonBg: 'from-white/50 to-red-50/80',
      uploadButtonHover: 'group-hover:shadow-red-500/30',
      infoTextColor: 'text-red-700',
      dragOverIconBg: 'from-red-500 to-red-600',
      ballGradient1: 'from-red-400/30 to-rose-300/20',
      ballGradient2: 'from-pink-400/20 to-red-400/30'
    }
  };

  const currentTheme = themeConfig[theme];

  const handleClick = () => {
    fileInputRef.current?.click();
  };  return (
    <div className={`group relative w-full max-w-md mx-auto h-[450px] ${className}`}>
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentTheme.bgGradient} backdrop-blur-xl shadow-2xl border border-white/30 transition-all duration-300 hover:-translate-y-2 hover:${currentTheme.shadowColor} h-full`}>
        {/* Vibrant Gradient Backgrounds */}
        <div className={`absolute -left-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br ${currentTheme.ballGradient1} blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-80`}></div>
        <div className={`absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-gradient-to-br ${currentTheme.ballGradient2} blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-80`}></div>

        <div className="relative p-5 h-full flex flex-col">          {/* Header Section - Enhanced Glass Theme */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-semibold ${currentTheme.titleColor}`}>{title}</h3>
              <p className={`text-sm ${currentTheme.subtitleColor} font-medium`}>{subtitle}</p>
            </div>
          </div>          {/* Upload Section - Enhanced Glass Theme */}
          <div className="group/dropzone mt-5 flex-1 flex flex-col justify-center"><div
              className={`relative rounded-xl border-2 border-dashed bg-white/40 backdrop-blur-md p-8 transition-all duration-300 ${
                isDragOver 
                  ? `${currentTheme.dragOverBorder} bg-gradient-to-br ${currentTheme.dragOverBg} shadow-lg ${currentTheme.dragOverShadow}` 
                  : `border-${currentTheme.primary}-300/60 group-hover/dropzone:${currentTheme.borderHover} group-hover/dropzone:${currentTheme.dropzoneHover}`
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

              <div className="space-y-6 text-center">
                {!isLoading && (                  <div className="relative w-full group" onClick={handleClick}>
                    <div className={`relative z-40 cursor-pointer group-hover:translate-x-6 ${currentTheme.uploadButtonHover} group-hover:-translate-y-6 transition-all duration-500 bg-gradient-to-br ${currentTheme.uploadButtonBg} backdrop-blur-lg border-2 border-white/60 flex items-center justify-center h-24 w-24 mx-auto rounded-xl shadow-lg`}>                      <svg
                        className={`h-6 w-6 ${currentTheme.iconColor} drop-shadow-sm`}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeWidth="2"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 24 24"
                        height="24"
                        width="24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"></path>
                        <path d="M7 9l5 -5l5 5"></path>
                        <path d="M12 4l0 12"></path>
                      </svg>
                    </div>
                    <div className={`absolute border-2 opacity-0 group-hover:opacity-90 transition-all duration-300 border-dashed border-${currentTheme.primary}-500 inset-0 z-30 bg-gradient-to-br from-${currentTheme.primary}-400/10 to-${currentTheme.secondary}-400/10 backdrop-blur-sm flex items-center justify-center h-24 w-24 mx-auto rounded-xl shadow-inner`}></div>
                  </div>
                )}                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {isLoading ? "Processing files..." : "Drop your files here or click above"}
                  </p>
                  <p className={`text-sm ${currentTheme.infoTextColor} font-medium`} id={`${uploadId}-desc`}>
                    Support files: {supportedFormats}
                  </p>
                  <p className="text-xs text-gray-600 font-medium">Max file size: {maxFileSize}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      {isDragOver && (
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-${currentTheme.primary}-500/20 to-${currentTheme.secondary}-400/20 backdrop-blur-md border-2 border-${currentTheme.primary}-400 flex items-center justify-center z-50 shadow-2xl pointer-events-none`}>
          <div className="text-center pointer-events-none">
            <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${currentTheme.dragOverIconBg} rounded-full flex items-center justify-center animate-bounce shadow-lg`}>
              <svg className="w-8 h-8 text-white drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className={`${currentTheme.infoTextColor} font-bold text-xl drop-shadow-sm`}>Drop files here!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadCard;
