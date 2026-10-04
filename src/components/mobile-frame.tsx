import Box from "@mui/material/Box";
import type { ReactNode } from "react";

export const MOBILE_FRAME_WIDTH = 360;

type MobileFrameProps = {
  children: ReactNode;
};

/** Centers app content at phone width on desktop browsers. */
export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        bgcolor: "#DCE6EE",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: MOBILE_FRAME_WIDTH,
          minHeight: "100dvh",
          bgcolor: "background.default",
          borderInline: { xs: "none", sm: "1px solid" },
          borderColor: { sm: "rgba(11, 127, 191, 0.14)" },
          boxShadow: { xs: "none", sm: "0 0 0 1px rgba(18, 48, 71, 0.04)" },
          overflowX: "hidden",
          position: "relative",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
