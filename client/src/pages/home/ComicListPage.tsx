import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { comicApi } from "../../utils/api";
import type { Comic, ApiResponse } from "../../utils/types";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import LazyImage from "../../components/LazyImage";
import "./ComicListPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type SortOption = "name-asc" | "name-desc" | "newest" | "oldest";

const ITEMS_PER_PAGE = 6;

export default function ComicListPage() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSearch, setShowSearch] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get current page from URL
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  useEffect(() => {
    fetchComics();
  }, []);

  // Anti-copy protection
  useEffect(() => {
    const preventCopy = (e: Event) => e.preventDefault();
    const preventContextMenu = (e: Event) => e.preventDefault();
    const preventKeyboard = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+U, Ctrl+S, F12
      if (
        (e.ctrlKey && (e.key === "c" || e.key === "u" || e.key === "s")) ||
        e.key === "F12"
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

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (currentPage !== 1 && searchQuery) {
      setSearchParams({ page: "1" }, { replace: true });
    }
  }, [searchQuery]);

  const fetchComics = async () => {
    try {
      setLoading(true);
      setError("");
      const response: ApiResponse<Comic[]> = await comicApi.getAll();
      if (response.success && response.data) {
        setComics(response.data);
      } else {
        setError(response.message || "Failed to fetch comics");
      }
    } catch (err) {
      setError("Error fetching comics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter by search query
  const filteredComics = useMemo(() => {
    if (!searchQuery.trim()) return comics;
    const query = searchQuery.toLowerCase();
    return comics.filter((comic) => comic.name.toLowerCase().includes(query));
  }, [comics, searchQuery]);

  // Sort comics
  const sortedComics = useMemo(() => {
    const sorted = [...filteredComics];
    switch (sortBy) {
      case "name-asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
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
  }, [filteredComics, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedComics.length / ITEMS_PER_PAGE);
  const paginatedComics = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedComics.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedComics, currentPage]);

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

  const handleCardClick = useCallback(
    (comicId: string) => {
      navigate(`/comics/${comicId}`);
    },
    [navigate]
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
      <div className="page-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <p className="error-message">{error}</p>
        <button className="btn btn-primary" onClick={fetchComics}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="comic-list-page animate-fade-in no-select">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Library</h1>
        <div className="header-actions">
          <button
            className="icon-btn"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSearch();
            }}
          >
            <i className="fas fa-search"></i>
          </button>
          <button
            className="icon-btn"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowFilter(true);
            }}
          >
            <i className="fas fa-sliders-h"></i>
          </button>
        </div>
      </div>

      {/* Search Bar (expandable) */}
      {showSearch && (
        <div className="search-container" onClick={(e) => e.stopPropagation()}>
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Tìm truyện..."
            value={searchQuery}
            onChange={handleSearchChange}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
          {searchQuery && (
            <button
              className="clear-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearSearch();
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      )}

      {/* Sort Options */}
      <div className="sort-container" onClick={(e) => e.stopPropagation()}>
        <span className="sort-label">Sắp xếp:</span>
        <select
          className="sort-select"
          value={sortBy}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            handleSortChange(e.target.value as SortOption);
          }}
        >
          <option value="newest">Mới nhất</option>
          <option value="oldest">Cũ nhất</option>
          <option value="name-asc">Tên A-Z</option>
          <option value="name-desc">Tên Z-A</option>
        </select>
        <span className="results-count">
          {sortedComics.length} truyện
          {searchQuery.trim() && ` cho "${searchQuery.trim()}"`}
        </span>
      </div>

      {/* Comics Grid */}
      {paginatedComics.length === 0 ? (
        <div className="empty-container">
          <div className="empty-icon">📚</div>
          <h3 className="empty-title">Không tìm thấy truyện</h3>
          <p className="empty-message">
            {searchQuery.trim()
              ? `Không có kết quả cho "${searchQuery.trim()}"`
              : "Chưa có truyện nào"}
          </p>
        </div>
      ) : (
        <>
          <div className="comics-grid">
            {paginatedComics.map((comic) => (
              <div
                key={comic._id}
                className="comic-card"
                onClick={() => handleCardClick(comic._id)}
              >
                <div className="comic-cover">
                  <LazyImage
                    src={`${API_BASE_URL}/comics/${comic._id}/cover`}
                    alt={comic.name}
                    cacheKey={`comic_cover_${comic._id}`}
                    fallbackSrc={`https://picsum.photos/seed/${comic._id}/300/450`}
                  />
                  <span className="new-badge">NEW</span>
                </div>
                <h3 className="comic-name line-clamp-1">{comic.name}</h3>
                <div className="comic-meta">
                  <span className="chapter-count">45 Chapters</span>
                  <span className="rating">
                    <i className="fas fa-star"></i> 4.8
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div onClick={(e) => e.stopPropagation()}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* Filter Bottom Sheet */}
      {showFilter && (
        <div
          className="bottom-sheet-overlay"
          onClick={() => setShowFilter(false)}
        >
          <div
            className="bottom-sheet animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sheet-handle"></div>
            <div className="sheet-header">
              <h3 className="sheet-title">Filter Comics</h3>
              <button
                className="close-btn"
                onClick={() => setShowFilter(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="filter-section">
              <h4 className="filter-label">Genre</h4>
              <div className="filter-tags">
                {[
                  "Action",
                  "Romance",
                  "Sci-Fi",
                  "Fantasy",
                  "Horror",
                  "Slice of Life",
                ].map((tag) => (
                  <button key={tag} className="filter-tag">
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <h4 className="filter-label">Status</h4>
              <div className="filter-tags">
                <button className="filter-tag active">Ongoing</button>
                <button className="filter-tag">Completed</button>
              </div>
            </div>

            <button
              className="btn btn-primary apply-btn"
              onClick={() => setShowFilter(false)}
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
