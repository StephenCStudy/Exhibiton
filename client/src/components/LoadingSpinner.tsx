interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = "medium",
  text,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizes = {
    small: { spinner: 32, border: 3 },
    medium: { spinner: 48, border: 4 },
    large: { spinner: 64, border: 5 },
  };

  const currentSize = sizes[size];

  const content = (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          position: "relative",
          width: `${currentSize.spinner}px`,
          height: `${currentSize.spinner}px`,
          margin: "0 auto",
        }}
      >
        {/* Background ring */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            border: `${currentSize.border}px solid var(--surface-highlight)`,
            borderRadius: "50%",
          }}
        />
        {/* Primary spinner */}
        <div
          className="animate-spin"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            border: `${currentSize.border}px solid transparent`,
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
          }}
        />
        {/* Secondary spinner (reverse) */}
        <div
          className="animate-spin"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            border: `${currentSize.border}px solid transparent`,
            borderTopColor: "var(--secondary)",
            borderRadius: "50%",
            animation: "spin 1.5s linear infinite reverse",
            opacity: 0.5,
          }}
        />
      </div>
      {text && (
        <p
          style={{
            marginTop: "16px",
            color: "var(--text-muted)",
            fontSize:
              size === "small"
                ? "0.75rem"
                : size === "large"
                ? "1rem"
                : "0.875rem",
            fontWeight: 500,
          }}
        >
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 17, 21, 0.95)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        {content}
      </div>
    );
  }

  return <div style={{ padding: "40px 0" }}>{content}</div>;
}
