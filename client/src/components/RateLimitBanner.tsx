import { useState, useEffect } from "react";
import { isMegaRateLimited } from "../utils/imageCache";

export default function RateLimitBanner() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    const checkRateLimit = () => {
      const rateLimit = isMegaRateLimited();
      if (rateLimit.isLimited) {
        const seconds = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
        setTimeLeft(seconds > 0 ? seconds : null);
      } else {
        setTimeLeft(null);
      }
    };

    checkRateLimit();
    const interval = setInterval(checkRateLimit, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) return null;

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(90deg, #ff6b35 0%, #f7931e 100%)",
        color: "white",
        padding: "10px 16px",
        fontSize: "14px",
        fontWeight: 500,
        textAlign: "center",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      <i className="fas fa-exclamation-triangle"></i>
      <span>
        Mega bandwidth limit reached. Images will be available in{" "}
        <strong>{formatTime(timeLeft)}</strong>
      </span>
    </div>
  );
}
