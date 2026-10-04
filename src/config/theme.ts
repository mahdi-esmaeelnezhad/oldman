import { createTheme } from "@mui/material/styles";
import { brand } from "@/config/brand";
import { locale } from "@/config/locale";

export const theme = createTheme({
  direction: locale.direction,
  palette: {
    mode: "light",
    primary: {
      main: brand.color,
      dark: brand.colorDeep,
      light: "#4CC3F0",
      contrastText: "#ffffff",
    },
    background: {
      default: "#F4F8FB",
      paper: "#ffffff",
    },
    text: {
      primary: "#123047",
      secondary: "#5A7184",
    },
    divider: "rgba(11, 127, 191, 0.14)",
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "var(--font-vazirmatn), sans-serif",
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h4: {
      fontWeight: 500,
      fontSize: "1.35rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.35,
    },
    h5: {
      fontWeight: 500,
      fontSize: "1.15rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
    },
    h6: {
      fontWeight: 500,
      fontSize: "1rem",
      lineHeight: 1.4,
    },
    subtitle1: { fontWeight: 500, fontSize: "0.95rem" },
    subtitle2: { fontWeight: 500, fontSize: "0.85rem" },
    body1: { fontWeight: 400, fontSize: "0.925rem", lineHeight: 1.55 },
    body2: { fontWeight: 400, fontSize: "0.825rem", lineHeight: 1.5 },
    button: { fontWeight: 500, textTransform: "none", fontSize: "0.875rem" },
    caption: { fontWeight: 400, fontSize: "0.75rem" },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingInline: 16,
          paddingBlock: 8,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
          "&:active": { boxShadow: "none" },
        },
        contained: {
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        outlined: {
          borderWidth: 1,
          "&:hover": {
            borderWidth: 1,
            backgroundColor: "rgba(11, 127, 191, 0.06)",
            boxShadow: "none",
          },
        },
        sizeSmall: {
          paddingInline: 12,
          paddingBlock: 6,
          fontSize: "0.8125rem",
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: true,
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: "#F7FBFD",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(11, 127, 191, 0.45)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: 1,
          },
        },
        notchedOutline: {
          borderColor: "rgba(11, 127, 191, 0.18)",
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
        },
        outlined: {
          borderColor: "rgba(11, 127, 191, 0.14)",
          boxShadow: "none",
        },
        elevation0: { boxShadow: "none" },
        elevation1: { boxShadow: "none" },
        elevation2: { boxShadow: "none" },
        elevation3: { boxShadow: "none" },
        elevation4: { boxShadow: "none" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { boxShadow: "none" },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          boxShadow: "none",
          border: "1px solid rgba(11, 127, 191, 0.14)",
          borderRadius: 12,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
  },
});
