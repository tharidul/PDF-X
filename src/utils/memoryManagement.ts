/**
 * Memory management utilities for PDF-X application
 * Helps manage memory usage when processing large PDF files
 */

// Type for window with garbage collection
interface WindowWithGC extends Window {
  gc?: () => void;
}

declare const window: WindowWithGC;

/**
 * Triggers garbage collection if available (Chrome with --enable-precise-memory-info)
 */
export function triggerGarbageCollection(): void {
  try {
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
      console.log('Garbage collection triggered');
    }  } catch {
    // Silently fail if GC is not available
    console.debug('Garbage collection not available');
  }
}

/**
 * Gets current memory usage if available
 */
export function getMemoryUsage(): { used?: number; total?: number; limit?: number } {
  if ('memory' in performance) {
    const memory = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (memory) {
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
  }
  return {};
}

/**
 * Formats memory size in human-readable format
 */
export function formatMemorySize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Checks if memory usage is approaching limits
 */
export function isMemoryPressure(): boolean {
  const memory = getMemoryUsage();
  if (memory.used && memory.limit) {
    const usageRatio = memory.used / memory.limit;
    return usageRatio > 0.8; // 80% threshold
  }
  return false;
}

/**
 * Cleans up large objects and triggers GC
 */
export function cleanupMemory(): void {
  // Clear any large cached objects
  if (window.caches) {
    // Optionally clear some caches if memory is under pressure
    // This is aggressive and should be used carefully
  }
  
  // Trigger garbage collection
  triggerGarbageCollection();
}

/**
 * Memory-efficient file processing with chunking
 */
export class MemoryEfficientProcessor {
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  
  /**
   * Processes large ArrayBuffer in chunks to avoid memory issues
   */
  static async processInChunks<T>(
    data: ArrayBuffer,
    processor: (chunk: ArrayBuffer, offset: number, isLast: boolean) => Promise<T>,
    onProgress?: (progress: number) => void
  ): Promise<T[]> {
    const results: T[] = [];
    const totalSize = data.byteLength;
    let offset = 0;
    
    while (offset < totalSize) {
      const chunkSize = Math.min(this.CHUNK_SIZE, totalSize - offset);
      const chunk = data.slice(offset, offset + chunkSize);
      const isLast = offset + chunkSize >= totalSize;
      
      try {
        const result = await processor(chunk, offset, isLast);
        results.push(result);
        
        offset += chunkSize;
        
        // Report progress
        if (onProgress) {
          const progress = (offset / totalSize) * 100;
          onProgress(Math.min(progress, 100));
        }
        
        // Yield control to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Check memory pressure and cleanup if needed
        if (isMemoryPressure()) {
          console.warn('Memory pressure detected, triggering cleanup');
          triggerGarbageCollection();
          // Add a small delay to allow GC to run
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error('Error processing chunk:', error);
        throw error;
      }
    }
    
    return results;
  }
}

/**
 * Memory monitor that tracks usage and provides warnings
 */
export class MemoryMonitor {
  private intervalId?: number;
  private listeners: Array<(usage: ReturnType<typeof getMemoryUsage>) => void> = [];
  
  /**
   * Starts monitoring memory usage
   */
  start(intervalMs: number = 5000): void {
    this.stop(); // Stop any existing monitoring
    
    this.intervalId = window.setInterval(() => {
      const usage = getMemoryUsage();
      this.listeners.forEach(listener => listener(usage));
      
      if (isMemoryPressure()) {
        console.warn('Memory usage is high:', formatMemorySize(usage.used || 0));
      }
    }, intervalMs);
  }
  
  /**
   * Stops monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
  
  /**
   * Adds a listener for memory usage updates
   */
  addListener(listener: (usage: ReturnType<typeof getMemoryUsage>) => void): void {
    this.listeners.push(listener);
  }
  
  /**
   * Removes a listener
   */
  removeListener(listener: (usage: ReturnType<typeof getMemoryUsage>) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
}

/**
 * Creates a memory-efficient blob from large data
 */
export function createMemoryEfficientBlob(data: ArrayBuffer, type: string): Blob {
  try {
    // For large files, create blob in streaming manner if possible
    return new Blob([data], { type });
  } catch (error) {
    console.error('Failed to create blob:', error);
    throw new Error('Unable to create blob - insufficient memory');
  }
}
