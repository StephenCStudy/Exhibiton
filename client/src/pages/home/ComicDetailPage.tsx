import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { comicApi } from "../../utils/api";
import type { Comic, ApiResponse } from "../../utils/types";
import { comicCache } from "../../utils/sessionCache";
import Loader from "../../components/loader.universe";
import ErrorState from "../../components/ErrorState";
import LazyImage from "../../components/LazyImage";
import { isComicFavorite, toggleComicFavorite } from "../../utils/favorites";
import "./ComicDetailPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ComicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comic, setComic] = useState<Comic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showAllImages, setShowAllImages] = useState(false);
  const PREVIEW_LIMIT = 9;

  useEffect(() => {
    if (id) {
      fetchComic();
      setSaved(isComicFavorite(id));
    }
  }, [id]);

  const fetchComic = async () => {
    try {
      setLoading(true);
      setError("");

      // Try cache first
      const cached = comicCache.getById(id!);
      if (cached) {
        setComic(cached);
        setLoading(false);
        await fetchComicImages(id!);
        // Fetch fresh data in background
        fetchComicInBackground();
        return;
      }

      const response: ApiResponse<Comic> = await comicApi.getById(id!);
      if (response.success && response.data) {
        setComic(response.data);
        // Cache the comic
        comicCache.saveById(id!, response.data);
        await fetchComicImages(id!);
      } else {
        setError(response.message || "Failed to fetch comic");
      }
    } catch (err) {
      setError("Error fetching comic");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch in background
  const fetchComicInBackground = async () => {
    try {
      const response: ApiResponse<Comic> = await comicApi.getById(id!);
      if (response.success && response.data) {
        setComic(response.data);
        comicCache.saveById(id!, response.data);
      }
    } catch (err) {
      console.error("Background fetch failed:", err);
    }
  };

  const fetchComicImages = async (comicId: string) => {
    setImagesLoading(true);
    try {
      const response = await comicApi.getImages(comicId);
      if (response.success && response.data && response.data.length > 0) {
        // API returns pages with { name, url, index }
        // Use streaming URLs for each image
        const imageUrls = response.data.map(
          (page: { url: string; index: number }) =>
            `${API_BASE_URL}/comics/${comicId}/image/${page.index}/stream`
        );
        setImages(imageUrls);
      } else {
        // Fallback to placeholders if API fails or no pages
        const placeholderImages = Array.from(
          { length: 15 },
          (_, i) => `https://picsum.photos/seed/${comicId}-${i}/800/1200`
        );
        setImages(placeholderImages);
      }
    } catch (err) {
      console.error("Error fetching images:", err);
      // Fallback to placeholders
      const placeholderImages = Array.from(
        { length: 15 },
        (_, i) => `https://picsum.photos/seed/${comicId}-${i}/800/1200`
      );
      setImages(placeholderImages);
    } finally {
      setImagesLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate("/comics");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: comic?.name,
        url: window.location.href,
      });
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader />
      </div>
    );
  }

  if (error || !comic) {
    return (
      <ErrorState
        message={error || "Không tìm thấy truyện"}
        onRetry={fetchComic}
      />
    );
  }

  return (
    <div className="comic-detail-page">
      {/* Navbar Overlay */}
      <div className="navbar-overlay">
        <button className="nav-btn" onClick={handleGoBack}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <div className="nav-actions">
          <button className="nav-btn" onClick={handleShare}>
            <i className="fas fa-share-alt"></i>
          </button>
          <button
            className={`nav-btn ${saved ? "saved" : ""}`}
            onClick={() => {
              if (id) {
                const newState = toggleComicFavorite(id);
                setSaved(newState);
              }
            }}
          >
            <i className={`${saved ? "fas" : "far"} fa-bookmark`}></i>
          </button>
        </div>
      </div>

      {/* Hero Cover */}
      <div className="hero-cover">
        <LazyImage
          src={`${API_BASE_URL}/comics/${comic._id}/cover`}
          alt={comic.name}
          className="cover-image"
          cacheKey={`comic_cover_${comic._id}`}
          fallbackSrc={`https://picsum.photos/seed/${comic._id}/800/700`}
        />
        <div className="cover-gradient"></div>
      </div>

      {/* Info Section */}
      <div className="info-section">
        <h1 className="comic-title">{comic.name}</h1>

        <div className="comic-info-meta">
          <span className="rating-badge">
            <i className="fas fa-star"></i>
            4.8
          </span>
          <span className="meta-text primary">{images.length} trang</span>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            className="btn btn-primary read-btn"
            onClick={() => navigate(`/comics/${id}/read`)}
          >
            Đọc Ngay
          </button>
        </div>
      </div>

      {/* Image Gallery Section */}
      {imagesLoading ? (
        <div className="images-loading">
          <Loader />
        </div>
      ) : (
        <div className="image-gallery">
          <div className="gallery-header">
            <h3 className="section-title">Preview</h3>
            <span className="chapter-count">{images.length} images</span>
          </div>
          <div className="comic-images">
            {(showAllImages ? images : images.slice(0, PREVIEW_LIMIT)).map(
              (image, index) => (
                <div key={index} className="image-preview">
                  <img
                    src={image}
                    alt={`Trang ${index + 1}`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = `https://via.placeholder.com/400x600?text=Page+${
                        index + 1
                      }`;
                    }}
                  />
                  <div className="image-number">{index + 1}</div>
                </div>
              )
            )}
          </div>

          {/* Show More Button */}
          {!showAllImages && images.length > PREVIEW_LIMIT && (
            <button
              className="show-more-btn"
              onClick={() => setShowAllImages(true)}
            >
              <span>Xem thêm {images.length - PREVIEW_LIMIT} trang</span>
              <i className="fas fa-chevron-down"></i>
            </button>
          )}

          {/* Show Less Button */}
          {showAllImages && images.length > PREVIEW_LIMIT && (
            <button
              className="show-more-btn"
              onClick={() => {
                setShowAllImages(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <span>Thu gọn</span>
              <i className="fas fa-chevron-up"></i>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
