import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import BottomNavigation from "./components/BottomNavigation";
import RateLimitBanner from "./components/RateLimitBanner";
import { ToastProvider } from "./components/Toast";
import HomePage from "./pages/home/HomePage";
import ComicListPage from "./pages/home/ComicListPage";
import ComicDetailPage from "./pages/home/ComicDetailPage";
import ComicReaderPage from "./pages/home/ComicReaderPage";
import VideoListPage from "./pages/home/VideoListPage";
import VideoDetailPage from "./pages/home/VideoDetailPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import ComicAdminPage from "./pages/dashboard/ComicAdminPage";
import VideoAdminPage from "./pages/dashboard/VideoAdminPage";
import FavoritesPage from "./pages/dashboard/FavoritesPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

export default function App() {
  // Global anti-copy protection
  useEffect(() => {
    const preventCopy = (e: Event) => e.preventDefault();
    const preventContextMenu = (e: Event) => e.preventDefault();
    const preventKeyboard = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+U, Ctrl+S, Ctrl+P, F12
      if (
        e.ctrlKey &&
        (e.key === "c" || e.key === "u" || e.key === "s" || e.key === "p") // ||e.key === "F12"
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", preventCopy);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("keydown", preventKeyboard);

    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventKeyboard);
    };
  }, []);

  return (
    <ToastProvider>
      <Router>
        <ScrollToTop />
        <RateLimitBanner />
        <div className="app-container">
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/comics" element={<ComicListPage />} />
              <Route path="/comics/:id" element={<ComicDetailPage />} />
              <Route path="/comics/:id/read" element={<ComicReaderPage />} />
              <Route path="/videos" element={<VideoListPage />} />
              <Route path="/videos/:id" element={<VideoDetailPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/comics" element={<ComicAdminPage />} />
              <Route path="/dashboard/videos" element={<VideoAdminPage />} />
              <Route path="/dashboard/favorites" element={<FavoritesPage />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </main>
          <BottomNavigation />
        </div>
      </Router>
    </ToastProvider>
  );
}
