import Paper from "@mui/material/Paper";
import type { PaperProps } from "@mui/material/Paper";
import type { ReactNode } from "react";

type SurfaceCardProps = {
  children: ReactNode;
  sx?: PaperProps["sx"];
};

/** Flat white card — borders only, never shadows. */
export function SurfaceCard({ children, sx }: SurfaceCardProps) {
  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.25 },
        borderRadius: 1,
        bgcolor: "background.paper",
        boxShadow: "none",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
