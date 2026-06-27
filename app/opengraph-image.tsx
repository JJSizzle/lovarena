import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const runtime = "edge";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e1b4b, #312e81, #581c87)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: 4 }}>
          LOVARENA
        </div>
        <div style={{ fontSize: 28, marginTop: 16, opacity: 0.9 }}>
          Random video & text chat
        </div>
        <div style={{ fontSize: 20, marginTop: 24, opacity: 0.7 }}>
          Match by region · interests · vibe
        </div>
      </div>
    ),
    { ...size }
  );
}
