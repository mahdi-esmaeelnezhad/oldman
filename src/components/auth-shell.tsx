import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import type { ReactNode } from "react";
import { brand } from "@/config/brand";
import { LanguageSwitcher } from "@/i18n/language-switcher";
import { getI18n } from "@/i18n/server";

type AuthShellProps = {
  children: ReactNode;
  /** When true (default), fills the viewport without page scroll. */
  lockViewport?: boolean;
};

export async function AuthShell({ children, lockViewport = true }: AuthShellProps) {
  const { brandName } = await getI18n();

  return (
    <Box
      sx={{
        height: lockViewport ? "100dvh" : "auto",
        minHeight: "100dvh",
        overflow: lockViewport ? "hidden" : "auto",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 2,
        bgcolor: "#FAFBFD",
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(32, 175, 236, 0.18), transparent 55%)",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 10,
          insetInlineEnd: 10,
          zIndex: 2,
        }}
      >
        <LanguageSwitcher />
      </Box>

      {/* Soft curved brand wash — Art of Plants inspired, compact */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          insetInline: 0,
          top: 0,
          height: 140,
          background: brand.gradient,
          borderBottomLeftRadius: "50% 28%",
          borderBottomRightRadius: "50% 28%",
          opacity: 0.95,
        }}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.75,
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: "#fff",
            display: "grid",
            placeItems: "center",
            border: "1px solid",
            borderColor: "rgba(11, 127, 191, 0.16)",
            mt: { xs: 1, sm: 0.5 },
          }}
        >
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: brand.gradient,
              display: "grid",
              placeItems: "center",
            }}
          >
            <FavoriteRoundedIcon sx={{ color: "#fff", fontSize: 26 }} />
          </Box>
        </Box>

        <Typography
          component="p"
          sx={{
            m: 0,
            fontWeight: 500,
            fontSize: "1.05rem",
            color: "text.primary",
            letterSpacing: "-0.01em",
            textAlign: "center",
          }}
        >
          {brandName}
        </Typography>

        <Box
          sx={{
            width: "100%",
            bgcolor: "#fff",
            borderRadius: 1.5,
            px: { xs: 2.5, sm: 3 },
            py: { xs: 2.5, sm: 3 },
            border: "1px solid",
            borderColor: "rgba(11, 127, 191, 0.14)",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
