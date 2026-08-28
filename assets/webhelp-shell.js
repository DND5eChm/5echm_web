(function () {
  "use strict";

  var STORAGE_PREFIX = "5echm.webhelp.";
  var NAV_VIEWS = {
    contents: { src: "webhelpcontents.htm", title: "文档目录" },
    index: { src: "webhelpindex.htm", title: "文档索引" },
    bookmark: { src: "webhelpbookmark.htm", title: "书签" },
    search: { src: "webhelpsearch.htm", title: "全文搜索" }
  };
  var FONT_MIN = 14;
  var FONT_MAX = 20;
  var FONT_DEFAULT = 16;
  var SIDEBAR_MIN = 240;
  var SIDEBAR_MAX = 420;
  var MOBILE_BREAKPOINT = 768;

  var body = document.body;
  var root = document.documentElement;
  var contentFrame = document.getElementById("content");
  var navFrame = document.getElementById("navFrame");
  var sidebar = document.getElementById("sidebar");
  var sidebarToggle = document.getElementById("sidebarToggle");
  var sidebarCollapse = document.getElementById("sidebarCollapse");
  var sidebarRestore = document.getElementById("sidebarRestore");
  var sidebarResizer = document.getElementById("sidebarResizer");
  var drawerBackdrop = document.getElementById("drawerBackdrop");
  var globalSearch = document.getElementById("globalSearch");
  var globalSearchInput = document.getElementById("globalSearchInput");
  var mobileSearchButton = document.getElementById("mobileSearchButton");
  var sidebarViewLabel = document.getElementById("sidebarViewLabel");
  var leaveSearchButton = document.getElementById("leaveSearchButton");
  var moreButton = document.getElementById("moreButton");
  var moreMenu = document.getElementById("moreMenu");
  var themeButton = document.getElementById("themeButton");
  var themeSelect = document.getElementById("themeSelect");
  var fontSizeOutput = document.getElementById("fontSizeOutput");
  var liveRegion = document.getElementById("liveRegion");
  var projectVersion = document.getElementById("projectVersion");
  var projectTitle = document.querySelector(".brand-title").textContent.trim();
  var systemTheme = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var lastDrawerFocus = null;
  var currentView = "contents";
  var pendingSearch = "";
  var pendingHighlight = null;
  var nextHistoryMode = "replace";
  var preferredNavigationNode = -1;
  var lastTrackedPage = "";

  function readStorage(key) {
    try {
      return window.localStorage.getItem(STORAGE_PREFIX + key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, String(value));
    } catch (error) {
      return false;
    }
    return true;
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function resolveAsset(path) {
    try {
      return new URL(path, window.location.href).href;
    } catch (error) {
      return path;
    }
  }

  function getQueryPage() {
    try {
      return new URL(window.location.href).searchParams.get("page") || "";
    } catch (error) {
      var match = /[?&]page=([^&#]*)/i.exec(window.location.search || "");
      if (!match) return "";
      try {
        return decodeURIComponent(match[1].replace(/\+/g, "%20"));
      } catch (decodeError) {
        return match[1];
      }
    }
  }

  function canonicalTopicPath(value) {
    var path = String(value || "").trim().replace(/\\/g, "/");
    path = path.replace(/^\.\//, "").replace(/^topics\//i, "");
    try {
      path = decodeURIComponent(path);
    } catch (error) {
      path = path;
    }
    var parts = path.split("/").filter(function (part) {
      return part && part !== ".";
    });
    if (!parts.length || parts.some(function (part) { return part === ".."; })) return "";
    return parts.map(function (part) { return encodeURIComponent(part); }).join("/");
  }

  function initialTopicUrl() {
    var requested = getQueryPage();
    var hashIndex = requested.indexOf("#");
    var fragment = hashIndex >= 0 ? requested.slice(hashIndex) : "";
    var path = canonicalTopicPath(hashIndex >= 0 ? requested.slice(0, hashIndex) : requested) || canonicalTopicPath(body.getAttribute("data-default-page"));
    return path ? "topics/" + path + fragment : "";
  }

  function currentTopicRelativePath() {
    try {
      var href = contentFrame.contentWindow.location.href;
      var rootUrl = new URL("topics/", window.location.href).href;
      if (href.indexOf(rootUrl) !== 0) return "";
      return href.slice(rootUrl.length).split(/[?#]/)[0];
    } catch (error) {
      return "";
    }
  }

  function updatePageUrl(relativePath, mode) {
    if (!relativePath || mode === "none") return;
    try {
      var target = new URL(window.location.href);
      target.searchParams.set("page", decodeURIComponent(relativePath));
      if (mode === "push") {
        window.history.pushState({ page: relativePath }, "", target.href);
      } else {
        window.history.replaceState({ page: relativePath }, "", target.href);
      }
    } catch (error) {
      return;
    }
  }

  function trackPageView(relativePath) {
    if (!relativePath || !/^https?:$/.test(window.location.protocol)) return;
    var page = window.location.pathname + window.location.search;
    if (!page || page === lastTrackedPage) return;
    lastTrackedPage = page;
    window._hmt = window._hmt || [];
    window._hmt.push(["_trackPageview", page]);
  }

  function topicUrl(value) {
    var path = canonicalTopicPath(value);
    return path ? "topics/" + path : "";
  }

  function navigate(url, options) {
    var settings = options || {};
    var target = String(url || "").trim();
    if (!target) return false;
    nextHistoryMode = settings.history || "push";
    try {
      contentFrame.contentWindow.location.href = target;
    } catch (error) {
      contentFrame.src = target;
    }
    if (isMobile()) closeDrawer();
    return true;
  }

  function ensureStylesheet(doc, id, href) {
    if (!doc || !doc.head || doc.getElementById(id)) return;
    var link = doc.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    doc.head.appendChild(link);
  }

  function ensureScript(doc, id, src) {
    if (!doc || !doc.head || doc.getElementById(id)) return;
    var script = doc.createElement("script");
    script.id = id;
    script.src = src;
    script.async = false;
    doc.head.appendChild(script);
  }

  function resolvedTheme() {
    var setting = root.getAttribute("data-theme") || "system";
    if (setting === "system") return systemTheme && systemTheme.matches ? "dark" : "light";
    return setting;
  }

  function applyDocumentPreferences(doc, kind) {
    if (!doc || !doc.documentElement) return;
    doc.documentElement.setAttribute("data-webhelp-theme", resolvedTheme());
    if (kind === "nav") doc.documentElement.setAttribute("data-search-theme", resolvedTheme());
    doc.documentElement.style.setProperty("--webhelp-font-size", getFontSize() + "px");
    if (kind === "topic") {
      ensureStylesheet(doc, "webhelpTopicStyles", resolveAsset("assets/webhelp-topic.css"));
      ensureStylesheet(doc, "webhelpContentEnhanceStyles", resolveAsset("assets/content-enhance.css"));
      ensureScript(doc, "webhelpContentEnhanceScript", resolveAsset("assets/content-enhance.js"));
      doc.documentElement.classList.add("webhelp-topic-document");
    } else {
      ensureStylesheet(doc, "webhelpNavStyles", resolveAsset("assets/webhelp-nav.css"));
      doc.documentElement.classList.add("webhelp-nav-document");
    }
  }

  function applyTheme(setting, persist) {
    var value = /^(light|dark|system)$/.test(setting) ? setting : "system";
    root.setAttribute("data-theme", value);
    root.setAttribute("data-resolved-theme", value === "system" ? resolvedTheme() : value);
    themeSelect.value = value;
    themeButton.setAttribute("aria-label", "当前主题：" + ({ system: "跟随系统", light: "浅色", dark: "深色" })[value]);
    if (persist !== false) writeStorage("theme", value);
    try {
      applyDocumentPreferences(contentFrame.contentDocument, "topic");
    } catch (error) {}
    try {
      applyDocumentPreferences(navFrame.contentDocument, "nav");
    } catch (error) {}
  }

  function cycleTheme() {
    applyTheme(root.getAttribute("data-resolved-theme") === "dark" ? "light" : "dark", true);
  }

  function getFontSize() {
    return clamp(parseInt(readStorage("fontSize"), 10) || FONT_DEFAULT, FONT_MIN, FONT_MAX);
  }

  function applyFontSize(value, persist) {
    var size = clamp(parseInt(value, 10) || FONT_DEFAULT, FONT_MIN, FONT_MAX);
    root.style.setProperty("--topic-font-size", size + "px");
    fontSizeOutput.value = size + "px";
    fontSizeOutput.textContent = size + "px";
    if (persist !== false) writeStorage("fontSize", size);
    try {
      contentFrame.contentDocument.documentElement.style.setProperty("--webhelp-font-size", size + "px");
    } catch (error) {}
    try {
      navFrame.contentDocument.documentElement.style.setProperty("--webhelp-font-size", size + "px");
    } catch (error) {}
    announce("正文字号 " + size + " 像素");
  }

  function changeFontSize(delta) {
    applyFontSize(getFontSize() + delta, true);
  }

  function announce(message) {
    liveRegion.textContent = "";
    window.setTimeout(function () { liveRegion.textContent = message; }, 10);
  }

  function printCurrentTopic() {
    closeMoreMenu();
    try {
      contentFrame.contentWindow.focus();
      contentFrame.contentWindow.print();
    } catch (error) {
      window.print();
    }
  }

  function applySidebarWidth(value, persist) {
    var width = clamp(parseInt(value, 10) || 288, SIDEBAR_MIN, SIDEBAR_MAX);
    body.style.setProperty("--sidebar-width", width + "px");
    sidebarResizer.setAttribute("aria-valuemin", SIDEBAR_MIN);
    sidebarResizer.setAttribute("aria-valuemax", SIDEBAR_MAX);
    sidebarResizer.setAttribute("aria-valuenow", width);
    if (persist) writeStorage("sidebarWidth", width);
  }

  function sidebarCollapsedByDefault() {
    var stored = readStorage("sidebarCollapsed");
    if (stored !== null) return stored === "true";
    return window.innerWidth < 1024 && !isMobile();
  }

  function setSidebarCollapsed(collapsed, persist) {
    if (isMobile()) {
      if (collapsed) closeDrawer();
      else openDrawer();
      return;
    }
    body.classList.toggle("sidebar-collapsed", Boolean(collapsed));
    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    sidebarToggle.setAttribute("aria-label", collapsed ? "展开目录" : "收起目录");
    if (persist) writeStorage("sidebarCollapsed", Boolean(collapsed));
  }

  function openDrawer() {
    if (!isMobile()) return;
    lastDrawerFocus = document.activeElement;
    body.classList.add("drawer-open");
    sidebarToggle.setAttribute("aria-expanded", "true");
    sidebarToggle.setAttribute("aria-label", "关闭目录");
    window.setTimeout(function () {
      var focusTarget = currentView === "search" ? leaveSearchButton : document.querySelector('.sidebar-tabs button[aria-selected="true"]');
      if (focusTarget) focusTarget.focus();
    }, 20);
  }

  function closeDrawer() {
    body.classList.remove("drawer-open");
    if (isMobile()) {
      sidebarToggle.setAttribute("aria-expanded", "false");
      sidebarToggle.setAttribute("aria-label", "打开目录");
      if (lastDrawerFocus && document.contains(lastDrawerFocus)) lastDrawerFocus.focus();
    }
  }

  function toggleSidebar() {
    if (isMobile()) {
      body.classList.contains("drawer-open") ? closeDrawer() : openDrawer();
      return;
    }
    setSidebarCollapsed(!body.classList.contains("sidebar-collapsed"), true);
  }

  function viewFromStorage() {
    var stored = readStorage("tab");
    return /^(contents|index|bookmark)$/.test(stored) ? stored : "contents";
  }

  function framePathname(frame) {
    try {
      return frame.contentWindow.location.pathname.split("/").pop();
    } catch (error) {
      return "";
    }
  }

  function setView(view, options) {
    var settings = options || {};
    if (!NAV_VIEWS[view]) view = "contents";
    currentView = view;
    body.classList.toggle("search-view", view === "search");
    sidebarViewLabel.hidden = view !== "search";
    document.querySelectorAll(".sidebar-tabs [role=tab]").forEach(function (tab) {
      var selected = tab.getAttribute("data-view") === view;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected || view === "search" ? 0 : -1;
    });
    navFrame.title = NAV_VIEWS[view].title;
    var targetName = NAV_VIEWS[view].src.split("?")[0];
    if (framePathname(navFrame) !== targetName || view === "search" && settings.reload) {
      var source = NAV_VIEWS[view].src;
      if (view === "search" && pendingSearch) source += "?q=" + encodeURIComponent(pendingSearch);
      navFrame.src = source;
    } else {
      enhanceNavDocument();
    }
    if (view !== "search" && settings.persist !== false) writeStorage("tab", view);
    if (settings.openDrawer && isMobile()) openDrawer();
  }

  function openSearch(query) {
    pendingSearch = String(query || "").trim();
    if (pendingSearch) writeStorage("lastSearch", pendingSearch);
    setView("search", { persist: false, openDrawer: true, reload: currentView === "search" });
  }

  function applyPendingSearch(doc) {
    if (!doc) return;
    var query = pendingSearch;
    if (!query) {
      try { query = new URL(navFrame.contentWindow.location.href).searchParams.get("q") || ""; } catch (error) {}
    }
    var input = doc.getElementById("keyword");
    if (!input) return;
    if (query) input.value = query;
    input.focus();
    if (query && typeof navFrame.contentWindow.SearchIt === "function") {
      Promise.resolve(navFrame.contentWindow.SearchIt()).catch(function () {});
      pendingSearch = "";
    }
  }

  function enhanceSearchKeyboard(doc) {
    if (!doc || doc.documentElement.getAttribute("data-shell-search-keyboard") === "true") return;
    doc.documentElement.setAttribute("data-shell-search-keyboard", "true");
    doc.addEventListener("keydown", function (event) {
      var items = Array.prototype.slice.call(doc.querySelectorAll(".result-item"));
      var input = doc.getElementById("keyword");
      if (event.key === "Escape") {
        if (input && input.value) {
          input.value = "";
          input.focus();
        } else {
          closeDrawer();
          globalSearchInput.focus();
        }
        return;
      }
      if (!items.length || (event.key !== "ArrowDown" && event.key !== "ArrowUp")) return;
      event.preventDefault();
      var selected = doc.querySelector(".result-item.selected");
      var index = Math.max(0, items.indexOf(selected));
      index = clamp(index + (event.key === "ArrowDown" ? 1 : -1), 0, items.length - 1);
      items.forEach(function (item) { item.classList.remove("selected"); });
      items[index].classList.add("selected");
      items[index].scrollIntoView({ block: "nearest" });
    });
  }

  function syncNavigationSelection(doc) {
    var currentPath = currentTopicRelativePath();
    if (!currentPath || !doc) return;
    var currentDecoded;
    try { currentDecoded = decodeURIComponent(currentPath).toLowerCase(); } catch (error) { currentDecoded = currentPath.toLowerCase(); }
    var match = null;

    function linkTopicPath(link) {
      try {
        return decodeURIComponent(new URL(link.href, window.location.href).pathname)
          .replace(/^.*\/topics\//i, "")
          .toLowerCase();
      } catch (error) {
        return "";
      }
    }

    var preferredLabel = preferredNavigationNode >= 0 ? doc.getElementById("l" + preferredNavigationNode) : null;
    var preferredLink = preferredLabel ? preferredLabel.parentElement : null;
    if (preferredLink && linkTopicPath(preferredLink) === currentDecoded) match = preferredLink;

    doc.querySelectorAll('a[target="content"]').forEach(function (link) {
      if (match) return;
      if (linkTopicPath(link) === currentDecoded) match = link;
    });
    if (!match) return;
    var label = match.querySelector('[id^="l"]');
    if (!label) return;
    var id = parseInt(label.id.slice(1), 10);
    if (typeof navFrame.contentWindow.selectNode === "function") {
      navFrame.contentWindow.selectNode(id, false);
    }
  }

  function enhanceNavDocument() {
    var doc;
    try { doc = navFrame.contentDocument; } catch (error) { return; }
    if (!doc || !doc.documentElement) return;
    applyDocumentPreferences(doc, "nav");
    if (currentView === "contents") syncNavigationSelection(doc);
    if (currentView === "search") {
      applyPendingSearch(doc);
      enhanceSearchKeyboard(doc);
    }
    if (doc.documentElement.getAttribute("data-shell-events") !== "true") {
      doc.documentElement.setAttribute("data-shell-events", "true");
      doc.addEventListener("click", function (event) {
        var link = event.target.closest ? event.target.closest('a[target="content"], .result-item') : null;
        if (link && isMobile()) window.setTimeout(closeDrawer, 30);
      }, true);
    }
  }

  function quickActionIcon(kind) {
    var icons = {
      legacy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6M4 4v4.6h4.6"/></svg>',
      spell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 4 5 5L8 21H3v-5zM13 6l5 5M5 4v3M3.5 5.5h3M19 16v4M17 18h4"/></svg>',
      monster: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11c-2 0-3-1.5-3-3 0-1.2.7-2 1.8-2 1.7 0 2.8 2.1 3.2 4M17 11c2 0 3-1.5 3-3 0-1.2-.7-2-1.8-2-1.7 0-2.8 2.1-3.2 4M8 13c-2.2 0-4 1.8-4 4v2h16v-2c0-2.2-1.8-4-4-4zM9 16h.01M15 16h.01M10 19c1 1 3 1 4 0"/></svg>',
      item: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8h10l2 12H5zM9 8a3 3 0 0 1 6 0M9 13h6"/></svg>'
    };
    return icons[kind] || icons.legacy;
  }

  function enhanceHomePage(doc) {
    if (!doc.body || doc.body.getAttribute("data-webhelp-home-ready") === "true") return;
    var titleText = doc.title || "";
    var bodyText = doc.body.textContent || "";
    if (titleText.indexOf("写在前面") === -1 && bodyText.indexOf("DND 五版不全书") === -1) return;
    doc.body.setAttribute("data-webhelp-home-ready", "true");
    doc.body.classList.add("webhelp-home");

    Array.prototype.slice.call(doc.body.querySelectorAll("p")).some(function (paragraph) {
      if ((paragraph.textContent || "").indexOf("DND 五版不全书") === -1) return false;
      paragraph.classList.add("webhelp-home-title");
      return true;
    });

    var actionParagraphs = [];
    Array.prototype.slice.call(doc.querySelectorAll("p")).forEach(function (paragraph) {
      var link = paragraph.querySelector("a");
      if (!link || (link.textContent || "").indexOf("快速跳转") === -1) return;
      var text = link.textContent || "";
      var kind = text.indexOf("法术") !== -1 ? "spell" : text.indexOf("怪物") !== -1 ? "monster" : text.indexOf("物品") !== -1 ? "item" : "legacy";
      paragraph.classList.add("webhelp-quick-action");
      link.classList.add("webhelp-quick-action-link", "webhelp-quick-action-" + kind);
      if (!link.querySelector(".webhelp-quick-icon")) {
        var icon = doc.createElement("span");
        icon.className = "webhelp-quick-icon";
        icon.innerHTML = quickActionIcon(kind);
        link.insertBefore(icon, link.firstChild);
        var chevron = doc.createElement("span");
        chevron.className = "webhelp-quick-chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "›";
        link.appendChild(chevron);
      }
      actionParagraphs.push(paragraph);
    });
    if (actionParagraphs.length) {
      var grid = doc.createElement("div");
      grid.className = "webhelp-quick-grid";
      actionParagraphs[0].parentNode.insertBefore(grid, actionParagraphs[0]);
      actionParagraphs.forEach(function (paragraph) { grid.appendChild(paragraph); });
    }

    Array.prototype.slice.call(doc.querySelectorAll("p")).forEach(function (paragraph) {
      var text = (paragraph.textContent || "").trim();
      if (text.indexOf("这里是《5E不全书》") !== -1) paragraph.classList.add("webhelp-callout", "webhelp-callout-info");
      if (text.indexOf("报BUG") !== -1) paragraph.classList.add("webhelp-callout", "webhelp-callout-warning");
    });

    var version = bodyText.match(/\bv\d{8}\b/i);
    if (version) {
      projectVersion.textContent = version[0];
      projectVersion.hidden = false;
      writeStorage("projectVersion", version[0]);
    }
  }

  function applyPendingHighlight() {
    if (!pendingHighlight) return;
    var data = pendingHighlight;
    function send() {
      try {
        contentFrame.contentWindow.postMessage({
          type: "webhelp-search-apply",
          requestId: data.requestId,
          words: data.words || []
        }, "*");
      } catch (error) {}
    }
    send();
    window.setTimeout(send, 500);
    window.setTimeout(send, 1200);
    pendingHighlight = null;
  }

  function enhanceContentDocument() {
    var doc;
    try { doc = contentFrame.contentDocument; } catch (error) { return; }
    if (!doc || !doc.documentElement || !doc.body) return;
    applyDocumentPreferences(doc, "topic");
    enhanceHomePage(doc);
    if (doc.title) document.title = doc.title + " - " + projectTitle;
  }

  function onContentLoad() {
    enhanceContentDocument();
    var relativePath = currentTopicRelativePath();
    updatePageUrl(relativePath, nextHistoryMode);
    trackPageView(relativePath);
    nextHistoryMode = "push";
    if (currentView === "contents") {
      try { syncNavigationSelection(navFrame.contentDocument); } catch (error) {}
    }
    if (currentView === "bookmark") {
      try {
        if (navFrame.contentWindow.WebHelpBookmarks) navFrame.contentWindow.WebHelpBookmarks.refreshCurrent();
      } catch (error) {}
    }
    applyPendingHighlight();
    if (isMobile()) closeDrawer();
  }

  function getCurrentTopic() {
    try {
      return {
        title: contentFrame.contentDocument.title || "未命名页面",
        url: contentFrame.contentWindow.location.href
      };
    } catch (error) {
      return { title: "未命名页面", url: contentFrame.src || "" };
    }
  }

  function openMoreMenu() {
    moreMenu.hidden = false;
    moreButton.setAttribute("aria-expanded", "true");
    themeSelect.focus();
  }

  function closeMoreMenu() {
    if (moreMenu.hidden) return;
    moreMenu.hidden = true;
    moreButton.setAttribute("aria-expanded", "false");
  }

  function setupResizer() {
    var startX = 0;
    var startWidth = 0;
    function move(event) {
      applySidebarWidth(startWidth + event.clientX - startX, false);
    }
    function finish() {
      if (!body.classList.contains("sidebar-resizing")) return;
      body.classList.remove("sidebar-resizing");
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", finish);
      writeStorage("sidebarWidth", parseInt(getComputedStyle(body).getPropertyValue("--sidebar-width"), 10));
    }
    sidebarResizer.addEventListener("pointerdown", function (event) {
      if (isMobile() || body.classList.contains("sidebar-collapsed")) return;
      startX = event.clientX;
      startWidth = sidebar.getBoundingClientRect().width;
      body.classList.add("sidebar-resizing");
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", finish);
      event.preventDefault();
    });
    sidebarResizer.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      var current = sidebar.getBoundingClientRect().width;
      applySidebarWidth(current + (event.key === "ArrowRight" ? 12 : -12), true);
    });
  }

  function setupEvents() {
    sidebarToggle.addEventListener("click", toggleSidebar);
    sidebarCollapse.addEventListener("click", function () { setSidebarCollapsed(true, true); });
    sidebarRestore.addEventListener("click", function () { setSidebarCollapsed(false, true); });
    drawerBackdrop.addEventListener("click", closeDrawer);
    leaveSearchButton.addEventListener("click", function () { setView(viewFromStorage(), { persist: false }); });
    document.querySelectorAll(".sidebar-tabs [role=tab]").forEach(function (tab) {
      tab.addEventListener("click", function () { setView(tab.getAttribute("data-view"), { persist: true }); });
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        var tabs = Array.prototype.slice.call(document.querySelectorAll(".sidebar-tabs [role=tab]"));
        var index = tabs.indexOf(tab) + (event.key === "ArrowRight" ? 1 : -1);
        tabs[(index + tabs.length) % tabs.length].focus();
        event.preventDefault();
      });
    });
    globalSearch.addEventListener("submit", function (event) {
      event.preventDefault();
      openSearch(globalSearchInput.value);
    });
    mobileSearchButton.addEventListener("click", function () { openSearch(globalSearchInput.value || readStorage("lastSearch") || ""); });
    themeButton.addEventListener("click", cycleTheme);
    themeSelect.addEventListener("change", function () { applyTheme(themeSelect.value, true); });
    document.getElementById("fontDecrease").addEventListener("click", function () { changeFontSize(-1); });
    document.getElementById("fontIncrease").addEventListener("click", function () { changeFontSize(1); });
    document.getElementById("menuFontDecrease").addEventListener("click", function () { changeFontSize(-1); });
    document.getElementById("menuFontIncrease").addEventListener("click", function () { changeFontSize(1); });
    document.getElementById("printButton").addEventListener("click", printCurrentTopic);
    document.getElementById("menuPrintButton").addEventListener("click", printCurrentTopic);
    moreButton.addEventListener("click", function () { moreMenu.hidden ? openMoreMenu() : closeMoreMenu(); });
    navFrame.addEventListener("load", enhanceNavDocument);
    contentFrame.addEventListener("load", onContentLoad);
    window.addEventListener("resize", function () {
      if (!isMobile()) {
        closeDrawer();
        sidebarToggle.setAttribute("aria-expanded", String(!body.classList.contains("sidebar-collapsed")));
      } else {
        sidebarToggle.setAttribute("aria-expanded", String(body.classList.contains("drawer-open")));
      }
    });
    window.addEventListener("popstate", function () {
      var path = topicUrl(getQueryPage());
      if (!path) return;
      nextHistoryMode = "none";
      navigate(path, { history: "none" });
    });
    window.addEventListener("message", function (event) {
      var data = event && event.data;
      if (data && data.type === "webhelp-search-close") {
        closeDrawer();
        setView(viewFromStorage(), { persist: false });
        return;
      }
      if (!data || data.type !== "webhelp-search-navigate" || !data.url) return;
      pendingHighlight = data;
      var targetUrl = data.url;
      var currentUrl = "";
      try {
        targetUrl = new URL(data.url, window.location.href).href;
        currentUrl = contentFrame.contentWindow.location.href;
      } catch (error) {}
      if (currentUrl !== targetUrl) navigate(targetUrl, { history: "push" });
    });
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (isMobile()) openSearch(globalSearchInput.value);
        else globalSearchInput.focus();
        return;
      }
      if (event.key === "Escape") {
        if (body.classList.contains("drawer-open")) closeDrawer();
        closeMoreMenu();
      }
    });
    document.addEventListener("pointerdown", function (event) {
      if (!moreMenu.hidden && !moreMenu.contains(event.target) && !moreButton.contains(event.target)) closeMoreMenu();
    });
    if (systemTheme) {
      var themeChange = function () {
        if (root.getAttribute("data-theme") === "system") applyTheme("system", false);
      };
      if (systemTheme.addEventListener) systemTheme.addEventListener("change", themeChange);
      else if (systemTheme.addListener) systemTheme.addListener(themeChange);
    }
    setupResizer();
  }

  function init() {
    var storedVersion = readStorage("projectVersion");
    if (/^v\d{8}$/i.test(storedVersion || "")) {
      projectVersion.textContent = storedVersion;
      projectVersion.hidden = false;
    }
    applySidebarWidth(readStorage("sidebarWidth") || sidebar.getBoundingClientRect().width || 288, false);
    applyTheme(readStorage("theme") || "light", false);
    applyFontSize(getFontSize(), false);
    if (isMobile()) closeDrawer();
    else setSidebarCollapsed(sidebarCollapsedByDefault(), false);
    setupEvents();
    setView(viewFromStorage(), { persist: false });
    var initialPath = initialTopicUrl();
    if (initialPath) contentFrame.src = initialPath;
    else contentFrame.src = "indexh.htm";
  }

  window.WebHelpShell = {
    closeDrawer: closeDrawer,
    getContentWindow: function () { return contentFrame.contentWindow; },
    getCurrentTopic: getCurrentTopic,
    navigate: navigate,
    openSearch: openSearch,
    rememberNavigationNode: function (index) { preferredNavigationNode = parseInt(index, 10); },
    setView: setView
  };

  init();
})();
