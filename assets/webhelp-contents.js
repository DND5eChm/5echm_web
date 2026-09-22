(function () {
  "use strict";

  var path = "icons/";
  var AutoCollapse = false;
  var LastSelected = -1;
  var loaded = false;
  var divlist = [];
  var filterSnapshot = null;

  function get(id) {
    return document.getElementById(id);
  }

  function SetEnv(view, autoCollapse) {
    AutoCollapse = Boolean(autoCollapse);
  }

  function disclosureControl(id) {
    var image = get("imgn" + id);
    if (image && image.parentElement) return image.parentElement;
    var label = get("l" + id);
    var node = label && label.closest ? label.closest(".nav-node") : null;
    return node ? node.querySelector("a:first-child:not(:last-of-type)") : null;
  }

  function disclosureLabel(id, expanded) {
    var label = get("l" + id);
    var title = label ? (label.textContent || "").replace(/\s+/g, " ").trim() : "";
    return (expanded ? "收起" : "展开") + "目录项" + (title ? "：" + title : "");
  }

  function updateDisclosureState(id, expanded) {
    var control = disclosureControl(id);
    if (!control) return;
    var branchId = "d" + id;
    var label = disclosureLabel(id, expanded);
    control.classList.add("nav-disclosure");
    control.setAttribute("role", "button");
    control.setAttribute("tabindex", "0");
    control.setAttribute("aria-controls", branchId);
    control.setAttribute("aria-expanded", String(expanded));
    control.setAttribute("aria-label", label);
    control.setAttribute("title", label);
  }

  function updateLegacyIcon(id, expanded) {
    var image = get("imgn" + id);
    if (image) {
      image.hidden = true;
      image.setAttribute("aria-hidden", "true");
      var source = image.getAttribute("src") || "";
      source = expanded ? source.replace(/plus\.gif$/i, "minus.gif") : source.replace(/minus\.gif$/i, "plus.gif");
      image.setAttribute("src", source || path + (expanded ? "tminus.gif" : "tplus.gif"));
    }
    updateDisclosureState(id, expanded);
  }

  function show(id) {
    var branch = get("d" + id);
    if (!branch) return;
    branch.style.display = "block";
    updateLegacyIcon(id, true);
  }

  function collapse(id) {
    var branch = get("d" + id);
    if (!branch) return;
    branch.style.display = "none";
    updateLegacyIcon(id, false);
  }

  function collapseAll() {
    branchIds().forEach(function (id) { collapse(id); });
  }

  function showAll() {
    branchIds().forEach(function (id) { show(id); });
  }

  function branchIds() {
    return Array.prototype.map.call(document.querySelectorAll('div[id^="d"]'), function (branch) {
      return /^d\d+$/.test(branch.id) ? parseInt(branch.id.slice(1), 10) : -1;
    }).filter(function (id) { return id >= 0; });
  }

  function expandSelected() {
    if (LastSelected < 0) return;
    show(LastSelected);
  }

  function unselectAll() {
    document.querySelectorAll('[id^="l"]').forEach(function (label) {
      label.className = "unselected";
      if (label.parentElement) label.parentElement.classList.remove("is-selected");
    });
    LastSelected = -1;
  }

  function showParent(element) {
    var current = element ? element.parentElement : null;
    while (current && current !== document.body) {
      if (current.id && /^d\d+$/.test(current.id)) show(current.id.slice(1));
      current = current.parentElement;
    }
  }

  function LinkClick(index, hasChild, result) {
    if (AutoCollapse && hasChild) {
      collapseAll();
      showParent(get("l" + index));
      show(index);
    }
    if (LastSelected !== -1) {
      var previous = get("l" + LastSelected);
      if (previous) {
        previous.className = "unselected";
        if (previous.parentElement) previous.parentElement.classList.remove("is-selected");
      }
    }
    var label = get("l" + index);
    if (label) {
      label.className = "selected";
      if (label.parentElement) label.parentElement.classList.add("is-selected");
      LastSelected = index;
      try {
        if (parent.WebHelpShell && parent.WebHelpShell.rememberNavigationNode) {
          parent.WebHelpShell.rememberNavigationNode(index);
        }
      } catch (error) {}
    }
    return result;
  }

  function selectNode(index, shouldScroll) {
    var label = get("l" + index);
    if (!label) return;
    showParent(label);
    LinkClick(index, false, true);
    if (shouldScroll !== false) label.scrollIntoView({ block: "nearest" });
  }

  function navigateLink(link) {
    if (!link || !link.href || /#$/.test(link.href)) return false;
    try {
      if (parent.WebHelpShell && parent.WebHelpShell.navigate) return parent.WebHelpShell.navigate(link.href);
    } catch (error) {}
    window.open(link.href, "content");
    return true;
  }

  function clickNode(index) {
    var label = get("l" + index);
    if (!label) return;
    selectNode(index, true);
    if (!navigateLink(label.parentElement)) NodeClick(index);
  }

  function showNode(index) {
    selectNode(index, true);
  }

  function NodeClick(id) {
    var branch = get("d" + id);
    if (!branch) return false;
    branch.style.display === "none" ? show(id) : collapse(id);
    return false;
  }

  function LinkDblClick(id) {
    if (!AutoCollapse) NodeClick(id);
    return false;
  }

  function directBranch(node) {
    return Array.prototype.find.call(node.children, function (child) {
      return child.id && /^d\d+$/.test(child.id);
    }) || null;
  }

  function childNodes(branch) {
    if (!branch) return [];
    return Array.prototype.filter.call(branch.children, function (child) {
      return child.classList && child.classList.contains("nav-node");
    });
  }

  function ownLabel(node) {
    var label = node.querySelector('[id^="l"]');
    return label ? (label.textContent || "") : "";
  }

  function rootNodes() {
    return Array.prototype.filter.call(document.querySelectorAll(".nav-node"), function (node) {
      return !node.parentElement.closest(".nav-node");
    });
  }

  function nodeLabelElement(node) {
    if (!node) return null;
    return Array.prototype.reduce.call(node.children, function (result, child) {
      if (result || child.tagName !== "A") return result;
      return child.querySelector('[id^="l"]');
    }, null);
  }

  function nodeLink(node) {
    if (!node) return null;
    return Array.prototype.find.call(node.children, function (child) {
      return child.tagName === "A" && child.getAttribute("target") === "content";
    }) || null;
  }

  function nodeId(node) {
    var label = nodeLabelElement(node);
    var id = label ? parseInt(label.id.slice(1), 10) : -1;
    return isNaN(id) ? -1 : id;
  }

  function normaliseBookLabel(value) {
    return String(value || "")
      .replace(/\*/g, "")
      .replace(/new!/ig, "")
      .replace(/[（(]无模组[）)]/g, "")
      .replace(/[（(]旧版[）)]/g, "")
      .replace(/\s+/g, "")
      .trim();
  }

  function isContentLabel(value) {
    var text = String(value || "").replace(/\s+/g, "");
    return Boolean(text) && !/^[—–-]+$/.test(text) && text.indexOf("分割线") === -1;
  }

  function findBookNode(book) {
    var labels = [book && book.title].concat(book && book.tocLabels || [])
      .map(normaliseBookLabel)
      .filter(Boolean);
    var ancestorLabels = (book && book.ancestorTitles || []).map(normaliseBookLabel).filter(Boolean);
    function matches(node, requireAncestor) {
      var label = nodeLabelElement(node);
      if (!label || labels.indexOf(normaliseBookLabel(label.textContent)) === -1) return false;
      if (!requireAncestor || !ancestorLabels.length) return true;
      var parent = node.parentElement && node.parentElement.closest ? node.parentElement.closest(".nav-node") : null;
      while (parent) {
        var parentLabel = nodeLabelElement(parent);
        if (parentLabel && ancestorLabels.indexOf(normaliseBookLabel(parentLabel.textContent)) !== -1) return true;
        parent = parent.parentElement && parent.parentElement.closest ? parent.parentElement.closest(".nav-node") : null;
      }
      return false;
    }
    var rootMatch = rootNodes().find(function (node) { return matches(node, false); });
    if (rootMatch) return rootMatch;
    if (!ancestorLabels.length) return null;
    return Array.prototype.find.call(document.querySelectorAll(".nav-node"), function (node) {
      return matches(node, true);
    }) || null;
  }

  function bookNodeRecord(node) {
    var label = nodeLabelElement(node);
    var link = nodeLink(node);
    var id = nodeId(node);
    if (!label || id < 0 || !isContentLabel(label.textContent)) return null;
    return {
      id: id,
      title: (label.textContent || "").replace(/\s+/g, " ").trim(),
      href: link ? link.getAttribute("href") || "" : "",
      hasChildren: Boolean(directBranch(node))
    };
  }

  function getBookOutline(book) {
    var node = findBookNode(book || {});
    if (!node) return null;
    var branch = directBranch(node);
    var entries = Array.prototype.map.call(node.querySelectorAll(".nav-node"), bookNodeRecord)
      .filter(Boolean);
    return {
      id: nodeId(node),
      title: (nodeLabelElement(node).textContent || "").replace(/\s+/g, " ").trim(),
      count: entries.length,
      children: childNodes(branch).map(bookNodeRecord).filter(Boolean)
    };
  }

  function clearBookFocus() {
    document.querySelectorAll(".bookshelf-focused").forEach(function (node) {
      node.classList.remove("bookshelf-focused");
    });
  }

  function focusBook(book) {
    var node = findBookNode(book || {});
    if (!node) return null;
    var filter = get("directoryFilter");
    if (filter && filter.value) {
      filter.value = "";
      clearFilter();
    }
    var id = nodeId(node);
    var label = nodeLabelElement(node);
    showParent(label);
    show(id);
    clearBookFocus();
    node.classList.add("bookshelf-focused");
    try {
      node.scrollIntoView({
        block: "center",
        behavior: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
    } catch (error) {
      if (label) label.scrollIntoView({ block: "nearest" });
    }
    return getBookOutline(book);
  }

  function activateBookNode(index) {
    var id = parseInt(index, 10);
    if (isNaN(id) || !get("l" + id)) return false;
    clickNode(id);
    return true;
  }

  function snapshotBranches() {
    var snapshot = {};
    document.querySelectorAll('div[id^="d"]').forEach(function (branch) {
      snapshot[branch.id] = branch.style.display || "block";
    });
    return snapshot;
  }

  function filterNode(node, query, count) {
    var branch = directBranch(node);
    var descendantsVisible = false;
    childNodes(branch).forEach(function (child) {
      if (filterNode(child, query, count)) descendantsVisible = true;
    });
    var matches = ownLabel(node).toLocaleLowerCase("zh-CN").indexOf(query) !== -1;
    if (matches) count.value += 1;
    var visible = matches || descendantsVisible;
    node.hidden = !visible;
    if (branch) {
      branch.style.display = descendantsVisible ? "block" : "none";
      updateLegacyIcon(branch.id.slice(1), descendantsVisible);
    }
    return visible;
  }

  function clearFilter() {
    document.querySelectorAll(".nav-node").forEach(function (node) { node.hidden = false; });
    if (filterSnapshot) {
      Object.keys(filterSnapshot).forEach(function (id) {
        var branch = get(id);
        if (!branch) return;
        branch.style.display = filterSnapshot[id];
        updateLegacyIcon(id.slice(1), filterSnapshot[id] !== "none");
      });
    }
    filterSnapshot = null;
    get("filterCount").textContent = "";
  }

  function applyFilter(value) {
    var query = String(value || "").trim().toLocaleLowerCase("zh-CN");
    if (!query) {
      clearFilter();
      return;
    }
    if (!filterSnapshot) filterSnapshot = snapshotBranches();
    var count = { value: 0 };
    rootNodes().forEach(function (node) { filterNode(node, query, count); });
    get("filterCount").textContent = count.value ? count.value + " 个匹配" : "无匹配";
  }

  function navigateHistory(direction) {
    try {
      var historyWindow = parent;
      if (!parent.WebHelpShell && parent.frames && parent.frames.content) historyWindow = parent.frames.content;
      if (direction < 0) historyWindow.history.back();
      else historyWindow.history.forward();
    } catch (error) {}
  }

  function initialiseTree() {
    enhanceDisclosureControls();
    branchIds().forEach(function (id) {
      var branch = get("d" + id);
      if (branch) updateLegacyIcon(id, branch.style.display !== "none");
    });
    var loading = get("loading");
    if (loading) loading.hidden = true;
    loaded = true;

    var filter = get("directoryFilter");
    filter.addEventListener("input", function () { applyFilter(filter.value); });
    filter.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      if (filter.value) {
        filter.value = "";
        clearFilter();
        event.preventDefault();
      } else {
        try { if (parent.WebHelpShell) parent.WebHelpShell.closeDrawer(); } catch (error) {}
      }
    });
    get("expandSelectedButton").addEventListener("click", expandSelected);
    get("collapseAllButton").addEventListener("click", collapseAll);
    get("previousTopicButton").addEventListener("click", function () { navigateHistory(-1); });
    get("nextTopicButton").addEventListener("click", function () { navigateHistory(1); });
  }

  function enhanceDisclosureControls() {
    document.querySelectorAll(".nav-node").forEach(function (node) {
      var branch = directBranch(node);
      if (!branch) return;
      var id = parseInt(branch.id.slice(1), 10);
      if (isNaN(id)) return;
      var control = disclosureControl(id);
      if (!control) return;
      control.addEventListener("keydown", function (event) {
        if (event.key !== " " && event.key !== "Spacebar") return;
        event.preventDefault();
        NodeClick(id);
      });
    });
  }

  function body_onload() {
    if (!loaded) initialiseTree();
  }

  window.SetEnv = SetEnv;
  window.show = show;
  window.collapse = collapse;
  window.collapseAll = collapseAll;
  window.showAll = showAll;
  window.unselectAll = unselectAll;
  window.clickNode = clickNode;
  window.showParent = showParent;
  window.showNode = showNode;
  window.selectNode = selectNode;
  window.NodeClick = NodeClick;
  window.LinkDblClick = LinkDblClick;
  window.LinkClick = LinkClick;
  window.body_onload = body_onload;
  window.WebHelpContents = {
    activateNode: activateBookNode,
    focusBook: focusBook,
    getBookOutline: getBookOutline
  };
  Object.defineProperty(window, "LastSelected", {
    get: function () { return LastSelected; },
    set: function (value) { LastSelected = parseInt(value, 10); }
  });
  Object.defineProperty(window, "divlist", {
    get: function () { return divlist; },
    set: function (value) { divlist = Array.isArray(value) ? value : []; }
  });

  document.addEventListener("DOMContentLoaded", initialiseTree);
})();
