import { useState, useEffect, useRef } from "react";
import {
  getCachedImage,
  setCachedImage,
  megaRequestQueue,
  isMegaRateLimited,
  isRequestFailed,
  markRequestFailed,
  setMegaRateLimited,
} from "../utils/imageCache";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  cacheKey?: string; // Unique key for caching
  placeholderColor?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function LazyImage({
  src,
  alt,
  className = "",
  fallbackSrc = "https://via.placeholder.com/200x300?text=Loading...",
  cacheKey,
  placeholderColor = "#1a1a2e",
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

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
        rootMargin: "100px", // Start loading 100px before entering viewport
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || loadedRef.current) return;

    const loadImage = async () => {
      loadedRef.current = true;
      const key = cacheKey || src;

      // Check cache first
      const cached = getCachedImage(key);
      if (cached) {
        setImageSrc(cached);
        setIsLoading(false);
        return;
      }

      // Check if this request already failed recently
      if (isRequestFailed(key)) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      // Check if rate limited
      const rateLimit = isMegaRateLimited();
      if (rateLimit.isLimited) {
        // Use fallback image without making request
        setHasError(true);
        setIsLoading(false);
        return;
      }

      // Check if this is a Mega API URL (needs throttling)
      const isMegaUrl = src.includes("/cover") || src.includes("/stream");

      try {
        if (isMegaUrl) {
          // Use queue for Mega requests
          await megaRequestQueue.add(async () => {
            await loadAndCacheImage(src, key);
          });
        } else {
          await loadAndCacheImage(src, key);
        }
      } catch (error) {
        console.error("Failed to load image:", error);
        markRequestFailed(key);
        setHasError(true);
        setIsLoading(false);
      }
    };

    const loadAndCacheImage = async (url: string, key: string) => {
      // First, try to fetch to check for rate limiting
      try {
        const response = await fetch(url, { method: "HEAD" });
        if (response.status === 429) {
          const timeLimit = response.headers.get("X-Rate-Limit-Reset");
          if (timeLimit) {
            setMegaRateLimited(parseInt(timeLimit));
          }
          throw new Error("Rate limited");
        }
      } catch (headError) {
        // If HEAD fails, proceed with loading (might work for some browsers)
      }

      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          // Try to cache as data URL for Mega images
          if (url.includes(API_BASE_URL)) {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                setCachedImage(key, dataUrl);
                setImageSrc(dataUrl);
              } else {
                setImageSrc(url);
              }
            } catch {
              // CORS or other issues, just use URL
              setImageSrc(url);
            }
          } else {
            setImageSrc(url);
          }
          setIsLoading(false);
          resolve();
        };

        img.onerror = () => {
          markRequestFailed(key);
          setHasError(true);
          setIsLoading(false);
          reject(new Error("Image load failed"));
        };

        img.src = url;
      });
    };

    loadImage();
  }, [isVisible, src, cacheKey]);

  // Render fallback if error
  if (hasError) {
    return (
      <div ref={imgRef} className={className}>
        <img
          src={fallbackSrc}
          alt={alt}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={className}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Placeholder */}
      {isLoading && (
        <div
          className="lazy-image-placeholder"
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(135deg, ${placeholderColor} 0%, ${placeholderColor}dd 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="lazy-image-spinner"
            style={{
              width: "24px",
              height: "24px",
              border: "2px solid rgba(255,255,255,0.2)",
              borderTopColor: "rgba(255,255,255,0.8)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      )}

      {/* Actual image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: isLoading ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
          onError={() => setHasError(true)}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
