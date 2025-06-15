
function Footer() {
  return (
    <footer className="w-full py-3 bg-gradient-to-r from-gray-900 via-black to-gray-900 backdrop-blur-md border-t border-gray-800/50 mt-auto flex-shrink-0 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/5 via-transparent to-cyan-900/5"></div>
      
      <div className="container mx-auto px-4 relative z-10">        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 group">
            <img
              src="/images/branding.webp"
              alt="LKML Logo"
              className="h-4 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
            />
            <p className="text-gray-400 text-xs font-medium tracking-wide">
              &copy; {new Date().getFullYear()}
            </p>
          </div>
          
          <div className="flex items-center justify-center">
            <p className="text-gray-500 text-xs">
              Developed by{" "}
              <a
                href="https://lkml.live"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 transition-all duration-300 font-semibold hover:drop-shadow-sm"
              >
                LKML.LIVE
              </a>
            </p>
          </div><div className="flex items-center gap-2 text-sm flex-wrap justify-center sm:justify-end">
            <a
              href="https://lkml.live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-cyan-300 transition-all duration-300 hover:scale-105 font-medium"
            >
              Portfolio
            </a>
            <span className="text-gray-600/70 text-xs">•</span>
            <a
              href="https://vinci.lkml.live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-cyan-300 transition-all duration-300 hover:scale-105 font-medium"
            >
              Vinci AI
            </a>
            <span className="text-gray-600/70 text-xs">•</span>
            <a
              href="https://blog.lkml.live"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-cyan-300 transition-all duration-300 hover:scale-105 font-medium"
            >
              Blog
            </a>
            <span className="text-gray-600/70 text-xs">•</span>
            <span className="text-gray-500 text-xs font-light tracking-wide">Professional PDF Tools</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
