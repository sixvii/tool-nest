function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-100 py-6 sm:py-8 px-4 sm:px-6 shadow-sm mt-12">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 pb-6 sm:pb-8">
          {/* Brand Section */}
          <div className="col-span-2 sm:col-span-1 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                TN
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Tool Nest
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Your one-stop solution for all file conversion and processing tools.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-slate-900">Quick Links</p>
            <ul className="space-y-2">
              <li>
                <a
                  href="/"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/tools"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                >
                  All Tools
                </a>
              </li>
              <li>
                <a
                  href="/#featured"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                >
                  Popular Tools
                </a>
              </li>
              <li>
                <a
                  href="/#categories"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                >
                  Categories
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-slate-900">Resources</p>
            <ul className="space-y-2">
              <li>
                <a
                  href="/blog"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                >
                  Blog
                </a>
              </li>
              <li>
                <a
                  href="/faq"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="/support"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-xs sm:text-sm font-semibold text-slate-900">Contact</p>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:hello@toolnest.com"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200 break-all"
                >
                  hello@toolnest.com
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="/feedback"
                  className="text-xs sm:text-sm text-slate-600 hover:text-blue-600 transition-colors duration-200"
                >
                  Feedback
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Copyright */}
            <p className="text-[10px] sm:text-xs text-slate-500 text-center sm:text-left">
              © {currentYear} Tool Nest. All rights reserved.
            </p>

            {/* Legal Links */}
            <div className="flex items-center gap-3 sm:gap-6 text-center flex-wrap justify-center sm:justify-end">
              <a
                href="/terms"
                className="text-[10px] sm:text-xs text-slate-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap"
              >
                Terms of Service
              </a>
              <span className="text-slate-300 hidden sm:block">•</span>
              <a
                href="/privacy"
                className="text-[10px] sm:text-xs text-slate-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap"
              >
                Privacy Policy
              </a>
              <span className="text-slate-300 hidden sm:block">•</span>
              <a
                href="/contact"
                className="text-[10px] sm:text-xs text-slate-600 hover:text-blue-600 transition-colors duration-200 whitespace-nowrap"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
