/**
 * File validation utilities for PDF-X application
 * Provides comprehensive validation for file uploads including size, type, and security checks
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
  checkMagicNumbers?: boolean;
}

// Magic numbers (file signatures) for PDF files
const PDF_MAGIC_NUMBERS = [
  [0x25, 0x50, 0x44, 0x46], // %PDF
];

// Common suspicious file patterns to avoid
const SUSPICIOUS_PATTERNS = [
  /\.exe$/i,
  /\.scr$/i,
  /\.bat$/i,
  /\.cmd$/i,
  /\.com$/i,
  /\.pif$/i,
  /\.vbs$/i,
  /\.js$/i,
  /\.jar$/i,
];

/**
 * Validates a file against the specified criteria
 */
export async function validateFile(
  file: File,
  options: FileValidationOptions = {}
): Promise<FileValidationResult> {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB default
    allowedTypes = ['application/pdf'],
    allowedExtensions = ['.pdf'],
    checkMagicNumbers = true,
  } = options;

  const warnings: string[] = [];

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of ${formatFileSize(maxSize)}.`,
    };
  }

  // Check for empty files
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'The selected file is empty.',
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}.`,
    };
  }

  // Check file extension
  const fileExtension = getFileExtension(file.name);
  if (!allowedExtensions.some(ext => ext.toLowerCase() === fileExtension.toLowerCase())) {
    return {
      isValid: false,
      error: `File extension "${fileExtension}" is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}.`,
    };
  }

  // Check for suspicious file patterns
  if (SUSPICIOUS_PATTERNS.some(pattern => pattern.test(file.name))) {
    return {
      isValid: false,
      error: 'The file name contains potentially dangerous patterns.',
    };
  }

  // Check magic numbers for PDF files
  if (checkMagicNumbers && allowedTypes.includes('application/pdf')) {
    const magicNumberValid = await validatePDFMagicNumber(file);
    if (!magicNumberValid) {
      return {
        isValid: false,
        error: 'The file does not appear to be a valid PDF document.',
      };
    }
  }

  // Add warnings for large files
  if (file.size > 50 * 1024 * 1024) {
    warnings.push(`Large file detected (${formatFileSize(file.size)}). Processing may take longer.`);
  }

  // Add warning for unusual file names
  if (file.name.length > 100) {
    warnings.push('File name is unusually long.');
  }

  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validates multiple files
 */
export async function validateFiles(
  files: FileList | File[],
  options: FileValidationOptions = {}
): Promise<{ valid: File[]; invalid: Array<{ file: File; error: string }> }> {
  const fileArray = Array.from(files);
  const valid: File[] = [];
  const invalid: Array<{ file: File; error: string }> = [];

  for (const file of fileArray) {
    const result = await validateFile(file, options);
    if (result.isValid) {
      valid.push(file);
    } else {
      invalid.push({ file, error: result.error || 'Unknown validation error' });
    }
  }

  return { valid, invalid };
}

/**
 * Validates PDF magic number by reading the first few bytes
 */
async function validatePDFMagicNumber(file: File): Promise<boolean> {
  try {
    const slice = file.slice(0, 4);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    return PDF_MAGIC_NUMBERS.some(magicNumber =>
      magicNumber.every((byte, index) => bytes[index] === byte)
    );
  } catch {
    // If we can't read the file, assume it's invalid
    return false;
  }
}

/**
 * Gets the file extension from a filename
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sanitizes filename to prevent path traversal and other issues
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric chars except . _ -
    .replace(/^\.+/, '') // Remove leading dots
    .substring(0, 100); // Limit length
}

/**
 * Checks if the browser supports the File API and required features
 */
export function checkBrowserSupport(): { supported: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!window.File) missing.push('File API');
  if (!window.FileReader) missing.push('FileReader API');
  if (!window.FileList) missing.push('FileList API');
  if (!window.Blob) missing.push('Blob API');

  return {
    supported: missing.length === 0,
    missing,
  };
}
