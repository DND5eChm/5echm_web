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

  function updateLegacyIcon(id, expanded) {
    var image = get("imgn" + id);
    if (image) {
      var source = image.getAttribute("src") || "";
      source = expanded ? source.replace(/plus\.gif$/i, "minus.gif") : source.replace(/minus\.gif$/i, "plus.gif");
      image.setAttribute("src", source || path + (expanded ? "tminus.gif" : "tplus.gif"));
      if (image.parentElement) image.parentElement.setAttribute("aria-expanded", String(expanded));
    }
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

  function initialiseTree() {
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
    get("previousTopicButton").addEventListener("click", function () { clickNode(LastSelected - 1); });
    get("nextTopicButton").addEventListener("click", function () { clickNode(LastSelected + 1); });
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
