"use client";

import * as React from "react";
import { Toaster } from "sonner";
import type { ThemeName } from "@/lib/theme";

/** Toaster que acompanha o tema ativo (data-theme no <html>). */
export function ThemedToaster() {
  const [theme, setTheme] = React.useState<ThemeName>("dark");

  React.useEffect(() => {
    const root = document.documentElement;
    const sync = () =>
      setTheme(root.dataset.theme === "light" ? "light" : "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      toastOptions={{
        style: {
          background: "var(--surface-2)",
          border: "1px solid var(--border-strong)",
          color: "var(--text)",
        },
      }}
    />
  );
}
