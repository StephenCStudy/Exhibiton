import styled from "styled-components";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  icon?: string;
}

export default function ErrorState({
  message = "Đã có lỗi xảy ra",
  onRetry,
  icon = "fas fa-exclamation-triangle",
}: ErrorStateProps) {
  return (
    <StyledWrapper>
      <div className="error-state">
        <div className="error-icon-wrapper">
          <i className={icon}></i>
          <div className="error-pulse"></div>
        </div>
        <p className="error-message">{message}</p>
        {onRetry && (
          <button className="retry-btn" onClick={onRetry}>
            <i className="fas fa-redo"></i>
            Thử lại
          </button>
        )}
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    padding: 40px 24px;
    text-align: center;
    gap: 20px;
  }

  .error-icon-wrapper {
    position: relative;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .error-icon-wrapper i {
    font-size: 3rem;
    color: #ff6b6b;
    z-index: 1;
    animation: shake 0.5s ease-in-out;
  }

  .error-pulse {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: rgba(255, 107, 107, 0.2);
    animation: pulse 2s ease-out infinite;
  }

  .error-message {
    font-size: 1rem;
    color: var(--text-muted, #888);
    max-width: 280px;
    line-height: 1.5;
  }

  .retry-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background: linear-gradient(135deg, #00e5ff, #00b8d4);
    color: #000;
    border: none;
    border-radius: 12px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 229, 255, 0.3);
  }

  .retry-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 229, 255, 0.4);
  }

  .retry-btn:active {
    transform: translateY(0);
  }

  .retry-btn i {
    font-size: 0.85rem;
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-5px);
    }
    40% {
      transform: translateX(5px);
    }
    60% {
      transform: translateX(-5px);
    }
    80% {
      transform: translateX(5px);
    }
  }

  @keyframes pulse {
    0% {
      transform: scale(0.8);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.2);
      opacity: 0.3;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }
`;
