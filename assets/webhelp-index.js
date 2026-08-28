(function () {
  "use strict";

  var RENDER_LIMIT = 500;
  var entries = [];
  var input;
  var list;
  var status;

  function normalize(value) {
    return String(value || "").replace(/\u00a0/g, " ").trim();
  }

  function legacyUrls(value) {
    var urls = [];
    var matcher = /["']((?:topics|scr)\/[^"']+?\.html?(?:#[^"']*)?)["']/gi;
    var match;
    while ((match = matcher.exec(value || "")) !== null) urls.push(match[1]);
    if (!urls.length && /^(?:topics|scr)\//i.test(value || "")) urls.push(value);
    return urls;
  }

  function collectEntries() {
    var source = document.getElementById("indexSource");
    source.querySelectorAll("a[href]").forEach(function (link) {
      entries.push({ title: normalize(link.textContent), path: link.getAttribute("href") });
    });
    source.querySelectorAll("option").forEach(function (option) {
      var title = normalize(option.textContent);
      legacyUrls(option.value).forEach(function (url, index) {
        entries.push({ title: title + (index ? "（" + (index + 1) + "）" : ""), path: url.replace(/^scr\//i, "topics/") });
      });
    });
    var seen = Object.create(null);
    entries = entries.filter(function (entry) {
      if (!entry.title || !entry.path) return false;
      var key = entry.title + "\n" + entry.path;
      if (seen[key]) return false;
      seen[key] = true;
      entry.searchText = (entry.title + " " + entry.path).toLocaleLowerCase("zh-CN");
      return true;
    });
  }

  function navigate(event, entry) {
    try {
      if (parent.WebHelpShell && parent.WebHelpShell.navigate) {
        event.preventDefault();
        parent.WebHelpShell.navigate(entry.path);
      }
    } catch (error) {}
  }

  function render() {
    var query = normalize(input.value).toLocaleLowerCase("zh-CN");
    var matches = query ? entries.filter(function (entry) { return entry.searchText.indexOf(query) !== -1; }) : entries;
    var visible = matches.slice(0, RENDER_LIMIT);
    list.textContent = "";
    var fragment = document.createDocumentFragment();
    visible.forEach(function (entry) {
      var item = document.createElement("li");
      var link = document.createElement("a");
      var title = document.createElement("span");
      var path = document.createElement("span");
      link.href = entry.path;
      link.target = "content";
      title.textContent = entry.title;
      path.className = "index-path";
      path.textContent = entry.path.replace(/^topics\//i, "").replace(/\//g, " › ");
      link.appendChild(title);
      link.appendChild(path);
      link.addEventListener("click", function (event) { navigate(event, entry); });
      item.appendChild(link);
      fragment.appendChild(item);
    });
    list.appendChild(fragment);
    if (!matches.length) status.textContent = "没有匹配索引";
    else if (matches.length > visible.length) status.textContent = "显示前 " + visible.length + " 项，共 " + matches.length + " 项";
    else status.textContent = matches.length + " 项";
  }

  function setupKeyboard() {
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && input.value) {
        input.value = "";
        render();
        event.preventDefault();
      }
      if (event.key === "ArrowDown") {
        var first = list.querySelector("a");
        if (first) first.focus();
        event.preventDefault();
      }
    });
    list.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      var links = Array.prototype.slice.call(list.querySelectorAll("a"));
      var index = links.indexOf(document.activeElement) + (event.key === "ArrowDown" ? 1 : -1);
      if (links[index]) links[index].focus();
      else input.focus();
      event.preventDefault();
    });
  }

  function init() {
    input = document.getElementById("indexFilter");
    list = document.getElementById("indexList");
    status = document.getElementById("indexStatus");
    collectEntries();
    input.addEventListener("input", render);
    setupKeyboard();
    render();
    input.focus();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
