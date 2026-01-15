import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { videoApi } from "../../utils/api";
import type { Video, ApiResponse } from "../../utils/types";
import LoadingSpinner from "../../components/LoadingSpinner";
import BottomNavigation from "../../components/BottomNavigation";
import VideoThumbnail from "../../components/VideoThumbnail";
import VideoDuration from "../../components/VideoDuration";
import { isVideoFavorite, toggleVideoFavorite } from "../../utils/favorites";
import "./VideoDetailPage.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Format duration from seconds to mm:ss or hh:mm:ss
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "00:00";

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

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ time: number; side: "left" | "right" | null }>({
    time: 0,
    side: null,
  });

  const [video, setVideo] = useState<Video | null>(null);
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Initialize saved state when id changes
  useEffect(() => {
    if (id) {
      setSaved(isVideoFavorite(id));
    }
  }, [id]);

  // Video player state - Load volume from sessionStorage for session persistence
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = sessionStorage.getItem("videoVolume");
    return saved ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return sessionStorage.getItem("videoMuted") === "true";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoErrorMessage, setVideoErrorMessage] = useState<string | null>(
    null
  );
  const [isBuffering, setIsBuffering] = useState(false);

  // Playback speed
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const saved = sessionStorage.getItem("videoPlaybackSpeed");
    return saved ? parseFloat(saved) : 1;
  });
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Double tap indicator
  const [doubleTapIndicator, setDoubleTapIndicator] = useState<{
    show: boolean;
    side: "left" | "right";
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (id) {
      fetchVideo();
      fetchAllVideos();
    }
  }, [id]);

  // Apply volume/muted/speed settings when video loads
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [video]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isPlaying && showControls) {
      timeout = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, showControls]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      setError("");
      const response: ApiResponse<Video> = await videoApi.getById(id!);
      if (response.success && response.data) {
        setVideo(response.data);
      } else {
        setError(response.message || "Failed to fetch video");
      }
    } catch (err) {
      setError("Error fetching video");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllVideos = async () => {
    try {
      const response: ApiResponse<Video[]> = await videoApi.getAll();
      if (response.success && response.data) {
        setAllVideos(response.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/videos");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video?.title,
        url: window.location.href,
      });
    }
  };

  // Video player controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);

      // Update buffered
      if (videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(
          videoRef.current.buffered.length - 1
        );
        setBuffered((bufferedEnd / videoRef.current.duration) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoError(false);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = percent * duration;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    sessionStorage.setItem("videoVolume", value.toString());
    if (videoRef.current) {
      videoRef.current.volume = value;
    }
    if (value === 0) {
      setIsMuted(true);
      sessionStorage.setItem("videoMuted", "true");
    } else {
      setIsMuted(false);
      sessionStorage.setItem("videoMuted", "false");
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume || 1;
        setIsMuted(false);
        sessionStorage.setItem("videoMuted", "false");
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
        sessionStorage.setItem("videoMuted", "true");
      }
    }
  };

  const toggleFullscreen = () => {
    const container = document.querySelector(".video-player-container");
    if (!document.fullscreenElement && container) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  // Playback speed control
  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    sessionStorage.setItem("videoPlaybackSpeed", speed.toString());
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  // Double tap to seek
  const handleDoubleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !videoRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const side = x < rect.width / 2 ? "left" : "right";
    const now = Date.now();

    // Check for double tap (within 300ms)
    if (
      now - lastTapRef.current.time < 300 &&
      lastTapRef.current.side === side
    ) {
      const seekSeconds = side === "left" ? -10 : 10;
      videoRef.current.currentTime += seekSeconds;

      // Show indicator
      setDoubleTapIndicator({
        show: true,
        side,
        seconds: Math.abs(seekSeconds),
      });

      // Hide after animation
      setTimeout(() => setDoubleTapIndicator(null), 500);

      // Reset tap tracking
      lastTapRef.current = { time: 0, side: null };
    } else {
      lastTapRef.current = { time: now, side };
    }
  };

  const handleVideoError = async () => {
    console.error("Video playback error");

    // Try to fetch error details from server
    try {
      const response = await fetch(`${API_BASE_URL}/videos/${id}/stream`, {
        method: "HEAD",
      });

      if (response.status === 429) {
        const timeLimit = response.headers.get("X-Rate-Limit-Reset");
        if (timeLimit) {
          const minutes = Math.ceil(parseInt(timeLimit) / 60);
          setVideoErrorMessage(
            `Giới hạn băng thông Mega đã đạt mức tối đa. Vui lòng thử lại sau ${minutes} phút.`
          );
        } else {
          setVideoErrorMessage(
            "Giới hạn băng thông đã đạt mức tối đa. Vui lòng thử lại sau."
          );
        }
      } else if (response.status === 503) {
        setVideoErrorMessage(
          "Không thể kết nối đến Mega. Vui lòng thử lại sau."
        );
      } else {
        setVideoErrorMessage("Không thể phát video. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error("Error fetching video error details:", err);
      setVideoErrorMessage(
        "Không thể phát video. Vui lòng kiểm tra kết nối mạng."
      );
    }

    setVideoError(true);
    setIsBuffering(false);
  };

  const upNextVideos = allVideos.filter((v) => v._id !== id).slice(0, 5);

  if (loading) {
    return (
      <div className="video-loading">
        <LoadingSpinner />
        <p className="video-loading-text">Đang tải video...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="video-error">
        <div className="video-error-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <p className="video-error-text">{error || "Không tìm thấy video"}</p>
        <button className="video-retry-btn" onClick={fetchVideo}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="video-detail-page">
      {/* Fixed Header with Back Button */}
      <header className="video-back-header">
        <button className="back-btn" onClick={handleGoBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <span className="header-title">Video</span>
      </header>

      {/* Video Player */}
      <div
        ref={containerRef}
        className={`video-player-container ${isFullscreen ? "fullscreen" : ""}`}
        onMouseMove={() => setShowControls(true)}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        onClick={handleDoubleTap}
      >
        <video
          ref={videoRef}
          className="video-player"
          src={`${API_BASE_URL}/videos/${video._id}/stream`}
          poster={
            video.thumbnail || `https://picsum.photos/seed/${video._id}/640/360`
          }
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleVideoError}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          playsInline
        />

        {/* Double tap indicators */}
        {doubleTapIndicator && (
          <div className={`double-tap-indicator ${doubleTapIndicator.side}`}>
            <div className="tap-ripple"></div>
            <i
              className={`fas fa-${
                doubleTapIndicator.side === "left" ? "undo" : "redo"
              }`}
            ></i>
            <span>{doubleTapIndicator.seconds}s</span>
          </div>
        )}

        {/* Buffering indicator */}
        {isBuffering && (
          <div className="video-buffering">
            <div className="buffering-spinner"></div>
          </div>
        )}

        {/* Error overlay */}
        {videoError && (
          <div className="video-error-overlay">
            <i className="fas fa-exclamation-circle"></i>
            <p>{videoErrorMessage || "Không thể phát video"}</p>
            <button
              onClick={() => {
                setVideoError(false);
                setVideoErrorMessage(null);
                videoRef.current?.load();
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Play button overlay */}
        {!isPlaying && !videoError && !isBuffering && (
          <div className="play-overlay" onClick={togglePlay}>
            <button className="play-btn-large">
              <i className="fas fa-play"></i>
            </button>
          </div>
        )}

        {/* Video Controls */}
        <div className={`video-controls ${showControls ? "visible" : ""}`}>
          {/* Progress bar */}
          <div
            className="progress-container"
            ref={progressRef}
            onClick={handleProgressClick}
          >
            <div
              className="progress-buffered"
              style={{ width: `${buffered}%` }}
            ></div>
            <div
              className="progress-played"
              style={{
                width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              }}
            ></div>
            <div
              className="progress-thumb"
              style={{
                left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
              }}
            ></div>
          </div>

          {/* Control buttons */}
          <div className="controls-row">
            <div className="controls-left">
              <button className="control-btn" onClick={togglePlay}>
                <i className={`fas fa-${isPlaying ? "pause" : "play"}`}></i>
              </button>

              <button className="control-btn" onClick={() => skip(-10)}>
                <i className="fas fa-undo"></i>
                <span className="skip-text">10</span>
              </button>

              <button className="control-btn" onClick={() => skip(10)}>
                <i className="fas fa-redo"></i>
                <span className="skip-text">10</span>
              </button>

              <div className="volume-control">
                <button className="control-btn" onClick={toggleMute}>
                  <i
                    className={`fas fa-volume-${
                      isMuted ? "mute" : volume > 0.5 ? "up" : "down"
                    }`}
                  ></i>
                </button>
                <input
                  type="range"
                  className="volume-slider"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                />
              </div>

              <span className="time-display">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            <div className="controls-right">
              {/* Speed control */}
              <div className="speed-control">
                <button
                  className="control-btn speed-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSpeedMenu(!showSpeedMenu);
                  }}
                >
                  <span className="speed-label">{playbackSpeed}x</span>
                </button>
                {showSpeedMenu && (
                  <div className="speed-menu">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        className={`speed-option ${
                          playbackSpeed === speed ? "active" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          changePlaybackSpeed(speed);
                        }}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="control-btn" onClick={toggleFullscreen}>
                <i
                  className={`fas fa-${isFullscreen ? "compress" : "expand"}`}
                ></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="video-info-section">
        <h1 className="video-main-title">{video.title}</h1>
        <div className="video-meta">
          <span>{new Date(video.createdAt).toLocaleDateString("vi-VN")}</span>
          {duration > 0 && (
            <span className="video-duration-info">
              <i className="fas fa-clock"></i> {formatDuration(duration)}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="video-actions">
        <button className="video-action-btn" onClick={handleShare}>
          <i className="fas fa-share"></i>
          <span>Chia sẻ</span>
        </button>
        <button
          className={`video-action-btn ${saved ? "saved" : ""}`}
          onClick={() => {
            if (id) {
              const newState = toggleVideoFavorite(id);
              setSaved(newState);
            }
          }}
        >
          <i className={`${saved ? "fas" : "far"} fa-bookmark`}></i>
          <span>{saved ? "Đã lưu" : "Lưu"}</span>
        </button>
      </div>

      {/* Up Next Section */}
      {upNextVideos.length > 0 && (
        <div className="up-next-section">
          <h3 className="up-next-header">Video tiếp theo</h3>
          <div className="up-next-list">
            {upNextVideos.map((v) => (
              <div
                key={v._id}
                className="up-next-card"
                onClick={() => navigate(`/videos/${v._id}`)}
              >
                <div className="up-next-thumb">
                  <VideoThumbnail
                    videoId={v._id}
                    alt={v.title}
                    fallbackUrl={
                      v.thumbnail ||
                      `https://picsum.photos/seed/${v._id}/320/180`
                    }
                  />
                  <VideoDuration
                    videoId={v._id}
                    storedDuration={v.duration}
                    className="up-next-duration"
                  />
                </div>
                <div className="up-next-content">
                  <h4 className="up-next-title">{v.title}</h4>
                  <p className="up-next-meta">
                    {new Date(v.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
