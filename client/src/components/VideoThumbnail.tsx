import { useRef, useEffect, useState } from "react";

interface VideoThumbnailProps {
  videoId: string;
  alt: string;
  className?: string;
  fallbackUrl?: string;
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
}: VideoThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  const colors = generateColorFromId(videoId);

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
