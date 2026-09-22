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
  var FONT_MAX = 48;
  var FONT_DEFAULT = 16;
  var UI_FONT_MIN = 12;
  var UI_FONT_MAX = 24;
  var UI_FONT_DEFAULT = 14;
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
  var fontAdjustButton = document.getElementById("fontAdjustButton");
  var fontAdjustMenu = document.getElementById("fontAdjustMenu");
  var fontSizeRange = document.getElementById("fontSizeRange");
  var uiFontSizeRange = document.getElementById("uiFontSizeRange");
  var menuFontAdjust = document.getElementById("menuFontAdjust");
  var menuFontSizeSummary = document.getElementById("menuFontSizeSummary");
  var themeButton = document.getElementById("themeButton");
  var themeSelect = document.getElementById("themeSelect");
  var fontSizeOutput = document.getElementById("fontSizeOutput");
  var uiFontSizeOutput = document.getElementById("uiFontSizeOutput");
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
  var bookCatalog = Array.isArray(window.WebHelpBookCatalog) ? window.WebHelpBookCatalog : [];
  var selectedBookKey = "";

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
    if (isMobile()) closeDrawer();
    try {
      contentFrame.contentWindow.location.href = target;
    } catch (error) {
      contentFrame.src = target;
    }
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
    doc.documentElement.style.setProperty("--webhelp-ui-font-size", getUiFontSize() + "px");
    if (kind === "topic") {
      doc.documentElement.style.setProperty("--webhelp-font-size", getFontSize() + "px");
      ensureStylesheet(doc, "webhelpTopicStyles", resolveAsset("assets/webhelp-topic.css"));
      ensureStylesheet(doc, "webhelpContentEnhanceStyles", resolveAsset("assets/content-enhance.css"));
      ensureScript(doc, "webhelpContentEnhanceScript", resolveAsset("assets/content-enhance.js"));
      ensureScript(doc, "webhelpContrastScript", resolveAsset("assets/webhelp-contrast.js"));
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

  function getUiFontSize() {
    return clamp(parseInt(readStorage("uiFontSize"), 10) || UI_FONT_DEFAULT, UI_FONT_MIN, UI_FONT_MAX);
  }

  function setRangeProgress(range, value, minimum, maximum) {
    if (!range) return;
    range.value = String(value);
    range.style.setProperty("--font-progress", ((value - minimum) / (maximum - minimum)) * 100 + "%");
  }

  function applyFontSize(value, persist) {
    var size = clamp(parseInt(value, 10) || FONT_DEFAULT, FONT_MIN, FONT_MAX);
    root.style.setProperty("--topic-font-size", size + "px");
    fontSizeOutput.value = size + "px";
    fontSizeOutput.textContent = size + "px";
    setRangeProgress(fontSizeRange, size, FONT_MIN, FONT_MAX);
    if (menuFontSizeSummary) menuFontSizeSummary.textContent = size + "px";
    if (persist !== false) writeStorage("fontSize", size);
    try {
      contentFrame.contentDocument.documentElement.style.setProperty("--webhelp-font-size", size + "px");
    } catch (error) {}
    announce("正文内容字体 " + size + " 像素");
  }

  function applyUiFontSize(value, persist) {
    var size = clamp(parseInt(value, 10) || UI_FONT_DEFAULT, UI_FONT_MIN, UI_FONT_MAX);
    root.style.setProperty("--webhelp-ui-font-size", size + "px");
    uiFontSizeOutput.value = size + "px";
    uiFontSizeOutput.textContent = size + "px";
    setRangeProgress(uiFontSizeRange, size, UI_FONT_MIN, UI_FONT_MAX);
    if (persist !== false) writeStorage("uiFontSize", size);
    try {
      navFrame.contentDocument.documentElement.style.setProperty("--webhelp-ui-font-size", size + "px");
    } catch (error) {}
    announce("目录与界面字体 " + size + " 像素");
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
      try {
        var result = navFrame.contentWindow.SearchIt();
        if (window.Promise && window.Promise.resolve && result && typeof result.then === "function") {
          window.Promise.resolve(result).catch(function () {});
        }
      } catch (error) {}
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
    renderHomeBookshelf();
    if (selectedBookKey && currentView === "contents") focusSelectedBook();
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

  function createHomeElement(doc, tagName, className, textContent) {
    var element = doc.createElement(tagName);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
  }

  function bookshelfTone(key) {
    var hash = 0;
    String(key || "").split("").forEach(function (character) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    });
    return hash % 7;
  }

  function ensureHomeBookshelf(doc) {
    if (!doc || !doc.body || doc.getElementById("webhelpBookshelf")) return;
    var section = createHomeElement(doc, "section", "webhelp-bookshelf");
    section.id = "webhelpBookshelf";
    section.setAttribute("aria-labelledby", "webhelpBookshelfTitle");

    var heading = createHomeElement(doc, "div", "webhelp-bookshelf-heading");
    var title = createHomeElement(doc, "h2", "webhelp-bookshelf-title", "书架");
    title.id = "webhelpBookshelfTitle";
    var copy = createHomeElement(doc, "p", "webhelp-bookshelf-copy", "按出版先后排列；书脊越高，站内收录条目越多。选择书籍可查看其目录。");
    heading.appendChild(title);
    heading.appendChild(copy);

    var casesElement = createHomeElement(doc, "div", "webhelp-bookcases");
    casesElement.id = "webhelpBookcases";

    var status = createHomeElement(doc, "p", "webhelp-bookshelf-status", "正在读取站内藏书……");
    status.id = "webhelpBookshelfStatus";
    status.setAttribute("aria-live", "polite");

    var detail = createHomeElement(doc, "div", "webhelp-book-detail");
    detail.id = "webhelpBookDetail";
    detail.hidden = true;

    section.appendChild(heading);
    section.appendChild(casesElement);
    section.appendChild(status);
    section.appendChild(detail);

    var quickGrid = doc.querySelector(".webhelp-quick-grid");
    if (quickGrid && quickGrid.parentNode) quickGrid.parentNode.insertBefore(section, quickGrid.nextSibling);
    else doc.body.appendChild(section);
  }

  function currentContentsApi() {
    if (currentView !== "contents") return null;
    try {
      return navFrame.contentWindow.WebHelpContents || null;
    } catch (error) {
      return null;
    }
  }

  function bookHeight(count, maximum) {
    if (typeof count !== "number") return 156;
    if (!maximum) return 150;
    return 142 + Math.round(Math.log(count + 1) / Math.log(maximum + 1) * 86);
  }

  function bookByKey(key) {
    return bookCatalog.find(function (book) { return book.key === key; }) || null;
  }

  function outlineForBook(api, book, seen) {
    if (!api || !book) return null;
    var visited = seen || {};
    if (visited[book.key]) return null;
    visited[book.key] = true;
    var direct = api.getBookOutline(book);
    if (direct) return direct;
    var members = (book.memberKeys || []).map(function (key) {
      var member = bookByKey(key);
      var outline = outlineForBook(api, member, visited);
      return member && outline ? { book: member, outline: outline } : null;
    }).filter(Boolean);
    if (!members.length) return null;
    return {
      id: -1,
      title: book.title,
      count: members.reduce(function (count, member) { return count + member.outline.count; }, 0),
      children: members.map(function (member) {
        return {
          id: member.outline.id,
          title: member.book.title,
          href: "",
          hasChildren: true
        };
      })
    };
  }

  function renderBookDetail(doc, book, outline) {
    var detail = doc.getElementById("webhelpBookDetail");
    if (!detail) return;
    detail.textContent = "";
    if (!book || !outline) {
      detail.hidden = true;
      return;
    }

    detail.hidden = false;
    var header = createHomeElement(doc, "div", "webhelp-book-detail-heading");
    var heading = createHomeElement(doc, "h4", "webhelp-book-detail-title", book.title);
    var meta = createHomeElement(doc, "p", "webhelp-book-detail-meta", book.abbreviation + " · 收录 " + outline.count + " 项");
    header.appendChild(heading);
    header.appendChild(meta);
    detail.appendChild(header);

    if (outline.missing) {
      detail.appendChild(createHomeElement(doc, "p", "webhelp-book-detail-empty", "这本书已列入书目，但当前站点尚未收录可跳转的独立目录。"));
      return;
    }

    if (!outline.children.length) {
      detail.appendChild(createHomeElement(doc, "p", "webhelp-book-detail-empty", "这本书目前没有可直接跳转的二级目录。"));
      return;
    }

    var list = createHomeElement(doc, "ol", "webhelp-book-chapters");
    outline.children.forEach(function (chapter) {
      var item = doc.createElement("li");
      var button = createHomeElement(doc, "button", "webhelp-book-chapter", chapter.title);
      button.type = "button";
      button.setAttribute("data-node-id", chapter.id);
      button.setAttribute("title", "转到“" + chapter.title + "”");
      var chevron = createHomeElement(doc, "span", "webhelp-book-chapter-chevron", "›");
      chevron.setAttribute("aria-hidden", "true");
      button.appendChild(chevron);
      button.addEventListener("click", function () {
        var api = currentContentsApi();
        if (api && api.activateNode(chapter.id)) announce("正在打开“" + chapter.title + "”");
      });
      item.appendChild(button);
      list.appendChild(item);
    });
    detail.appendChild(list);
  }

  function renderHomeBookshelf() {
    var doc;
    try { doc = contentFrame.contentDocument; } catch (error) { return; }
    if (!doc || !doc.body || !doc.body.classList.contains("webhelp-home")) return;
    ensureHomeBookshelf(doc);
    var casesElement = doc.getElementById("webhelpBookcases");
    var status = doc.getElementById("webhelpBookshelfStatus");
    var detail = doc.getElementById("webhelpBookDetail");
    var bookshelf = doc.getElementById("webhelpBookshelf");
    if (!casesElement || !status || !detail || !bookshelf) return;
    if (casesElement.contains(detail)) bookshelf.appendChild(detail);

    var api = currentContentsApi();
    var records = bookCatalog.map(function (book) {
      return { book: book, outline: outlineForBook(api, book) };
    });
    var maximum = records.reduce(function (value, record) {
      return Math.max(value, record.outline ? record.outline.count : 0);
    }, 0);

    var groups = [
      { key: "core", title: "新版核心资源（2024）", description: "现行核心规则", compact: true },
      { key: "legacy", title: "旧版资源", description: "2014 版与已停止更新内容", compact: true },
      { key: "official", title: "规则扩展", description: "官方规则补充", compact: true },
      { key: "setting", title: "战役设定", description: "官方世界与设定集" },
      { key: "partner", title: "合作内容", description: "第三方与合作出版物" },
      { key: "other", title: "其他出版物", description: "站内收录的其他实体出版资源" }
    ];

    casesElement.textContent = "";
    var compactTier = createHomeElement(doc, "div", "webhelp-bookshelf-tier webhelp-bookshelf-tier-rules");
    compactTier.setAttribute("aria-label", "核心与规则资源");
    casesElement.appendChild(compactTier);
    groups.forEach(function (group) {
      var groupRecords = records.filter(function (record) { return record.book.section === group.key; });
      if (!groupRecords.length) return;
      var groupElement = createHomeElement(doc, "section", "webhelp-bookshelf-group webhelp-bookshelf-group-" + group.key);
      groupElement.setAttribute("aria-labelledby", "webhelpBookshelfGroup-" + group.key);
      var groupHeading = createHomeElement(doc, "div", "webhelp-bookshelf-group-heading");
      var groupTitle = createHomeElement(doc, "h3", "webhelp-bookshelf-group-title", group.title);
      groupTitle.id = "webhelpBookshelfGroup-" + group.key;
      var groupDescription = createHomeElement(doc, "span", "webhelp-bookshelf-group-description", group.description + " · " + groupRecords.length + " 本");
      groupHeading.appendChild(groupTitle);
      groupHeading.appendChild(groupDescription);
      groupElement.appendChild(groupHeading);

      var caseElement = createHomeElement(doc, "div", "webhelp-bookcase");
      caseElement.setAttribute("role", "group");
      caseElement.setAttribute("aria-label", group.title + "书架");
      groupRecords.forEach(function (record) {
        var book = record.book;
        var count = record.outline ? record.outline.count : 0;
        var button = createHomeElement(doc, "button", "webhelp-book webhelp-book-tone-" + bookshelfTone(book.key));
        if (api && !record.outline) button.classList.add("webhelp-book-unavailable");
        button.type = "button";
        button.setAttribute("aria-pressed", String(selectedBookKey === book.key));
        button.setAttribute("data-book-key", book.key);
        button.style.setProperty("--book-height", bookHeight(count, maximum) + "px");
        button.title = book.title + "（" + book.abbreviation + "），收录 " + count + " 项";

        var name = createHomeElement(doc, "span", "webhelp-book-name", book.title);
        var abbreviation = createHomeElement(doc, "span", "webhelp-book-abbreviation", book.abbreviation);
        button.appendChild(name);
        button.appendChild(abbreviation);
        button.addEventListener("click", function () {
          selectedBookKey = book.key;
          renderHomeBookshelf();
          focusSelectedBook();
        });
        caseElement.appendChild(button);
      });
      groupElement.appendChild(caseElement);
      (group.compact ? compactTier : casesElement).appendChild(groupElement);
    });

    if (!api) {
      status.textContent = "选择书籍后将切换到目录并载入章节。";
      status.hidden = false;
    } else {
      var availableCount = records.filter(function (record) { return Boolean(record.outline); }).length;
      status.textContent = "书目共 " + records.length + " 本，当前站点已匹配 " + availableCount + " 本。";
      status.hidden = availableCount === records.length;
    }

    var selected = records.find(function (record) { return record.book.key === selectedBookKey; });
    var selectedOutline = selected && (selected.outline || { count: 0, children: [], missing: true });
    if (selected) {
      var selectedGroup = casesElement.querySelector(".webhelp-bookshelf-group-" + selected.book.section);
      if (/^(core|legacy|official)$/.test(selected.book.section)) {
        casesElement.insertBefore(detail, compactTier.nextSibling);
      } else if (selectedGroup) {
        selectedGroup.appendChild(detail);
      }
    }
    renderBookDetail(doc, selected && selected.book, selectedOutline);
  }

  function focusSelectedBook() {
    var book = bookByKey(selectedBookKey);
    if (!book) return;
    if (isMobile()) openDrawer();
    else if (body.classList.contains("sidebar-collapsed")) setSidebarCollapsed(false, false);
    if (currentView !== "contents") {
      setView("contents", { persist: true });
      return;
    }
    var api = currentContentsApi();
    if (!api) return;
    var outline = api.focusBook(book);
    if (!outline && book.memberKeys) {
      book.memberKeys.some(function (key) {
        var member = bookByKey(key);
        outline = member ? api.focusBook(member) : null;
        return Boolean(outline);
      });
    }
    renderHomeBookshelf();
    if (outline) announce("已展开“" + book.title + "”，共收录 " + outlineForBook(api, book).count + " 项");
    else announce("“" + book.title + "”当前尚无可展开的独立目录");
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

    ensureHomeBookshelf(doc);
    renderHomeBookshelf();

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
    if (isMobile()) closeDrawer();
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

  function openFontAdjustMenu() {
    closeMoreMenu();
    fontAdjustMenu.hidden = false;
    fontAdjustButton.setAttribute("aria-expanded", "true");
    fontSizeRange.focus();
  }

  function closeFontAdjustMenu() {
    if (fontAdjustMenu.hidden) return;
    fontAdjustMenu.hidden = true;
    fontAdjustButton.setAttribute("aria-expanded", "false");
    if (document.activeElement === fontSizeRange) fontAdjustButton.focus();
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
    fontAdjustButton.addEventListener("click", function () {
      fontAdjustMenu.hidden ? openFontAdjustMenu() : closeFontAdjustMenu();
    });
    fontSizeRange.addEventListener("input", function () { applyFontSize(fontSizeRange.value, true); });
    uiFontSizeRange.addEventListener("input", function () { applyUiFontSize(uiFontSizeRange.value, true); });
    menuFontAdjust.addEventListener("click", openFontAdjustMenu);
    document.getElementById("printButton").addEventListener("click", printCurrentTopic);
    document.getElementById("menuPrintButton").addEventListener("click", printCurrentTopic);
    moreButton.addEventListener("click", function () {
      if (moreMenu.hidden) {
        closeFontAdjustMenu();
        openMoreMenu();
      } else {
        closeMoreMenu();
      }
    });
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
        closeFontAdjustMenu();
      }
    });
    document.addEventListener("pointerdown", function (event) {
      if (!moreMenu.hidden && !moreMenu.contains(event.target) && !moreButton.contains(event.target)) closeMoreMenu();
      if (!fontAdjustMenu.hidden && !fontAdjustMenu.contains(event.target) && !fontAdjustButton.contains(event.target) && !menuFontAdjust.contains(event.target)) closeFontAdjustMenu();
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
    applyUiFontSize(getUiFontSize(), false);
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
