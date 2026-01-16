import { useRef, useEffect, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Default placeholder image when no thumbnail is available
const DEFAULT_THUMBNAIL = "https://i.imgur.com/2wKqGBl.png";

interface VideoThumbnailProps {
  videoId: string;
  alt: string;
  className?: string;
  fallbackUrl?: string;
  thumbnailFromDb?: string; // Thumbnail already saved in database (base64 or URL)
  onDurationLoaded?: (duration: number) => void;
}

// Generate a consistent color based on video ID
function generateColorFromId(id: string): {
  primary: string;
  secondary: string;
} {
  // Create a simple hash from the ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate hue from hash (0-360)
  const hue = Math.abs(hash % 360);

  // Create two colors with different lightness
  const primary = `hsl(${hue}, 70%, 25%)`;
  const secondary = `hsl(${(hue + 30) % 360}, 60%, 15%)`;

  return { primary, secondary };
}

export default function VideoThumbnail({
  videoId,
  alt,
  className = "",
  thumbnailFromDb,
}: VideoThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "100px",
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Try to load thumbnail when visible
  useEffect(() => {
    if (isVisible && !thumbnailUrl && !thumbnailError) {
      // Priority 1: Use thumbnail from database if available (base64 or URL)
      if (
        thumbnailFromDb &&
        thumbnailFromDb.trim() !== "" &&
        !thumbnailFromDb.includes("picsum.photos")
      ) {
        setThumbnailUrl(thumbnailFromDb);
        return;
      }

      // Priority 2: Use the backend thumbnail extraction endpoint
      const url = `${API_BASE_URL}/videos/${videoId}/thumbnail`;
      setThumbnailUrl(url);
    }
  }, [isVisible, videoId, thumbnailUrl, thumbnailError, thumbnailFromDb]);

  // When thumbnail error occurs, use default placeholder
  const handleImageError = () => {
    // If already using default, show gradient
    if (thumbnailUrl === DEFAULT_THUMBNAIL) {
      setThumbnailError(true);
      setThumbnailUrl(null);
    } else {
      // Try default placeholder
      setThumbnailUrl(DEFAULT_THUMBNAIL);
    }
  };

  const colors = generateColorFromId(videoId);

  // If thumbnail loaded successfully, show it
  if (thumbnailUrl && !thumbnailError) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          background: "#1a1a2e",
          overflow: "hidden",
        }}
      >
        <img
          src={thumbnailUrl}
          alt={alt}
          onError={handleImageError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    );
  }

  // Fallback to gradient placeholder
  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: isVisible
          ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`
          : "#1a1a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Video icon */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          color: "rgba(255, 255, 255, 0.5)",
        }}
      >
        <i
          className="fas fa-film"
          style={{ fontSize: "32px", opacity: 0.6 }}
        ></i>
        <span
          style={{
            fontSize: "11px",
            maxWidth: "90%",
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: 0.7,
          }}
        >
          {alt}
        </span>
      </div>

      {/* Decorative elements */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          right: "-20%",
          width: "60%",
          height: "60%",
          background: "rgba(255, 255, 255, 0.05)",
          borderRadius: "50%",
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-10%",
          width: "40%",
          height: "40%",
          background: "rgba(0, 229, 255, 0.08)",
          borderRadius: "50%",
          filter: "blur(15px)",
        }}
      />
    </div>
  );
}
