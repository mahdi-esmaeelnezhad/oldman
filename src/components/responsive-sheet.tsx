"use client";

import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { ReactNode } from "react";

type ResponsiveSheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: "xs" | "sm" | "md";
};

/** Dialog on desktop; bottom sheet on mobile. */
export function ResponsiveSheet({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = "sm",
}: ResponsiveSheetProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: false }}
        slotProps={{
          paper: {
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "92dvh",
              boxShadow: "none",
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
            },
          },
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 4,
            borderRadius: 999,
            bgcolor: "divider",
            mx: "auto",
            mt: 1.25,
            mb: 0.75,
            flexShrink: 0,
          }}
        />
        <Typography
          component="h2"
          variant="h6"
          sx={{ px: 2, pb: 1, fontWeight: 500, flexShrink: 0 }}
        >
          {title}
        </Typography>
        <Box
          sx={{
            px: 2,
            pb: actions ? 1 : 2,
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </Box>
        {actions ? (
          <Box
            sx={{
              px: 2,
              pt: 1,
              pb: "max(12px, env(safe-area-inset-bottom))",
              display: "flex",
              flexDirection: "column-reverse",
              gap: 1,
              borderTop: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            {actions}
          </Box>
        ) : null}
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth}>
      <DialogTitle sx={{ fontWeight: 500 }}>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions ? (
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>{actions}</DialogActions>
      ) : null}
    </Dialog>
  );
}
