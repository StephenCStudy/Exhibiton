import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { comicApi, videoApi } from "../../utils/api";
import type { Comic, Video, ApiResponse } from "../../utils/types";
import LoadingSpinner from "../../components/LoadingSpinner";
import VideoThumbnail from "../../components/VideoThumbnail";
import VideoDuration from "../../components/VideoDuration";
import BottomNavigation from "../../components/BottomNavigation";
import Pagination from "../../components/Pagination";
import {
  getFavorites,
  toggleVideoFavorite,
  toggleComicFavorite,
} from "../../utils/favorites";
import "./FavoritesPage.css";

type FilterType = "all" | "comics" | "videos";
const ITEMS_PER_PAGE = 12;

export default function FavoritesPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [favoriteComics, setFavoriteComics] = useState<Comic[]>([]);
  const [favoriteVideos, setFavoriteVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchFavorites();
  }, []);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const favorites = getFavorites();

      // Fetch all comics and videos, then filter by favorites
      const [comicsRes, videosRes] = await Promise.all([
        comicApi.getAll() as Promise<ApiResponse<Comic[]>>,
        videoApi.getAll() as Promise<ApiResponse<Video[]>>,
      ]);

      if (comicsRes.success && comicsRes.data) {
        const filteredComics = comicsRes.data.filter((comic) =>
          favorites.comics.includes(comic._id)
        );
        setFavoriteComics(filteredComics);
      }

      if (videosRes.success && videosRes.data) {
        const filteredVideos = videosRes.data.filter((video) =>
          favorites.videos.includes(video._id)
        );
        setFavoriteVideos(filteredVideos);
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveComic = (e: React.MouseEvent, comicId: string) => {
    e.stopPropagation();
    setRemovingId(comicId);
    toggleComicFavorite(comicId);
    setTimeout(() => {
      setFavoriteComics((prev) => prev.filter((c) => c._id !== comicId));
      setRemovingId(null);
    }, 300);
  };

  const handleRemoveVideo = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    setRemovingId(videoId);
    toggleVideoFavorite(videoId);
    setTimeout(() => {
      setFavoriteVideos((prev) => prev.filter((v) => v._id !== videoId));
      setRemovingId(null);
    }, 300);
  };

  const handleGoBack = () => {
    navigate("/dashboard");
  };

  const clearAll = () => {
    if (!confirm("Bạn có chắc muốn xóa tất cả mục yêu thích?")) return;
    favoriteComics.forEach((c) => toggleComicFavorite(c._id));
    favoriteVideos.forEach((v) => toggleVideoFavorite(v._id));
    setFavoriteComics([]);
    setFavoriteVideos([]);
  };

  // Calculate total and filtered items
  const totalCount = favoriteComics.length + favoriteVideos.length;

  const filteredItems = useMemo(() => {
    const items: { type: "comic" | "video"; data: Comic | Video }[] = [];

    if (filter === "all" || filter === "comics") {
      favoriteComics.forEach((c) => items.push({ type: "comic", data: c }));
    }
    if (filter === "all" || filter === "videos") {
      favoriteVideos.forEach((v) => items.push({ type: "video", data: v }));
    }

    return items;
  }, [favoriteComics, favoriteVideos, filter]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="favorites-page">
        <div className="loading-container">
          <LoadingSpinner />
          <p>Đang tải danh sách yêu thích...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      {/* Header */}
      <header className="favorites-header">
        <button className="back-btn" onClick={handleGoBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1 className="header-title">
          <i className="fas fa-heart"></i>
          Yêu thích
          <span className="count-badge">{totalCount}</span>
        </h1>
        {totalCount > 0 && (
          <button className="clear-btn" onClick={clearAll}>
            <i className="fas fa-trash"></i>
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="tabs-container">
        <button
          className={`tab-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Tất cả
          <span className="tab-count">{totalCount}</span>
        </button>
        <button
          className={`tab-btn ${filter === "comics" ? "active" : ""}`}
          onClick={() => setFilter("comics")}
        >
          <i className="fas fa-book"></i>
          Truyện
          <span className="tab-count">{favoriteComics.length}</span>
        </button>
        <button
          className={`tab-btn ${filter === "videos" ? "active" : ""}`}
          onClick={() => setFilter("videos")}
        >
          <i className="fas fa-video"></i>
          Video
          <span className="tab-count">{favoriteVideos.length}</span>
        </button>
      </div>

      {/* Content */}
      <div className="favorites-content">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="far fa-heart"></i>
            </div>
            <h3>Chưa có mục yêu thích</h3>
            <p>
              Nhấn vào biểu tượng bookmark để lưu truyện và video bạn yêu thích
            </p>
            <div className="empty-actions">
              <button
                className="btn-primary"
                onClick={() => navigate("/comics")}
              >
                <i className="fas fa-book"></i>
                Xem truyện
              </button>
              <button
                className="btn-secondary"
                onClick={() => navigate("/videos")}
              >
                <i className="fas fa-play"></i>
                Xem video
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="items-grid">
              {paginatedItems.map((item) => {
                if (item.type === "comic") {
                  const comic = item.data as Comic;
                  return (
                    <div
                      key={comic._id}
                      className={`item-card comic ${
                        removingId === comic._id ? "removing" : ""
                      }`}
                      onClick={() => navigate(`/comics/${comic._id}`)}
                    >
                      <div className="item-thumbnail">
                        <img
                          src={comic.coverImage}
                          alt={comic.name}
                          onError={(e) => {
                            e.currentTarget.src = `https://picsum.photos/seed/${comic._id}/200/300`;
                          }}
                        />
                        <div className="item-badge comic">
                          <i className="fas fa-book"></i>
                        </div>
                        <button
                          className="remove-btn"
                          onClick={(e) => handleRemoveComic(e, comic._id)}
                          title="Xóa khỏi yêu thích"
                        >
                          <i className="fas fa-heart-broken"></i>
                        </button>
                      </div>
                      <div className="item-info">
                        <h3 className="item-title">{comic.name}</h3>
                        <p className="item-date">
                          {new Date(comic.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </p>
                      </div>
                    </div>
                  );
                } else {
                  const video = item.data as Video;
                  return (
                    <div
                      key={video._id}
                      className={`item-card video ${
                        removingId === video._id ? "removing" : ""
                      }`}
                      onClick={() => navigate(`/videos/${video._id}`)}
                    >
                      <div className="item-thumbnail">
                        <VideoThumbnail
                          videoId={video._id}
                          alt={video.title}
                          fallbackUrl={
                            video.thumbnail ||
                            `https://picsum.photos/seed/${video._id}/320/180`
                          }
                        />
                        <div className="play-overlay">
                          <i className="fas fa-play"></i>
                        </div>
                        <VideoDuration
                          videoId={video._id}
                          storedDuration={video.duration}
                          className="video-duration"
                        />
                        <button
                          className="remove-btn"
                          onClick={(e) => handleRemoveVideo(e, video._id)}
                          title="Xóa khỏi yêu thích"
                        >
                          <i className="fas fa-heart-broken"></i>
                        </button>
                      </div>
                      <div className="item-info">
                        <h3 className="item-title">{video.title}</h3>
                        <p className="item-date">
                          {new Date(video.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
