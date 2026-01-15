import "./Pagination.css";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const showEllipsis = totalPages > 7;

  if (showEllipsis) {
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    }
  } else {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  }

  const handleClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    page: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    onPageChange(page);
  };

  return (
    <div className="pagination" onClick={(e) => e.stopPropagation()}>
      <button
        className="pagination-btn"
        onClick={(e) => handleClick(e, currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div className="pagination-pages">
        {pages.map((page, index) =>
          typeof page === "number" ? (
            <button
              key={index}
              className={`pagination-page ${
                page === currentPage ? "active" : ""
              }`}
              onClick={(e) => handleClick(e, page)}
              type="button"
            >
              {page}
            </button>
          ) : (
            <span key={index} className="pagination-ellipsis">
              {page}
            </span>
          )
        )}
      </div>

      <button
        className="pagination-btn"
        onClick={(e) => handleClick(e, currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        type="button"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
}
