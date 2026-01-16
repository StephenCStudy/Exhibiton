import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { videoApi } from "../../utils/api";
import type { Video, ApiResponse } from "../../utils/types";
import { getVideoName } from "../../utils/types";
import { videoCache } from "../../utils/sessionCache";
import Loader from "../../components/loader.universe";
import ErrorState from "../../components/ErrorState";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbnailCapturedRef = useRef(false);
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
      // Reset video player state when video changes
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setBuffered(0);
      setVideoError(false);
      setVideoErrorMessage(null);
      setIsBuffering(false);
      thumbnailCapturedRef.current = false; // Reset thumbnail capture flag

      // Reset video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }

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

      // Try cache first
      const cached = videoCache.getById(id!);
      if (cached) {
        setVideo(cached);
        setLoading(false);
        // Still fetch fresh data in background
        fetchVideoInBackground();
        return;
      }

      const response: ApiResponse<Video> = await videoApi.getById(id!);
      if (response.success && response.data) {
        setVideo(response.data);
        // Cache the video
        videoCache.saveById(id!, response.data);
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

  // Fetch in background without loading state
  const fetchVideoInBackground = async () => {
    try {
      const response: ApiResponse<Video> = await videoApi.getById(id!);
      if (response.success && response.data) {
        setVideo(response.data);
        videoCache.saveById(id!, response.data);
      }
    } catch (err) {
      console.error("Background fetch failed:", err);
    }
  };

  const fetchAllVideos = async () => {
    try {
      // Try cache first
      const cached = videoCache.getAll();
      if (cached && cached.length > 0) {
        setAllVideos(cached);
        return;
      }

      const response: ApiResponse<Video[]> = await videoApi.getAll();
      if (response.success && response.data) {
        setAllVideos(response.data);
        videoCache.saveAll(response.data);
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
        title: video?.name,
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
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setVideoError(false);

      // Auto-update duration to MongoDB if not set
      if (
        video &&
        (!video.duration || video.duration === 0) &&
        videoDuration > 0
      ) {
        updateVideoMetadata(Math.floor(videoDuration));
      }
    }
  };

  // Update video metadata (duration) to MongoDB
  const updateVideoMetadata = async (newDuration: number) => {
    if (!id || !video) return;

    try {
      const response = await videoApi.update(id, { duration: newDuration });
      if (response.success && response.data) {
        // Update local state
        setVideo(response.data);
        // Update cache
        videoCache.updateVideo(id, { duration: newDuration });
        console.log(`✅ Updated video duration: ${newDuration}s`);
      }
    } catch (err) {
      console.error("Failed to update video metadata:", err);
    }
  };

  // Capture thumbnail from video at specific time
  const captureThumbnail = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    // Set canvas size to video size (scaled down for thumbnail)
    const maxWidth = 640;
    const maxHeight = 360;
    const scale = Math.min(
      maxWidth / video.videoWidth,
      maxHeight / video.videoHeight
    );

    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG (smaller size)
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  // Auto-capture and update thumbnail when video plays
  const handleCanPlayThrough = useCallback(() => {
    if (!video || !id || thumbnailCapturedRef.current) return;

    // Only capture if thumbnail is empty or is a placeholder
    const needsThumbnail =
      !video.thumbnail ||
      video.thumbnail === "" ||
      video.thumbnail.includes("picsum.photos");

    if (needsThumbnail && videoRef.current) {
      // Seek to 1 second to get a meaningful frame
      const captureTime = Math.min(1, videoRef.current.duration * 0.1);

      // Store current time and playing state
      const wasPlaying = !videoRef.current.paused;
      const originalTime = videoRef.current.currentTime;

      // Temporarily seek to capture time
      videoRef.current.currentTime = captureTime;

      // Wait for seek to complete then capture
      const onSeeked = async () => {
        videoRef.current?.removeEventListener("seeked", onSeeked);

        const thumbnailData = captureThumbnail();
        if (thumbnailData) {
          thumbnailCapturedRef.current = true;
          await updateVideoThumbnail(thumbnailData);
        }

        // Restore original position
        if (videoRef.current) {
          videoRef.current.currentTime = originalTime;
          if (wasPlaying) {
            videoRef.current.play();
          }
        }
      };

      videoRef.current.addEventListener("seeked", onSeeked);
    }
  }, [video, id, captureThumbnail]);

  // Update video thumbnail to MongoDB
  const updateVideoThumbnail = async (thumbnailData: string) => {
    if (!id || !video) return;

    try {
      const response = await videoApi.update(id, { thumbnail: thumbnailData });
      if (response.success && response.data) {
        // Update local state
        setVideo(response.data);
        // Update cache
        videoCache.updateVideo(id, { thumbnail: thumbnailData });
        console.log(`✅ Updated video thumbnail`);
      }
    } catch (err) {
      console.error("Failed to update video thumbnail:", err);
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

  const skip = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          // Show indicator
          setDoubleTapIndicator({
            show: true,
            side: "left",
            seconds: 10,
          });
          setTimeout(() => setDoubleTapIndicator(null), 500);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          // Show indicator
          setDoubleTapIndicator({
            show: true,
            side: "right",
            seconds: 10,
          });
          setTimeout(() => setDoubleTapIndicator(null), 500);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (videoRef.current) {
            const newVolume = Math.min(1, volume + 0.1);
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            sessionStorage.setItem("videoVolume", newVolume.toString());
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (videoRef.current) {
            const newVolume = Math.max(0, volume - 0.1);
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            sessionStorage.setItem("videoVolume", newVolume.toString());
          }
          break;
        case "KeyM":
          toggleMute();
          break;
        case "KeyF":
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [skip, volume]);

  // Playback speed control
  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    sessionStorage.setItem("videoPlaybackSpeed", speed.toString());
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  // Handle video container click - single tap to toggle play, double tap to seek
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const handleVideoContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't handle if clicking on controls
    const target = e.target as HTMLElement;
    if (
      target.closest(".video-controls") ||
      target.closest(".play-overlay") ||
      target.closest(".video-error-overlay")
    ) {
      return;
    }

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
      // Cancel single tap action
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }

      // Double tap - seek
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
      // Single tap - toggle play/pause after delay
      lastTapRef.current = { time: now, side };

      // Clear previous timeout
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }

      // Delay to check for double tap
      singleTapTimeoutRef.current = setTimeout(() => {
        togglePlay();
        singleTapTimeoutRef.current = null;
      }, 300);
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
        <Loader />
      </div>
    );
  }

  if (error || !video) {
    return (
      <ErrorState
        message={error || "Không tìm thấy video"}
        onRetry={fetchVideo}
      />
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
        onClick={handleVideoContainerClick}
      >
        <video
          ref={videoRef}
          className="video-player"
          src={`${API_BASE_URL}/videos/${video._id}/stream`}
          poster={
            video.thumbnail || `https://picsum.photos/seed/${video._id}/640/360`
          }
          crossOrigin="anonymous"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onCanPlayThrough={handleCanPlayThrough}
          onError={handleVideoError}
          onWaiting={() => setIsBuffering(true)}
          onCanPlay={() => setIsBuffering(false)}
          playsInline
        />

        {/* Hidden canvas for thumbnail capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

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
        <h1 className="video-main-title">{getVideoName(video)}</h1>
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
                    alt={getVideoName(v)}
                    thumbnailFromDb={v.thumbnail}
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
                  <h4 className="up-next-title">{v.name}</h4>
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
