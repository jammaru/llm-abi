(() => {
  const key = "llm-abi-theme";
  let preference = "auto";
  try {
    const stored = localStorage.getItem(key);
    if (stored === "light" || stored === "dark") {
      preference = stored;
    }
  } catch {
    /* private mode */
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved =
    preference === "dark" || (preference === "auto" && prefersDark) ? "dark" : "light";
  document.documentElement.dataset.theme = resolved;
})();
