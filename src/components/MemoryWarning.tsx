import React from 'react';
import { useMemoryMonitor } from '../hooks/useMemoryMonitor';

interface MemoryWarningProps {
  showDetails?: boolean;
  className?: string;
}

const MemoryWarning: React.FC<MemoryWarningProps> = ({ 
  showDetails = false, 
  className = "" 
}) => {
  const memoryInfo = useMemoryMonitor(3000); // Check every 3 seconds

  // Only show warning if memory pressure is detected and memory API is available
  if (!memoryInfo.isUnderPressure || !memoryInfo.used) {
    return null;
  }

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-start">
        <svg 
          className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
        <div className="flex-1">
          <div className="text-sm font-medium text-yellow-800">
            High Memory Usage Detected
          </div>
          <div className="text-xs text-yellow-700 mt-1">
            Your system is using {memoryInfo.usagePercentage}% of available memory. 
            Consider closing other tabs or applications for better performance.
          </div>
          {showDetails && memoryInfo.formattedUsed && memoryInfo.formattedLimit && (
            <div className="text-xs text-yellow-600 mt-2">
              Using {memoryInfo.formattedUsed} of {memoryInfo.formattedLimit}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryWarning;
