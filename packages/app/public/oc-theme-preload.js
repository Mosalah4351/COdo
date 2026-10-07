;(function () {
  var key = "codo-theme-id"
  var themeId = localStorage.getItem(key) || "COdo"

  if (themeId === "oc-1" || themeId === "oc-2") {
    themeId = "COdo"
    localStorage.setItem(key, themeId)
    localStorage.removeItem("codo-theme-css-light")
    localStorage.removeItem("codo-theme-css-dark")
  }

  var scheme = localStorage.getItem("codo-color-scheme") || "system"
  var isDark = scheme === "dark" || (scheme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  var mode = isDark ? "dark" : "light"

  document.documentElement.dataset.theme = themeId
  document.documentElement.dataset.colorScheme = mode

  // Update theme-color meta tag to match app color scheme
  var metas = document.querySelectorAll("meta[name='theme-color']")
  if (metas.length > 0) metas[0].setAttribute("content", isDark ? "#131010" : "#F8F7F7")

  if (themeId === "COdo") return

  var css = localStorage.getItem("codo-theme-css-" + mode)
  if (css) {
    var style = document.createElement("style")
    style.id = "codo-theme-preload"
    style.textContent =
      ":root{color-scheme:" +
      mode +
      ";--text-mix-blend-mode:" +
      (isDark ? "plus-lighter" : "multiply") +
      ";" +
      css +
      "}"
    document.head.appendChild(style)
  }
})()
