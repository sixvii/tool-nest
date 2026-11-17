import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Header from './components/Header';
import Footer from './components/Footer';
import ToolPage from './pages/ToolPage';
import AllToolsPage from './pages/AllToolsPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/tools" element={<AllToolsPage />} />
          <Route path="/category/:category" element={<Home />} />
          <Route path="/:category/:toolName" element={<ToolPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-slate-50/50 antialiased selection:bg-blue-500 selection:text-white flex flex-col">
      <Header />
      <div className="flex-1 pt-16">
        <ErrorBoundary key={pathname}>
          <AnimatedRoutes />
        </ErrorBoundary>
      </div>
      <Footer />
      <Toaster position="bottom-right" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppShell />
    </BrowserRouter>
  );
}
export default App;
