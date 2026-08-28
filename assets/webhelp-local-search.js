(function () {
  "use strict";

  var records = typeof window.contents !== "undefined" ? window.contents : [];
  var words = [];
  var ranks = [];
  var previousIndexes = [];
  var selectedIndex = -1;
  var list;

  function parseWords(input) {
    var result = [];
    var matcher = /"([^"]+)"|(\S+)/g;
    var match;
    while ((match = matcher.exec(input || "")) !== null) {
      String(match[1] || match[2] || "").split("|").forEach(function (part) {
        var value = part.trim();
        if (value) result.push(value);
      });
    }
    return result;
  }

  function occurrences(haystack, needle) {
    var source = String(haystack || "").toLocaleLowerCase("zh-CN");
    var target = String(needle || "").toLocaleLowerCase("zh-CN");
    if (!target) return 0;
    var count = 0;
    var offset = 0;
    while ((offset = source.indexOf(target, offset)) !== -1) {
      count += 1;
      offset += target.length;
    }
    return count;
  }

  function rankRecord(index, titleOnly) {
    var bodyText = records[index * 3] || "";
    var title = records[index * 3 + 1] || "";
    var titleRank = 1;
    var bodyRank = 1;
    words.forEach(function (word) {
      titleRank *= occurrences(title, word) + 1;
      if (!titleOnly) bodyRank *= occurrences(bodyText, word) + 1;
    });
    if (titleRank === 1 && bodyRank === 1) return 0;
    var divisor = Math.max(words.length, 1);
    return Math.round(Math.pow(titleRank, 1 / divisor) * 20 + Math.pow(bodyRank, 1 / divisor));
  }

  function highlightText(text) {
    var fragment = document.createDocumentFragment();
    var source = String(text || "");
    if (!words.length) {
      fragment.appendChild(document.createTextNode(source));
      return fragment;
    }
    var lowered = source.toLocaleLowerCase("zh-CN");
    var ranges = [];
    words.forEach(function (word) {
      var target = word.toLocaleLowerCase("zh-CN");
      var offset = 0;
      while (target && (offset = lowered.indexOf(target, offset)) !== -1) {
        ranges.push([offset, offset + target.length]);
        offset += target.length;
      }
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var cursor = 0;
    ranges.forEach(function (range) {
      if (range[0] < cursor) return;
      fragment.appendChild(document.createTextNode(source.slice(cursor, range[0])));
      var mark = document.createElement("mark");
      mark.textContent = source.slice(range[0], range[1]);
      fragment.appendChild(mark);
      cursor = range[1];
    });
    fragment.appendChild(document.createTextNode(source.slice(cursor)));
    return fragment;
  }

  function resultUrl(index) {
    return String(records[index * 3 + 2] || "").replace(/\\/g, "/");
  }

  function selectResult(index) {
    var items = Array.prototype.slice.call(list.querySelectorAll(".result-item"));
    if (!items.length) return;
    selectedIndex = Math.max(0, Math.min(index, items.length - 1));
    items.forEach(function (item, itemIndex) { item.classList.toggle("selected", itemIndex === selectedIndex); });
    items[selectedIndex].scrollIntoView({ block: "nearest" });
  }

  function openResult(index) {
    var result = ranks[index];
    if (!result) return;
    var url = resultUrl(result.index);
    try {
      parent.postMessage({ type: "webhelp-search-navigate", requestId: Date.now(), url: url, words: words.slice() }, "*");
      if (parent.WebHelpShell && parent.WebHelpShell.navigate) return;
    } catch (error) {}
    window.open(url, "content");
  }

  function renderResults() {
    list.textContent = "";
    document.getElementById("resultsInfo").style.display = ranks.length ? "block" : "none";
    document.getElementById("resultsCount").textContent = ranks.length;
    if (!ranks.length) {
      var empty = document.createElement("li");
      empty.className = "empty-state";
      empty.textContent = "没有匹配结果";
      list.appendChild(empty);
      selectedIndex = -1;
      return;
    }
    var fragment = document.createDocumentFragment();
    ranks.forEach(function (result, index) {
      var item = document.createElement("li");
      var title = document.createElement("div");
      var rank = document.createElement("span");
      var sourcePath = document.createElement("div");
      var snippet = document.createElement("p");
      item.className = "result-item" + (index === 0 ? " selected" : "");
      item.tabIndex = 0;
      title.className = "result-title-text";
      title.appendChild(highlightText(records[result.index * 3 + 1] || "未命名页面"));
      rank.className = "result-rank";
      rank.textContent = "相关度 " + result.rank;
      sourcePath.className = "result-meta";
      sourcePath.textContent = resultUrl(result.index).replace(/^topics\//i, "").replace(/\//g, " › ");
      snippet.className = "result-snippet";
      snippet.appendChild(highlightText(String(records[result.index * 3] || "").slice(0, 180)));
      item.appendChild(title);
      item.appendChild(rank);
      item.appendChild(sourcePath);
      item.appendChild(snippet);
      item.addEventListener("click", function () { selectResult(index); });
      item.addEventListener("dblclick", function () { openResult(index); });
      item.addEventListener("keydown", function (event) { if (event.key === "Enter") openResult(index); });
      fragment.appendChild(item);
    });
    list.appendChild(fragment);
    selectedIndex = 0;
  }

  function SearchIt() {
    var keyword = document.getElementById("keyword").value.trim();
    words = parseWords(keyword);
    window.words = words;
    if (!words.length) return;
    var titleOnly = document.getElementById("titleOnly").checked;
    var within = document.getElementById("previousResult").checked && previousIndexes.length;
    var candidates = within ? previousIndexes.slice() : Array.from({ length: Math.floor(records.length / 3) }, function (_, index) { return index; });
    ranks = candidates.map(function (index) { return { index: index, rank: rankRecord(index, titleOnly) }; })
      .filter(function (result) { return result.rank > 0; })
      .sort(function (a, b) { return b.rank - a.rank; });
    previousIndexes = ranks.map(function (result) { return result.index; });
    try { window.localStorage.setItem("5echm.webhelp.lastSearch", keyword); } catch (error) {}
    renderResults();
  }

  function init() {
    list = document.getElementById("resultsList");
    var input = document.getElementById("keyword");
    try {
      var query = new URL(window.location.href).searchParams.get("q") || "";
      input.value = query || window.localStorage.getItem("5echm.webhelp.lastSearch") || "";
    } catch (error) {}
    document.getElementById("localSearchForm").addEventListener("submit", function (event) { event.preventDefault(); SearchIt(); });
    document.getElementById("openSelected").addEventListener("click", function () { openResult(selectedIndex); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (ranks.length) selectResult(selectedIndex + (event.key === "ArrowDown" ? 1 : -1));
        event.preventDefault();
      }
      if (event.key === "Escape" && input.value) {
        input.value = "";
        input.focus();
      }
    });
    input.focus();
    if (input.value) SearchIt();
  }

  window.words = words;
  window.SearchIt = SearchIt;
  window.Go = function () { openResult(selectedIndex); };
  document.addEventListener("DOMContentLoaded", init);
})();
