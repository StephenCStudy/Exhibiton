import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { comicApi } from "../../utils/api";
import type { Comic, ApiResponse } from "../../utils/types";
import LoadingSpinner from "../../components/LoadingSpinner";
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
      const response: ApiResponse<Comic> = await comicApi.getById(id!);
      if (response.success && response.data) {
        setComic(response.data);
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

  const fetchComicImages = async (comicId: string) => {
    setImagesLoading(true);
    try {
      const response = await comicApi.getImages(comicId);
      if (response.success && response.data) {
        // Use streaming URLs for each image
        const imageUrls = response.data.map(
          (_: string, index: number) =>
            `${API_BASE_URL}/comics/${comicId}/image/${index + 1}/stream`
        );
        setImages(imageUrls);
      } else {
        // Fallback to placeholders if API fails
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
        <LoadingSpinner />
        <p className="loading-message">Đang tải truyện...</p>
      </div>
    );
  }

  if (error || !comic) {
    return (
      <div className="error-container">
        <div className="error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <p className="error-message">{error || "Không tìm thấy truyện"}</p>
        <button className="btn btn-primary" onClick={fetchComic}>
          Thử lại
        </button>
      </div>
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
          <LoadingSpinner />
          <p>Đang tải hình ảnh...</p>
        </div>
      ) : (
        <div className="image-gallery">
          <div className="gallery-header">
            <h3 className="section-title">Preview</h3>
            <span className="chapter-count">{images.length} images</span>
          </div>
          <div className="comic-images">
            {images.slice(0, 5).map((image, index) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
