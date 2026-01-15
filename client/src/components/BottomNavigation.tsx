import { useLocation, useNavigate } from "react-router-dom";
import "./BottomNavigation.css";

interface NavItemProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, isActive, onClick }: NavItemProps) {
  return (
    <button
      className={`nav-item ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      <i className={`${icon} nav-icon`}></i>
      <span className="nav-label">{label}</span>
      {isActive && <span className="nav-indicator"></span>}
    </button>
  );
}

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === "/";
  const isComic = location.pathname.startsWith("/comics");
  const isVideo = location.pathname.startsWith("/videos");
  const isDashboard = location.pathname.startsWith("/dashboard");

  return (
    <nav className="bottom-navigation">
      <div className="nav-container">
        <NavItem
          icon="fas fa-home"
          label="Home"
          isActive={isHome}
          onClick={() => navigate("/")}
        />
        <NavItem
          icon="fas fa-book-open"
          label="Comics"
          isActive={isComic}
          onClick={() => navigate("/comics")}
        />
        <NavItem
          icon="fas fa-play-circle"
          label="Videos"
          isActive={isVideo}
          onClick={() => navigate("/videos")}
        />
        <NavItem
          icon="fas fa-user"
          label="Dashboard"
          isActive={isDashboard}
          onClick={() => navigate("/dashboard")}
        />
      </div>
    </nav>
  );
}
