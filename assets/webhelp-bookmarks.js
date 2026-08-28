(function () {
  "use strict";

  var STORAGE_KEY = "5echm.webhelp.bookmarks";
  var bookmarks = [];
  var currentTopic = { title: "未命名页面", url: "" };
  var list;
  var status;

  function legacyCookie() {
    try {
      var match = /(?:^|;\s*)Bookmarks=([^;]*)/.exec(document.cookie || "");
      if (!match) return [];
      var value;
      try { value = decodeURIComponent(match[1]); } catch (error) { value = window.unescape(match[1]); }
      var parts = value.split("\n");
      var result = [];
      for (var index = 0; index + 1 < parts.length; index += 2) {
        if (parts[index + 1]) result.push({ title: parts[index], url: parts[index + 1] });
      }
      return result;
    } catch (error) {
      return [];
    }
  }

  function loadBookmarks() {
    try {
      var stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(stored)) bookmarks = stored.filter(function (item) { return item && item.title && item.url; });
    } catch (error) {
      bookmarks = [];
    }
    if (!bookmarks.length) bookmarks = legacyCookie();
  }

  function saveBookmarks() {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks)); } catch (error) {}
    try {
      var value = bookmarks.map(function (item) { return item.title + "\n" + item.url; }).join("\n");
      var expires = new Date(Date.now() + 315360000000);
      document.cookie = "Bookmarks=" + encodeURIComponent(value) + ";expires=" + expires.toUTCString() + ";path=/";
    } catch (error) {}
  }

  function getCurrentTopic() {
    try {
      if (parent.WebHelpShell && parent.WebHelpShell.getCurrentTopic) return parent.WebHelpShell.getCurrentTopic();
      if (parent.content) return { title: parent.content.document.title, url: parent.content.location.href };
    } catch (error) {}
    return currentTopic;
  }

  function refreshCurrent() {
    currentTopic = getCurrentTopic();
    document.getElementById("currentTopic").textContent = currentTopic.title || "未命名页面";
  }

  function navigate(item) {
    try {
      if (parent.WebHelpShell && parent.WebHelpShell.navigate) {
        parent.WebHelpShell.navigate(item.url);
        return;
      }
      if (parent.content) parent.content.location.href = item.url;
    } catch (error) {
      window.open(item.url, "content");
    }
  }

  function render() {
    list.textContent = "";
    if (!bookmarks.length) {
      status.textContent = "尚未添加书签";
      return;
    }
    status.textContent = bookmarks.length + " 个书签";
    var fragment = document.createDocumentFragment();
    bookmarks.forEach(function (item, index) {
      var row = document.createElement("li");
      var link = document.createElement("button");
      var remove = document.createElement("button");
      link.className = "bookmark-link";
      link.type = "button";
      link.textContent = item.title;
      link.title = item.url;
      link.addEventListener("click", function () { navigate(item); });
      remove.className = "bookmark-remove";
      remove.type = "button";
      remove.setAttribute("aria-label", "删除书签：" + item.title);
      remove.title = "删除书签";
      remove.textContent = "×";
      remove.addEventListener("click", function () {
        bookmarks.splice(index, 1);
        saveBookmarks();
        render();
      });
      row.appendChild(link);
      row.appendChild(remove);
      fragment.appendChild(row);
    });
    list.appendChild(fragment);
  }

  function addCurrent() {
    refreshCurrent();
    if (!currentTopic.url) return;
    var exists = bookmarks.some(function (item) { return item.url === currentTopic.url; });
    if (!exists) bookmarks.push({ title: currentTopic.title || "未命名页面", url: currentTopic.url });
    saveBookmarks();
    render();
    status.textContent = exists ? "此文章已在书签中" : "已添加书签";
  }

  function init() {
    list = document.getElementById("bookmarkList");
    status = document.getElementById("bookmarkStatus");
    loadBookmarks();
    refreshCurrent();
    render();
    document.getElementById("addBookmark").addEventListener("click", addCurrent);
    window.addEventListener("focus", refreshCurrent);
  }

  window.WebHelpBookmarks = { refreshCurrent: refreshCurrent };
  window.add_click = addCurrent;
  window.display_click = function () { if (bookmarks[0]) navigate(bookmarks[0]); };
  window.remove_click = function () { if (bookmarks.length) { bookmarks.shift(); saveBookmarks(); render(); } };
  document.addEventListener("DOMContentLoaded", init);
})();
