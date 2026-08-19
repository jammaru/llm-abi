(() => {
  const key = "llm-abi-locale";
  let locale = "en";
  try {
    const stored = localStorage.getItem(key);
    if (stored === "en" || stored === "ja") {
      locale = stored;
    } else {
      const languages = navigator.languages ?? [navigator.language];
      if (languages.some((language) => String(language).toLowerCase().startsWith("ja"))) {
        locale = "ja";
      }
    }
  } catch {
    /* private mode */
  }
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
})();
