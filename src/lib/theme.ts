export type ThemeName = "dark" | "light";

/** Normaliza a preferência salva (qualquer valor inválido cai para escuro). */
export function resolveTheme(prefs: Record<string, unknown> | null | undefined): ThemeName {
  return prefs?.theme === "light" ? "light" : "dark";
}

/**
 * Aplica o tema ao documento: `data-theme` troca os design tokens
 * (globals.css) e a classe `dark` aciona as variantes `dark:` do Tailwind.
 * Seguro para chamar no servidor (não faz nada sem `document`).
 */
export function applyTheme(theme: ThemeName): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") {
    root.dataset.theme = "light";
    root.classList.remove("dark");
  } else {
    delete root.dataset.theme;
    root.classList.add("dark");
  }
}
