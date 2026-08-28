(function () {
  "use strict";

  var root = document.documentElement;
  var script = document.currentScript;
  var kind = script ? script.getAttribute("data-webhelp-kind") || "" : "";
  var setting = "light";
  var fontSize = 16;

  try {
    var storedTheme = window.localStorage.getItem("5echm.webhelp.theme");
    if (/^(light|dark|system)$/.test(storedTheme || "")) setting = storedTheme;
    var storedFontSize = parseInt(window.localStorage.getItem("5echm.webhelp.fontSize"), 10);
    if (storedFontSize >= 14 && storedFontSize <= 20) fontSize = storedFontSize;
  } catch (error) {}

  var resolved = setting;
  if (setting === "system") {
    try {
      resolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (error) {
      resolved = "light";
    }
  }

  if (kind !== "shell" && window.parent !== window) {
    try {
      var parentTheme = window.parent.document.documentElement.getAttribute("data-resolved-theme");
      if (/^(light|dark)$/.test(parentTheme || "")) resolved = parentTheme;
    } catch (error) {}
  }

  root.style.setProperty("--webhelp-font-size", fontSize + "px");
  if (kind === "shell") {
    root.setAttribute("data-theme", setting);
    root.setAttribute("data-resolved-theme", resolved);
    return;
  }

  root.setAttribute("data-webhelp-theme", resolved);
  if (kind === "nav" || kind === "search") root.setAttribute("data-search-theme", resolved);
  if (kind === "topic" && (" " + root.className + " ").indexOf(" webhelp-topic-document ") === -1) {
    root.className += (root.className ? " " : "") + "webhelp-topic-document";
  }
})();
