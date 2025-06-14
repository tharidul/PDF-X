# PDF-X - PDF Tools

A modern, client-side PDF toolkit built with React, TypeScript, and Tailwind CSS. Merge multiple PDF files or split PDFs into separate documents - all without uploading to any server.

## Features

### PDF Merging
- **Multiple PDF Upload**: Upload multiple PDF files at once
- **Drag & Drop Support**: Easy file upload with drag and drop interface
- **File Reordering**: Change the order of PDFs before merging using arrow buttons
- **Real-time Preview**: See all uploaded files with file sizes and page counts
- **Automatic Download**: Merged PDF downloads automatically with a timestamped filename

### PDF Splitting
- **Page Range Selection**: Extract specific pages using flexible range syntax
- **Smart Validation**: Validates page numbers against actual PDF page count
- **Multiple Range Support**: Extract non-consecutive pages (e.g., "1-3, 5, 7-10")
- **Original Filename Preservation**: Split PDFs maintain original filename with page range suffix

### Universal Features
- **Client-side Processing**: All PDF processing happens in your browser - no server required
- **Error Handling**: Comprehensive error handling for invalid files and operations
- **Loading States**: Visual feedback during processing
- **Responsive Design**: Works on desktop and mobile devices
- **Mode Switching**: Easy toggle between Merge and Split modes

## How to Use

### Merging PDFs
1. **Switch to Merge Mode**: Click the "Merge" button in the top-right toggle
2. **Upload PDFs**: Click the upload area or drag and drop multiple PDF files
3. **Reorder Files**: Use the up/down arrow buttons to change the merge order
4. **Remove Files**: Click the trash icon to remove unwanted files
5. **Merge**: Click the "Merge PDFs" button to combine all files
6. **Download**: The merged PDF will automatically download to your device

### Splitting PDFs
1. **Switch to Split Mode**: Click the "Split" button in the top-right toggle
2. **Upload PDF**: Click the upload area or drag and drop a single PDF file
3. **Select Pages**: Click the "Split" button next to the uploaded file
4. **Enter Page Range**: Specify pages using formats like:
   - `1-3` for pages 1 to 3
   - `1, 5, 7-10` for pages 1, 5, and 7 to 10
   - `2, 4, 6` for individual pages 2, 4, and 6
5. **Extract**: Click "Extract Pages" to create a new PDF with selected pages
6. **Download**: The split PDF will automatically download with a descriptive filename

## Technologies Used

- **React 19** with TypeScript
- **pdf-lib** for PDF manipulation (merging/splitting)
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
