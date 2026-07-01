"use client";

import { useEffect, useState } from "react";
import {
  BOTTOM_CHROME_EVENT,
  isCookieBannerVisible,
} from "@/lib/bottom-chrome";

function computeOffsets() {
  const cookieVisible = isCookieBannerVisible();
  return {
    message: cookieVisible ? "bottom-32" : "bottom-24",
    activity: cookieVisible ? "bottom-48" : "bottom-40",
  };
}

/** Fixed toast positions that clear cookie consent and bottom UI chrome. */
export function useToastBottomOffset() {
  const [offsets, setOffsets] = useState(computeOffsets);

  useEffect(() => {
    function update() {
      setOffsets(computeOffsets());
    }

    update();
    window.addEventListener(BOTTOM_CHROME_EVENT, update);
    return () => window.removeEventListener(BOTTOM_CHROME_EVENT, update);
  }, []);

  return offsets;
}
