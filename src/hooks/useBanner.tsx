import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface BannerContextType {
  bannerHeight: number;
  setBannerHeight: (h: number) => void;
}

const BannerContext = createContext<BannerContextType>({ bannerHeight: 0, setBannerHeight: () => {} });

export const BannerProvider = ({ children }: { children: ReactNode }) => {
  const [bannerHeight, setBannerHeight] = useState(0);
  return (
    <BannerContext.Provider value={{ bannerHeight, setBannerHeight }}>
      {children}
    </BannerContext.Provider>
  );
};

export const useBanner = () => useContext(BannerContext);
