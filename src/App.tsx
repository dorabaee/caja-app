import { ThemeProvider } from "@ui/theme/ThemeProvider";
import { ToastHost } from "@ui/common";
import { Root } from "@ui/app/Root";
import { ModalsHost } from "@ui/app/ModalsHost";
import { Tour } from "@ui/app/Tour";
import { useGlobalKeys } from "@ui/hooks/useGlobalKeys";

export default function App() {
  useGlobalKeys();
  return (
    <ThemeProvider>
      <Root />
      <ModalsHost />
      <ToastHost />
      <Tour />
    </ThemeProvider>
  );
}
