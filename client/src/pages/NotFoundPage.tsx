import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        textAlign: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          fontSize: "6rem",
          fontWeight: 900,
          background:
            "linear-gradient(135deg, var(--primary), var(--secondary))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 16,
        }}
      >
        404
      </div>
      <p
        style={{
          color: "var(--text-muted)",
          marginBottom: 32,
          fontSize: "1rem",
        }}
      >
        Không tìm thấy trang bạn yêu cầu.
      </p>
      <Link
        to="/"
        className="btn btn-primary"
        style={{ textDecoration: "none" }}
      >
        <i className="fas fa-home" style={{ marginRight: 8 }}></i>
        Về trang chủ
      </Link>
    </div>
  );
}
