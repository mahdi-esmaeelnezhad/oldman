import { createTheme } from "@mui/material/styles";
import { brand } from "@/config/brand";
import { locale } from "@/config/locale";

export const theme = createTheme({
  direction: locale.direction,
  palette: {
    primary: {
      main: brand.color,
    },
  },
  typography: {
    fontFamily: "var(--font-vazirmatn), sans-serif",
  },
});
