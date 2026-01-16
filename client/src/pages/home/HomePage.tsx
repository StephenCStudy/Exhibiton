import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { comicApi, videoApi } from "../../utils/api";
import type { Comic, Video, ApiResponse } from "../../utils/types";
import { getVideoName, getComicThumbnail } from "../../utils/types";
import VideoThumbnail from "../../components/VideoThumbnail";
import VideoDuration from "../../components/VideoDuration";
import LazyImage from "../../components/LazyImage";
import "./HomePage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Helper function to get comic cover URL
const getComicCoverUrl = (comic: Comic): string => {
  // Use the API endpoint to get cover from Mega folder
  return `${API_BASE_URL}/comics/${comic._id}/cover`;
};

// Skeleton component for featured section
const FeaturedSkeleton = () => (
  <div className="featured-header skeleton-featured">
    <div className="featured-bg-skeleton"></div>
    <div className="featured-gradient"></div>
    <div className="featured-content">
      <div className="skeleton-badge"></div>
      <div className="skeleton-featured-title"></div>
      <div className="skeleton-featured-desc"></div>
      <div className="featured-actions">
        <div className="skeleton-btn"></div>
        <div className="skeleton-btn"></div>
      </div>
    </div>
  </div>
);

// Skeleton component for comic cards
const ComicCardSkeleton = () => (
  <div className="comic-card-mini skeleton-card">
    <div className="comic-cover-mini">
      <div className="skeleton-cover"></div>
    </div>
    <div className="skeleton-title"></div>
    <div className="skeleton-tag"></div>
  </div>
);

// Skeleton component for video cards
const VideoCardSkeleton = () => (
  <div className="video-card-mini skeleton-card">
    <div className="video-thumb-mini">
      <div className="skeleton-video"></div>
    </div>
    <div className="skeleton-title"></div>
    <div className="skeleton-creator"></div>
  </div>
);

export default function HomePage() {
  const navigate = useNavigate();
  const [comics, setComics] = useState<Comic[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [comicsRes, videosRes] = await Promise.all([
        comicApi.getAll() as Promise<ApiResponse<Comic[]>>,
        videoApi.getAll() as Promise<ApiResponse<Video[]>>,
      ]);
      if (comicsRes.success && comicsRes.data) setComics(comicsRes.data);
      if (videosRes.success && videosRes.data) setVideos(videosRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const featuredComic = comics[0];

  return (
    <div className="home-page animate-fade-in">
      {/* Featured Header */}
      {loading ? (
        <FeaturedSkeleton />
      ) : featuredComic ? (
        <div className="featured-header">
          <LazyImage
            src={getComicCoverUrl(featuredComic)}
            alt="Featured"
            className="featured-bg"
            cacheKey={`comic_cover_${featuredComic._id}`}
            fallbackSrc={`https://picsum.photos/seed/${featuredComic._id}/400/600`}
          />
          <div className="featured-gradient"></div>

          <div className="featured-content">
            <span className="featured-badge">
              <i className="fas fa-fire"></i> FEATURED
            </span>
            <h1 className="featured-title">{featuredComic.name}</h1>
            <p className="featured-desc line-clamp-2">
              Khám phá truyện nổi bật với nội dung hấp dẫn, cập nhật liên tục
            </p>
            <div className="featured-actions">
              <button
                className="btn-read"
                onClick={() => navigate(`/comics/${featuredComic._id}`)}
              >
                Đọc ngay
              </button>
              <button className="btn-list" onClick={() => navigate("/comics")}>
                <i className="fas fa-plus"></i> Danh sách
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="featured-header featured-empty">
          <div className="featured-gradient"></div>
          <div className="featured-content">
            <span className="featured-badge">
              <i className="fas fa-book-open"></i> TRUYỆN
            </span>
            <h1 className="featured-title">Chưa có truyện</h1>
            <p className="featured-desc">
              Hãy thêm truyện mới để bắt đầu khám phá
            </p>
          </div>
        </div>
      )}

      {/* Trending Comics */}
      <section className="section section-full">
        <div className="section-header px-5">
          <h2 className="section-title">
            <i className="fas fa-fire" style={{ color: "#ff6b35" }}></i>
            Truyện nổi bật
          </h2>
          <button className="see-all" onClick={() => navigate("/comics")}>
            Xem tất cả
          </button>
        </div>

        <div className="horizontal-scroll no-scrollbar">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <ComicCardSkeleton key={i} />
            ))
          ) : comics.length > 0 ? (
            comics.map((comic) => (
              <div
                key={comic._id}
                className="comic-card-mini"
                onClick={() => navigate(`/comics/${comic._id}`)}
              >
                <div className="comic-cover-mini">
                  <LazyImage
                    src={getComicCoverUrl(comic)}
                    alt={comic.name}
                    cacheKey={`comic_cover_${comic._id}`}
                    fallbackSrc={`https://picsum.photos/seed/${comic._id}/140/200`}
                  />
                  <div className="comic-rating">
                    <i className="fas fa-star"></i> 4.8
                  </div>
                </div>
                <h3 className="comic-title-mini line-clamp-1">{comic.name}</h3>
                <p className="comic-tag">Action</p>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>Chưa có truyện nào</p>
            </div>
          )}
        </div>
      </section>

      {/* Fresh Videos */}
      <section className="section section-full">
        <div className="section-header px-5">
          <h2 className="section-title">Video mới</h2>
          <button className="see-all" onClick={() => navigate("/videos")}>
            Xem tất cả
          </button>
        </div>

        <div className="horizontal-scroll no-scrollbar">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))
          ) : videos.length > 0 ? (
            videos.map((video) => (
              <div
                key={video._id}
                className="video-card-mini"
                onClick={() => navigate(`/videos/${video._id}`)}
              >
                <div className="video-thumb-mini">
                  <VideoThumbnail
                    videoId={video._id}
                    alt={getVideoName(video)}
                    thumbnailFromDb={video.thumbnail}
                    fallbackUrl={
                      video.thumbnail ||
                      `https://picsum.photos/240/135?random=${video._id}`
                    }
                  />
                  <div className="play-icon-mini">
                    <i className="fas fa-play"></i>
                  </div>
                  <VideoDuration
                    videoId={video._id}
                    storedDuration={video.duration}
                    className="video-duration-mini"
                  />
                </div>
                <h3 className="video-title-mini line-clamp-1">
                  {getVideoName(video)}
                </h3>
                <p className="video-creator">Creator</p>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>Chưa có video nào</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
