
function Footer() {
  return (
    <footer className="w-full py-4 bg-gradient-to-r from-gray-900 via-black to-gray-900 backdrop-blur-md border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/images/branding.webp"
              alt="LKML Logo"
              className="h-4 w-auto object-contain"
            />
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap justify-center sm:justify-end">
            <a
              href="https://lkml.live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-cyan-300 transition-colors duration-300"
            >
              Portfolio
            </a>
            <span className="text-gray-600">•</span>
            <a
              href="https://vinci.lkml.live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-cyan-300 transition-colors duration-300"
            >
              Vinci
            </a>
            <span className="text-gray-600">•</span>
            <a
              href="https://blog.lkml.live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-cyan-300 transition-colors duration-300"
            >
              Blog
            </a>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500">PDF-X Professional PDF Tool</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
