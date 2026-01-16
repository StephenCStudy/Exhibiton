import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { comicApi, videoApi, syncApi } from "../../utils/api";
import type { Comic, Video } from "../../utils/types";
import { getVideoName} from "../../utils/types";
import Loader from "../../components/loader.universe";
import VideoThumbnail from "../../components/VideoThumbnail";
import VideoDuration from "../../components/VideoDuration";
import LazyImage from "../../components/LazyImage";
import "./DashboardPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface MegaStructure {
  rootFolders: { name: string; isFolder: boolean; childCount: number }[];
  videoFolder: { name: string; fileCount: number } | null;
  comicFolder: {
    name: string;
    folderCount: number;
    folders: string[];
  } | null;
}

export default function DashboardPage() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Mega sync states
  const [megaStructure, setMegaStructure] = useState<MegaStructure | null>(
    null
  );
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [comicsRes, videosRes] = await Promise.all([
        comicApi.getAll(),
        videoApi.getAll(),
      ]);

      if (comicsRes.success && comicsRes.data) {
        setComics(comicsRes.data);
      }
      if (videosRes.success && videosRes.data) {
        setVideos(videosRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  // Mega sync functions
  const fetchMegaStructure = async () => {
    try {
      setSyncLoading(true);
      const res = await syncApi.getMegaStructure();
      if (res.success && res.data) {
        setMegaStructure(res.data);
      } else {
        setSyncMessage({
          type: "error",
          text: res.message || "Lỗi kết nối Mega",
        });
      }
    } catch (error) {
      setSyncMessage({ type: "error", text: "Không thể kết nối tới server" });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncVideos = async () => {
    try {
      setSyncLoading(true);
      setSyncMessage(null);
      const res = await syncApi.syncVideos();
      if (res.success) {
        setSyncMessage({
          type: "success",
          text: `Đã đồng bộ ${res.data?.total || 0} video từ Mega!`,
        });
        fetchData(); // Refresh data
      } else {
        setSyncMessage({
          type: "error",
          text: res.message || "Lỗi đồng bộ video",
        });
      }
    } catch (error) {
      setSyncMessage({ type: "error", text: "Không thể đồng bộ video" });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncComics = async () => {
    try {
      setSyncLoading(true);
      setSyncMessage(null);
      const res = await syncApi.syncComics();
      if (res.success) {
        setSyncMessage({
          type: "success",
          text: `Đã đồng bộ ${res.data?.total || 0} truyện từ Mega!`,
        });
        fetchData(); // Refresh data
      } else {
        setSyncMessage({
          type: "error",
          text: res.message || "Lỗi đồng bộ truyện",
        });
      }
    } catch (error) {
      setSyncMessage({ type: "error", text: "Không thể đồng bộ truyện" });
    } finally {
      setSyncLoading(false);
    }
  };

  // Sort by newest (createdAt descending) and take 6
  const recentComics = useMemo(() => {
    return [...comics]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
      .slice(0, 6);
  }, [comics]);

  const recentVideos = useMemo(() => {
    return [...videos]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      )
      .slice(0, 6);
  }, [videos]);

  if (loading) {
    return (
      <div className="page-loading">
        <Loader />
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          <i className="fas fa-th-large"></i> Dashboard
        </h1>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div
          className="stat-card clickable"
          onClick={() => navigate("/dashboard/comics")}
        >
          <div className="stat-icon comic">
            <i className="fas fa-book-open"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Truyện</span>
          </div>
        </div>
        <div
          className="stat-card clickable"
          onClick={() => navigate("/dashboard/videos")}
        >
          <div className="stat-icon video">
            <i className="fas fa-play-circle"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Video</span>
          </div>
        </div>
        <div
          className="stat-card clickable"
          onClick={() => navigate("/dashboard/favorites")}
        >
          <div className="stat-icon favorite">
            <i className="fas fa-heart"></i>
          </div>
          <div className="stat-info">
            <span className="stat-label">Yêu thích</span>
          </div>
        </div>
      </div>

      {/* Recent Comics */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">
            <i className="fas fa-book-open"></i> Truyện mới nhất
          </h2>
          <button
            className="see-all-btn"
            onClick={() => navigate("/dashboard/comics")}
          >
            Xem tất cả
          </button>
        </div>

        {recentComics.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-book"></i>
            <p>Chưa có truyện nào</p>
          </div>
        ) : (
          <div className="items-grid">
            {recentComics.map((comic) => (
              <div
                key={comic._id}
                className="item-card"
                onClick={() => navigate(`/comics/${comic._id}`)}
              >
                <div className="item-thumbnail">
                  <LazyImage
                    src={`${API_BASE_URL}/comics/${comic._id}/cover`}
                    alt={comic.name}
                    cacheKey={`comic_cover_${comic._id}`}
                    fallbackSrc={`https://picsum.photos/seed/${comic._id}/300/450`}
                  />
                  <div className="item-badge comic">
                    <i className="fas fa-book"></i>
                  </div>
                </div>
                <div className="item-info">
                  <h3 className="item-title">{comic.name}</h3>
                  <p className="item-date">
                    {new Date(comic.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Videos */}
      <div className="content-section">
        <div className="section-header">
          <h2 className="section-title">
            <i className="fas fa-play-circle"></i> Video mới nhất
          </h2>
          <button
            className="see-all-btn"
            onClick={() => navigate("/dashboard/videos")}
          >
            Xem tất cả
          </button>
        </div>

        {recentVideos.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-video"></i>
            <p>Chưa có video nào</p>
          </div>
        ) : (
          <div className="items-grid video-grid">
            {recentVideos.map((video) => (
              <div
                key={video._id}
                className="item-card video"
                onClick={() => navigate(`/videos/${video._id}`)}
              >
                <div className="item-thumbnail video">
                  <VideoThumbnail
                    videoId={video._id}
                    alt={getVideoName(video)}
                    thumbnailFromDb={video.thumbnail}
                  />
                  <div className="play-overlay">
                    <i className="fas fa-play"></i>
                  </div>
                  <VideoDuration
                    videoId={video._id}
                    storedDuration={video.duration}
                    className="video-duration-badge"
                  />
                </div>
                <div className="item-info">
                  <h3 className="item-title">{getVideoName(video)}</h3>
                  <p className="item-date">
                    {new Date(video.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================
          MEGA SYNC SECTION
          ============================================ */}
      <div className="content-section mega-sync-section">
        <div className="section-header">
          <h2 className="section-title">
            <i className="fas fa-cloud-download-alt"></i> Đồng bộ từ Mega
          </h2>
          <button
            className="refresh-btn"
            onClick={fetchMegaStructure}
            disabled={syncLoading}
          >
            <i className={`fas fa-sync ${syncLoading ? "fa-spin" : ""}`}></i>
          </button>
        </div>

        {/* Sync Message */}
        {syncMessage && (
          <div className={`sync-message ${syncMessage.type}`}>
            <i
              className={`fas fa-${
                syncMessage.type === "success"
                  ? "check-circle"
                  : "exclamation-circle"
              }`}
            ></i>
            {syncMessage.text}
          </div>
        )}

        <div className="mega-sync-content">
          {/* Mega Structure Preview */}
          {megaStructure ? (
            <div className="mega-structure">
              <div className="mega-info-row">
                <div className="mega-info-card">
                  <div className="mega-card-icon video">
                    <i className="fas fa-video"></i>
                  </div>
                  <div className="mega-card-info">
                    <span className="mega-card-label">Video (Exhibition)</span>
                    <span className="mega-card-count">
                      {megaStructure.videoFolder?.fileCount || 0} files
                    </span>
                  </div>
                  <button
                    className="mega-sync-btn"
                    onClick={handleSyncVideos}
                    disabled={syncLoading || !megaStructure.videoFolder}
                  >
                    {syncLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <>
                        <i className="fas fa-download"></i> Sync
                      </>
                    )}
                  </button>
                </div>

                <div className="mega-info-card">
                  <div className="mega-card-icon comic">
                    <i className="fas fa-book"></i>
                  </div>
                  <div className="mega-card-info">
                    <span className="mega-card-label">Truyện (Comic)</span>
                    <span className="mega-card-count">
                      {megaStructure.comicFolder?.folderCount || 0} folders
                    </span>
                  </div>
                  <button
                    className="mega-sync-btn"
                    onClick={handleSyncComics}
                    disabled={syncLoading || !megaStructure.comicFolder}
                  >
                    {syncLoading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <>
                        <i className="fas fa-download"></i> Sync
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Comic folders preview */}
              {megaStructure.comicFolder &&
                megaStructure.comicFolder.folders.length > 0 && (
                  <div className="mega-folders-preview">
                    <span className="preview-label">Comic folders:</span>
                    <div className="folders-list">
                      {megaStructure.comicFolder.folders
                        .slice(0, 5)
                        .map((name, idx) => (
                          <span key={idx} className="folder-tag">
                            {name}
                          </span>
                        ))}
                      {megaStructure.comicFolder.folders.length > 5 && (
                        <span className="folder-tag more">
                          +{megaStructure.comicFolder.folders.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="mega-empty">
              <i className="fas fa-cloud"></i>
              <p>Nhấn nút refresh để xem cấu trúc Mega</p>
              <button
                className="mega-connect-btn"
                onClick={fetchMegaStructure}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <>
                    <i className="fas fa-plug"></i> Kết nối Mega
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
