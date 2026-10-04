import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brand.gradient,
        }}
      >
        <div
          style={{
            fontSize: 88,
            color: "white",
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          ♥
        </div>
      </div>
    ),
    { ...size },
  );
}
