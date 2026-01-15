interface VideoDurationProps {
  videoId: string;
  storedDuration?: number; // Duration from database (in seconds)
  className?: string;
}

// Format duration from seconds to mm:ss or hh:mm:ss
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return "--:--";

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

export default function VideoDuration({
  storedDuration,
  className = "",
}: VideoDurationProps) {
  // Only show duration if we have it stored
  // Don't try to load video metadata as it causes rate limiting issues
  return (
    <span className={className}>
      {storedDuration && storedDuration > 0
        ? formatDuration(storedDuration)
        : "--:--"}
    </span>
  );
}
