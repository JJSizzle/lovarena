"use client";

import { useEffect, useState } from "react";
import {
  BOTTOM_CHROME_EVENT,
  isCookieBannerVisible,
} from "@/lib/bottom-chrome";

export function PageBottomPad({ children }: { children: React.ReactNode }) {
  const [padClass, setPadClass] = useState("");

  useEffect(() => {
    function update() {
      setPadClass(isCookieBannerVisible() ? "pb-36" : "");
    }

    update();
    window.addEventListener(BOTTOM_CHROME_EVENT, update);
    return () => window.removeEventListener(BOTTOM_CHROME_EVENT, update);
  }, []);

  return (
    <div className={`flex flex-col min-h-full flex-1 ${padClass}`}>{children}</div>
  );
}
