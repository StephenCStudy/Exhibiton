import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  // Use useLayoutEffect to scroll before paint
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Also use useEffect as fallback
  useEffect(() => {
    // Scroll to top immediately
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
};

export default ScrollToTop;
