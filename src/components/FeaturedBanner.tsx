import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useBanner } from "@/hooks/useBanner";

const FeaturedBanner = () => {
  const { config, loading } = useSiteConfig();
  const [dismissed, setDismissed] = useState(false);
  const { setBannerHeight } = useBanner();
  const ref = useRef<HTMLDivElement>(null);

  const isVisible = !loading && config.featured_banner_enabled && !!config.featured_banner_text && !dismissed;

  useEffect(() => {
    if (isVisible && ref.current) {
      setBannerHeight(ref.current.offsetHeight);
    } else {
      setBannerHeight(0);
    }
    return () => setBannerHeight(0);
  }, [isVisible, setBannerHeight]);

  if (!isVisible) return null;

  const content = (
    <div ref={ref} className="bg-primary text-primary-foreground text-center py-2 px-4 text-sm font-medium relative">
      <span>{config.featured_banner_text}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDismissed(true);
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  if (config.featured_banner_link) {
    return <Link to={config.featured_banner_link}>{content}</Link>;
  }

  return content;
};

export default FeaturedBanner;
