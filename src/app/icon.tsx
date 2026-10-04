import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 96,
        }}
      >
        <div
          style={{
            fontSize: 220,
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
