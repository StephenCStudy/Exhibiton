import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { videoApi } from "../../utils/api";
import type { Video, ApiResponse } from "../../utils/types";
import { getVideoName } from "../../utils/types";
import { videoCache } from "../../utils/sessionCache";
import Loader from "../../components/loader.universe";
import ErrorState from "../../components/ErrorState";
import Pagination from "../../components/Pagination";
import VideoThumbnail from "../../components/VideoThumbnail";
import "./VideoListPage.css";

type SortOption = "title-asc" | "title-desc" | "newest" | "oldest";

const ITEMS_PER_PAGE = 10;

// Format duration from seconds to mm:ss or hh:mm:ss
const formatDuration = (seconds: number | undefined): string => {
  if (!seconds || seconds <= 0) return "--:--";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

export default function VideoListPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSearch, setShowSearch] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasFetched = useRef(false);

  // Get current page from URL
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    // Try to load from cache first
    const cached = videoCache.getAll();
    if (cached && cached.length > 0) {
      setVideos(cached);
      setLoading(false);
      // Refresh in background if needed
      if (!hasFetched.current) {
        hasFetched.current = true;
        fetchVideosInBackground();
      }
    } else {
      fetchVideos();
    }
  }, []);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (currentPage !== 1 && searchQuery) {
      setSearchParams({ page: "1" }, { replace: true });
    }
  }, [searchQuery]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError("");
      const response: ApiResponse<Video[]> = await videoApi.getAll();
      if (response.success && response.data) {
        setVideos(response.data);
        // Cache the results
        videoCache.saveAll(response.data);
      } else {
        setError(response.message || "Failed to fetch videos");
      }
    } catch (err) {
      setError("Error fetching videos");
      console.error(err);
    } finally {
      setLoading(false);
      hasFetched.current = true;
    }
  };

  // Fetch in background without showing loading
  const fetchVideosInBackground = async () => {
    try {
      const response: ApiResponse<Video[]> = await videoApi.getAll();
      if (response.success && response.data) {
        setVideos(response.data);
        videoCache.saveAll(response.data);
      }
    } catch (err) {
      console.error("Background fetch failed:", err);
    }
  };

  // Filter by search query
  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const query = searchQuery.toLowerCase();
    return videos.filter((video) =>
      getVideoName(video).toLowerCase().includes(query)
    );
  }, [videos, searchQuery]);

  // Sort videos
  const sortedVideos = useMemo(() => {
    const sorted = [...filteredVideos];
    switch (sortBy) {
      case "title-asc":
        return sorted.sort((a, b) =>
          getVideoName(a).localeCompare(getVideoName(b))
        );
      case "title-desc":
        return sorted.sort((a, b) =>
          getVideoName(b).localeCompare(getVideoName(a))
        );
      case "newest":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );
      case "oldest":
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
        );
      default:
        return sorted;
    }
  }, [filteredVideos, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedVideos.length / ITEMS_PER_PAGE);
  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedVideos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedVideos, currentPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      setSearchParams({ page: page.toString() }, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setSearchParams]
  );

  const handleSortChange = useCallback(
    (option: SortOption) => {
      setSortBy(option);
      setSearchParams({ page: "1" }, { replace: true });
    },
    [setSearchParams]
  );

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => !prev);
    if (showSearch) {
      setSearchQuery("");
    }
  }, [showSearch]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setShowSearch(false);
  }, []);

  if (loading) {
    return (
      <div className="video-loading">
        <Loader />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchVideos} />;
  }

  return (
    <div className="video-list-page">
      {/* Page Header */}
      <div className="video-page-header">
        <h1 className="video-page-title">Videos</h1>
        <div className="video-header-actions">
          <button
            className="video-icon-btn"
            type="button"
            onClick={toggleSearch}
          >
            <i className="fas fa-search"></i>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="video-search-container">
          <i className="fas fa-search video-search-icon"></i>
          <input
            type="text"
            className="video-search-input"
            placeholder="Tìm video..."
            value={searchQuery}
            onChange={handleSearchChange}
            autoFocus
          />
          {searchQuery && (
            <button
              className="video-clear-btn"
              type="button"
              onClick={clearSearch}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      )}

      {/* Sort Options */}
      <div className="video-sort-container">
        <span className="video-sort-label">Sắp xếp:</span>
        <select
          className="video-sort-select"
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value as SortOption)}
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="title-asc">Tên A-Z</option>
          <option value="title-desc">Tên Z-A</option>
        </select>
        <span className="video-results-count">
          {sortedVideos.length} video
          {searchQuery.trim() && ` cho "${searchQuery.trim()}"`}
        </span>
      </div>

      {/* Video List */}
      {paginatedVideos.length === 0 ? (
        <div className="video-empty">
          <div className="video-empty-icon">
            <i className="fas fa-video-slash"></i>
          </div>
          <h3 className="video-empty-title">
            {searchQuery.trim() ? "Không tìm thấy video" : "Chưa có video"}
          </h3>
          <p className="video-empty-text">
            {searchQuery.trim()
              ? `Không có kết quả cho "${searchQuery.trim()}"`
              : "Hãy thêm video mới để bắt đầu!"}
          </p>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {paginatedVideos.map((video, index) => (
              <div
                key={video._id}
                className="video-card"
                onClick={() => navigate(`/videos/${video._id}`)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="video-thumb">
                  <VideoThumbnail
                    videoId={video._id}
                    alt={getVideoName(video)}
                    thumbnailFromDb={video.thumbnail}
                    fallbackUrl={
                      video.thumbnail ||
                      `https://picsum.photos/seed/${video._id}/640/360`
                    }
                  />
                  <div className="video-play-btn">
                    <i className="fas fa-play"></i>
                  </div>
                  <span className="video-duration">
                    {formatDuration(video.duration)}
                  </span>
                </div>
                <div className="video-content">
                  <h3 className="video-card-title">{getVideoName(video)}</h3>
                  <p className="video-card-date">
                    {new Date(video.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
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
  );
}
