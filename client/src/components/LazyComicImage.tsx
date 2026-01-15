import { useState, useEffect, useRef } from "react";
import {
  getCachedImage,
  setCachedImage,
  megaRequestQueue,
  isMegaRateLimited,
  isRequestFailed,
  markRequestFailed,
} from "../utils/imageCache";
import LoadingSpinner from "./LoadingSpinner";

interface LazyComicImageProps {
  src: string;
  alt: string;
  pageNumber: number;
  comicId: string;
  onLoad?: () => void;
}

export default function LazyComicImage({
  src,
  alt,
  pageNumber,
  comicId,
  onLoad,
}: LazyComicImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadStartedRef = useRef(false);

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
        rootMargin: "300px", // Start loading 300px before entering viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Load image when visible
  useEffect(() => {
    if (!isVisible || loadStartedRef.current) return;

    const cacheKey = `comic_page_${comicId}_${pageNumber}`;

    // Check cache first
    const cached = getCachedImage(cacheKey);
    if (cached) {
      setImageSrc(cached);
      setIsLoading(false);
      onLoad?.();
      return;
    }

    // Check if this request already failed recently
    if (isRequestFailed(cacheKey)) {
      setHasError(true);
      setIsLoading(false);
      onLoad?.();
      return;
    }

    // Check if rate limited
    const rateLimit = isMegaRateLimited();
    if (rateLimit.isLimited) {
      setHasError(true);
      setIsLoading(false);
      onLoad?.();
      return;
    }

    loadStartedRef.current = true;

    // Use queue for Mega requests
    megaRequestQueue.add(async () => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          try {
            // Cache as data URL
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
              setCachedImage(cacheKey, dataUrl);
              setImageSrc(dataUrl);
            } else {
              setImageSrc(src);
            }
          } catch {
            setImageSrc(src);
          }
          setIsLoading(false);
          onLoad?.();
          resolve();
        };

        img.onerror = () => {
          markRequestFailed(cacheKey);
          setHasError(true);
          setIsLoading(false);
          onLoad?.();
          resolve();
        };

        // Add timeout
        const timeout = setTimeout(() => {
          if (isLoading) {
            setHasError(true);
            setIsLoading(false);
            resolve();
          }
        }, 30000); // 30 second timeout for comic pages

        img.src = src;

        // Clean up timeout on success
        img.onload = () => {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
              setCachedImage(cacheKey, dataUrl);
              setImageSrc(dataUrl);
            } else {
              setImageSrc(src);
            }
          } catch {
            setImageSrc(src);
          }
          setIsLoading(false);
          onLoad?.();
          resolve();
        };
      });
    });
  }, [isVisible, src, comicId, pageNumber, onLoad]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        minHeight: "400px",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1a2e",
      }}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <LoadingSpinner />
          <span>Trang {pageNumber}</span>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div
          style={{
            width: "100%",
            height: "400px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "rgba(255,255,255,0.6)",
            backgroundColor: "#1a1a2e",
          }}
        >
          <i
            className="fas fa-exclamation-triangle"
            style={{ fontSize: "24px" }}
          ></i>
          <span>Không thể tải trang {pageNumber}</span>
        </div>
      )}

      {/* Actual image */}
      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          style={{
            width: "100%",
            height: "auto",
            opacity: isLoading ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}
