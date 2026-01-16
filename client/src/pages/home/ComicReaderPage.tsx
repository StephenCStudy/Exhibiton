import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { comicApi } from "../../utils/api";
import type { Comic, ApiResponse } from "../../utils/types";
import Loader from "../../components/loader.universe";
import ErrorState from "../../components/ErrorState";
import LazyComicImage from "../../components/LazyComicImage";
import "./ComicReaderPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface ComicImage {
  name: string;
  url: string;
  index: number;
}

export default function ComicReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comic, setComic] = useState<Comic | null>(null);
  const [images, setImages] = useState<ComicImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [, setLoadedImages] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (id) {
      fetchComicAndImages();
    }
  }, [id]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => setShowControls(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showControls]);

  const fetchComicAndImages = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch comic info
      const response: ApiResponse<Comic> = await comicApi.getById(id!);
      if (response.success && response.data) {
        setComic(response.data);
        setLoading(false);

        // Fetch images from Mega folder
        await fetchImagesFromMega(response.data);
      } else {
        setError(response.message || "Không tìm thấy truyện");
        setLoading(false);
      }
    } catch (err) {
      setError("Lỗi khi tải truyện");
      setLoading(false);
      console.error(err);
    }
  };

  const fetchImagesFromMega = async (comicData: Comic) => {
    try {
      setImagesLoading(true);

      // Fetch image list from API
      const response = await comicApi.getImages(comicData._id);

      if (response.success && response.data && response.data.length > 0) {
        // API returns pages with { name, url, index }
        // Use streaming URLs for images
        const pages = response.data as unknown as { name: string; url: string; index: number }[];
        const imageList: ComicImage[] = pages.map((page) => ({
          name: page.name || `page_${page.index}.jpg`,
          url: `${API_BASE_URL}/comics/${comicData._id}/image/${page.index}/stream`,
          index: page.index,
        }));
        setImages(imageList);
      } else {
        // Fallback to placeholder images if API fails
        const placeholderImages: ComicImage[] = Array.from(
          { length: 20 },
          (_, i) => ({
            name: `page_${i + 1}.jpg`,
            url: `https://picsum.photos/seed/${comicData._id}-${i}/800/1200`,
            index: i + 1,
          })
        );
        setImages(placeholderImages);
      }
    } catch (err) {
      console.error("Error fetching images:", err);
      // Fallback to placeholder
      const placeholderImages: ComicImage[] = Array.from(
        { length: 20 },
        (_, i) => ({
          name: `page_${i + 1}.jpg`,
          url: `https://picsum.photos/seed/${comicData._id}-${i}/800/1200`,
          index: i + 1,
        })
      );
      setImages(placeholderImages);
    } finally {
      setImagesLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(`/comics/${id}`);
  };

  const handleToggleControls = () => {
    setShowControls(!showControls);
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const totalHeight = document.body.scrollHeight;

    // Calculate current page based on scroll position
    const progress = scrollPosition / (totalHeight - windowHeight);
    const currentPageNum = Math.ceil(progress * images.length) || 1;
    setCurrentPage(Math.min(currentPageNum, images.length));
  }, [images.length]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToPage = (pageNum: number) => {
    const imageElements = document.querySelectorAll(".reader-image-container");
    if (imageElements[pageNum - 1]) {
      imageElements[pageNum - 1].scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="reader-loading">
        <Loader />
      </div>
    );
  }

  if (error || !comic) {
    return (
      <ErrorState
        message={error || "Không tìm thấy truyện"}
        onRetry={handleGoBack}
      />
    );
  }

  return (
    <div className="comic-reader-page" onClick={handleToggleControls}>
      {/* Top Navigation Bar */}
      <div className={`reader-navbar ${showControls ? "visible" : "hidden"}`}>
        <button className="nav-btn" onClick={handleGoBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="reader-title">
          <h1>{comic.name}</h1>
          <span className="page-indicator">
            {currentPage} / {images.length}
          </span>
        </div>
        <div className="nav-actions">
          <button className="nav-btn" onClick={(e) => e.stopPropagation()}>
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </div>

      {/* Images Container */}
      <div className="reader-images-container">
        {imagesLoading ? (
          <div className="images-loading-state">
            <Loader />
          </div>
        ) : (
          images.map((image, index) => (
            <div key={index} className="reader-image-container">
              <LazyComicImage
                src={image.url}
                alt={`Trang ${index + 1}`}
                pageNumber={index + 1}
                comicId={comic._id}
                onLoad={() => handleImageLoad(index)}
              />
              <div className="page-number">{index + 1}</div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Controls */}
      <div
        className={`reader-controls ${showControls ? "visible" : "hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="control-btn" onClick={scrollToTop}>
          <i className="fas fa-chevron-up"></i>
          <span>Đầu</span>
        </button>

        <div className="page-slider">
          <input
            type="range"
            min="1"
            max={images.length}
            value={currentPage}
            onChange={(e) => scrollToPage(parseInt(e.target.value))}
            className="slider"
          />
          <div className="slider-labels">
            <span>1</span>
            <span>{images.length}</span>
          </div>
        </div>

        <button className="control-btn" onClick={scrollToBottom}>
          <i className="fas fa-chevron-down"></i>
          <span>Cuối</span>
        </button>
      </div>

      {/* Floating Page Indicator (always visible) */}
      <div className="floating-page-indicator">
        <span>
          {currentPage}/{images.length}
        </span>
      </div>

      {/* Quick scroll to top button */}
      {currentPage > 3 && (
        <button className="scroll-top-btn" onClick={scrollToTop}>
          <i className="fas fa-arrow-up"></i>
        </button>
      )}
    </div>
  );
}
