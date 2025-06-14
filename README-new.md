# PDF-X - PDF Merger Tool

A modern, client-side PDF merger built with React, TypeScript, and Tailwind CSS. Merge multiple PDF files into a single document without uploading to any server.

## Features

- **Multiple PDF Upload**: Upload multiple PDF files at once
- **Drag & Drop Support**: Easy file upload with drag and drop interface
- **File Reordering**: Change the order of PDFs before merging using arrow buttons
- **Real-time Preview**: See all uploaded files with file sizes and order numbers
- **Client-side Processing**: All PDF processing happens in your browser - no server required
- **Download Management**: Automatically download the merged PDF with a timestamped filename
- **Error Handling**: Comprehensive error handling for invalid files and merge failures
- **Loading States**: Visual feedback during the merge process
- **Responsive Design**: Works on desktop and mobile devices

## How to Use

1. **Upload PDFs**: Click the upload area or drag and drop PDF files
2. **Reorder Files**: Use the up/down arrow buttons to change the merge order
3. **Remove Files**: Click the trash icon to remove unwanted files
4. **Merge**: Click the "Merge PDFs" button to combine all files
5. **Download**: The merged PDF will automatically download to your device

## Technologies Used

- **React 19** with TypeScript
- **pdf-lib** for PDF manipulation
- **Tailwind CSS** for styling
- **Vite** for build tooling

## Development

### Prerequisites
- Node.js 16 or higher
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Security & Privacy

- All PDF processing happens locally in your browser
- No files are uploaded to any server
- Your documents remain completely private
- No internet connection required for merging (after initial page load)

## Browser Compatibility

This application works in all modern browsers that support:
- ES6+ JavaScript features
- File API
- Blob and URL APIs
- Canvas API (used by pdf-lib)

## License

This project is open source and available under the MIT License.
