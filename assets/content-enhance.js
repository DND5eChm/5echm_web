(function () {
  "use strict";

  var STORAGE_KEY = "5echm.webhelp.statblock-view";
  var MOBILE_QUERY = "(max-width: 767px)";
  var ABILITY_LABELS = {
    "力量": "str", "str": "str", "strength": "str",
    "敏捷": "dex", "dex": "dex", "dexterity": "dex",
    "体质": "con", "con": "con", "constitution": "con",
    "智力": "int", "int": "int", "intelligence": "int",
    "感知": "wis", "wis": "wis", "wisdom": "wis",
    "魅力": "cha", "cha": "cha", "charisma": "cha"
  };
  var ABILITY_NAMES = {
    str: "力量", dex: "敏捷", con: "体质", int: "智力", wis: "感知", cha: "魅力"
  };
  var LABELS = {
    ac: ["ac", "护甲等级"],
    hp: ["hp", "生命值"],
    speed: ["速度"],
    initiative: ["先攻"]
  };

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function cleanText(value) {
    return String(value || "").replace(/[\u00a0\s]+/g, " ").trim();
  }

  function nodeText(node) {
    return cleanText(node && node.textContent);
  }

  function readView() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "original" ? "original" : "responsive";
    } catch (error) {
      return "responsive";
    }
  }

  function writeView(value) {
    try { window.localStorage.setItem(STORAGE_KEY, value); } catch (error) {}
  }

  function makeElement(doc, tag, className) {
    var element = doc.createElement(tag);
    if (className) element.className = className;
    return element;
  }

  function stripIds(node) {
    if (!node || node.nodeType !== 1) return node;
    if (node.removeAttribute) node.removeAttribute("id");
    toArray(node.querySelectorAll ? node.querySelectorAll("[id]") : []).forEach(function (child) {
      child.removeAttribute("id");
    });
    return node;
  }

  function cloneNode(node) {
    return node && node.cloneNode ? stripIds(node.cloneNode(true)) : null;
  }

  function ancestorElement(node, tagName) {
    var current = node && node.parentElement;
    var wanted = String(tagName || "").toLowerCase();
    while (current) {
      if (current.tagName && current.tagName.toLowerCase() === wanted) return current;
      current = current.parentElement;
    }
    return null;
  }

  function findImageLayout(block) {
    var current = block.parentElement;
    while (current) {
      if (current.tagName && current.tagName.toLowerCase() === "table") {
        var images = toArray(current.querySelectorAll("img")).filter(function (image) {
          return !block.contains(image);
        });
        if (images.length) return { table: current, images: images };
      }
      current = current.parentElement;
    }
    return null;
  }

  function markImageLayout(layout) {
    if (!layout || !layout.table) return;
    var parent = layout.table.parentElement;
    var wrapper = parent && (parent.classList.contains("statblock-layout-scroll") ||
      parent.classList.contains("table-responsive") || parent.classList.contains("webhelp-table-scroll")) ? parent : null;
    if (!wrapper && layout.table.parentNode) {
      wrapper = makeElement(layout.table.ownerDocument, "div", "statblock-layout-scroll");
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "可横向滚动的原版数据块");
      wrapper.tabIndex = 0;
      layout.table.parentNode.insertBefore(wrapper, layout.table);
      wrapper.appendChild(layout.table);
    }
    if (wrapper) {
      wrapper.classList.add("statblock-layout-scroll");
      layout.wrapper = wrapper;
    }
    layout.table.classList.add("statblock-layout");
    layout.table.setAttribute("data-statblock-layout", "true");
    layout.images.forEach(function (image) {
      var cell = ancestorElement(image, "td");
      if (cell) cell.classList.add("statblock-image-cell");
    });
    var contentCell = ancestorElement(layout.table.querySelector(".stat-block"), "td");
    if (contentCell) contentCell.classList.add("statblock-content-cell");
  }

  function directCells(row, tagName) {
    return toArray(row ? row.children : []).filter(function (child) {
      return !tagName || child.tagName.toLowerCase() === tagName;
    });
  }

  function removeFirstLabel(clone) {
    if (!clone) return;
    var labelNode = clone.querySelector ? clone.querySelector("strong, b") : null;
    if (labelNode && labelNode.parentNode) labelNode.parentNode.removeChild(labelNode);
  }

  function labelFromCell(cell) {
    var labelNode = cell && cell.querySelector ? cell.querySelector("strong, b") : null;
    return cleanText(labelNode ? labelNode.textContent : "").replace(/[：:]$/, "");
  }

  function valueClone(cell) {
    var clone = cloneNode(cell);
    removeFirstLabel(clone);
    if (!clone) return null;
    var wrapper = cell.ownerDocument.createElement("span");
    while (clone.firstChild) wrapper.appendChild(clone.firstChild);
    return wrapper;
  }

  function matchesLabel(label, names) {
    var value = cleanText(label).toLowerCase().replace(/[：:]$/, "");
    return names.some(function (name) {
      return value === name || value.indexOf(name + " ") === 0;
    });
  }

  function findLabelValue(cell) {
    return {
      label: labelFromCell(cell),
      value: valueClone(cell)
    };
  }

  function parseSummary(block) {
    var tables = toArray(block.querySelectorAll("table")).filter(function (table) {
      return !table.classList.contains("stat-abilities");
    });
    if (!tables.length) return [];
    var first = tables[0];
    var values = [];
    toArray(first.querySelectorAll("tr")).forEach(function (row) {
      directCells(row, "td").forEach(function (cell) {
        var item = findLabelValue(cell);
        if (item.label) {
          var key = "normal";
          if (matchesLabel(item.label, LABELS.hp)) key = "hp";
          else if (matchesLabel(item.label, LABELS.speed)) key = "speed";
          else if (matchesLabel(item.label, LABELS.ac)) key = "ac";
          else if (matchesLabel(item.label, LABELS.initiative)) key = "initiative";
          values.push({ key: key, label: item.label, value: item.value });
        }
      });
    });
    return values;
  }

  function abilityLabelCount(table) {
    var keys = {};
    toArray(table ? table.querySelectorAll("td, th") : []).forEach(function (cell) {
      var key = ABILITY_LABELS[nodeText(cell).toLowerCase()];
      if (key) keys[key] = true;
    });
    return Object.keys(keys).length;
  }

  function findAbilityTable(block) {
    var explicit = block.querySelector("table.stat-abilities");
    if (explicit) return explicit;
    return toArray(block.querySelectorAll("table")).filter(function (table) {
      return abilityLabelCount(table) >= 6;
    })[0] || null;
  }

  function parseModernAbilities(table) {
    var result = [];
    if (!table) return result;
    toArray(table.querySelectorAll("tr")).forEach(function (row) {
      var cells = directCells(row);
      for (var index = 0; index < cells.length; index += 1) {
        var name = nodeText(cells[index]);
        var key = ABILITY_LABELS[name.toLowerCase()];
        if (!key) continue;
        if (result.some(function (ability) { return ability.key === key; })) continue;
        var score = cells[index + 1] && nodeText(cells[index + 1]);
        var modifier = cells[index + 2] && nodeText(cells[index + 2]);
        var save = cells[index + 3] && nodeText(cells[index + 3]);
        result.push({ key: key, label: ABILITY_NAMES[key], score: score || "", modifier: modifier || "", save: save || "" });
      }
    });
    return result;
  }

  function parseLegacyAbilities(block) {
    var result = [];
    toArray(block.querySelectorAll("table")).some(function (table) {
      var rows = toArray(table.querySelectorAll("tr"));
      if (rows.length < 2) return false;
      var headers = directCells(rows[0], "th");
      if (headers.length !== 6) return false;
      var keys = headers.map(function (cell) { return ABILITY_LABELS[nodeText(cell).toLowerCase()]; });
      if (keys.some(function (key) { return !key; })) return false;
      var values = directCells(rows[1], "td");
      if (values.length < 6) return false;
      keys.forEach(function (key, index) {
        var text = nodeText(values[index]);
        var match = /^(\d+)(?:\s*\(\s*([+\-−]?\d+)\s*\))?/.exec(text);
        result.push({
          key: key,
          label: ABILITY_NAMES[key],
          score: match ? match[1] : text,
          modifier: match && match[2] ? match[2].replace("−", "-") : "",
          save: ""
        });
      });
      return true;
    });
    return result;
  }

  function parseDetails(block, abilityTable) {
    var details = [];
    var summaryTable = block.querySelector("table");
    toArray(block.querySelectorAll("table")).forEach(function (table) {
      if (table === abilityTable || table === summaryTable) return;
      if (table.querySelector(".c1")) return;
      toArray(table.querySelectorAll("tr")).forEach(function (row) {
        var cells = directCells(row, "td");
        if (!cells.length) return;
        var item = findLabelValue(cells[0]);
        if (!item.label) return;
        details.push(item);
      });
    });
    return details;
  }

  function parseSections(block) {
    var sections = [];
    var headings = toArray(block.querySelectorAll("h6"));
    headings.forEach(function (heading, index) {
      var section = { title: cloneNode(heading), content: [] };
      var node = heading.nextElementSibling;
      var nextHeading = headings[index + 1];
      while (node && node !== nextHeading) {
        if (nodeText(node)) section.content.push(cloneNode(node));
        node = node.nextElementSibling;
      }
      sections.push(section);
    });
    return sections;
  }

  function parseExtras(block, abilityTable, sections) {
    var firstHeading = block.querySelector("h6");
    var extras = [];
    var node = block.firstElementChild;
    while (node && node !== firstHeading) {
      var isKnown = node.tagName.toLowerCase() === "h5" ||
        node.classList.contains("sub-line") || node.tagName.toLowerCase() === "table" ||
        node.tagName.toLowerCase() === "hr" || !nodeText(node);
      if (!isKnown) {
        if (node !== abilityTable) extras.push(cloneNode(node));
      }
      node = node.nextElementSibling;
    }
    return extras;
  }

  function parseStatBlock(block) {
    var heading = block.querySelector("h5");
    var subtitle = block.querySelector(".sub-line");
    var abilityTable = findAbilityTable(block);
    var abilities = abilityTable ? parseModernAbilities(abilityTable) : parseLegacyAbilities(block);
    var summary = parseSummary(block);
    var details = parseDetails(block, abilityTable);
    var sections = parseSections(block);
    var extras = parseExtras(block, abilityTable, sections);
    if (!heading || !nodeText(heading) || (abilityTable && abilities.length < 6) || (abilities.length < 6 && !summary.length)) return null;
    return {
      name: cloneNode(heading),
      subtitle: subtitle ? cloneNode(subtitle) : null,
      summary: summary,
      abilities: abilities,
      details: details,
      sections: sections,
      extras: extras,
      abilityTable: abilityTable
    };
  }

  function appendValue(parent, value) {
    if (value) parent.appendChild(value);
  }

  function appendChildren(parent, node) {
    if (!parent || !node) return;
    toArray(node.childNodes).forEach(function (child) {
      parent.appendChild(child.cloneNode(true));
    });
  }

  function renderSummary(doc, model, root) {
    if (!model.summary.length) return;
    var summary = makeElement(doc, "div", "statblock-responsive__summary");
    model.summary.forEach(function (item) {
      var card = makeElement(doc, "div", "statblock-responsive__summary-item");
      if (item.key === "hp" || item.key === "speed") card.className += " statblock-responsive__summary-item--wide";
      var label = makeElement(doc, "span", "statblock-responsive__label");
      label.textContent = item.label;
      var value = makeElement(doc, "span", "statblock-responsive__value");
      appendValue(value, item.value);
      card.appendChild(label);
      card.appendChild(value);
      summary.appendChild(card);
    });
    root.appendChild(summary);
  }

  function renderAbilities(doc, abilities, root) {
    if (abilities.length < 6) return;
    var grid = makeElement(doc, "div", "statblock-responsive__abilities");
    abilities.slice(0, 6).forEach(function (ability) {
      var item = makeElement(doc, "div", "statblock-responsive__ability");
      var title = makeElement(doc, "div", "statblock-responsive__ability-title");
      title.textContent = ability.label;
      var score = makeElement(doc, "strong", "statblock-responsive__ability-score");
      score.textContent = ability.score;
      title.appendChild(doc.createTextNode(" "));
      title.appendChild(score);
      item.appendChild(title);
      var modifier = makeElement(doc, "div", "statblock-responsive__ability-line");
      modifier.textContent = ability.modifier ? "调整 " + ability.modifier : "调整";
      item.appendChild(modifier);
      var save = makeElement(doc, "div", "statblock-responsive__ability-line");
      save.textContent = ability.save ? "豁免 " + ability.save : "豁免";
      item.appendChild(save);
      grid.appendChild(item);
    });
    root.appendChild(grid);
  }

  function renderDetails(doc, details, root) {
    if (!details.length) return;
    var list = makeElement(doc, "dl", "statblock-responsive__details");
    details.forEach(function (item) {
      var term = makeElement(doc, "dt", "statblock-responsive__detail-label");
      term.textContent = item.label;
      var value = makeElement(doc, "dd", "statblock-responsive__detail-value");
      appendValue(value, item.value);
      list.appendChild(term);
      list.appendChild(value);
    });
    root.appendChild(list);
  }

  function renderSections(doc, sections, root) {
    sections.forEach(function (section) {
      var element = makeElement(doc, "section", "statblock-responsive__section");
      var title = makeElement(doc, "h3", "statblock-responsive__section-title");
      appendChildren(title, section.title);
      element.appendChild(title);
      section.content.forEach(function (content) {
        if (content) element.appendChild(content);
      });
      root.appendChild(element);
    });
  }

  function renderMedia(doc, images, root) {
    if (!images || !images.length) return;
    var media = root.querySelector(".statblock-responsive__media") || makeElement(doc, "div", "statblock-responsive__media");
    images.forEach(function (image) {
      var clone = cloneNode(image);
      if (clone) media.appendChild(clone);
    });
    if (!media.parentNode && media.childNodes.length) root.appendChild(media);
  }

  function moveInlineImagesToBottom(doc, root) {
    var images = toArray(root.querySelectorAll("img"));
    if (!images.length) return;
    var media = makeElement(doc, "div", "statblock-responsive__media");
    images.forEach(function (image) {
      if (image.parentNode) image.parentNode.removeChild(image);
      media.appendChild(image);
    });
    root.appendChild(media);
  }

  function renderStatBlock(doc, block, model) {
    var responsive = makeElement(doc, "div", "statblock-responsive");
    responsive.setAttribute("aria-label", "移动适配数据块");
    var header = makeElement(doc, "div", "statblock-responsive__header");
    var title = makeElement(doc, "h2", "statblock-responsive__title");
    appendChildren(title, model.name);
    header.appendChild(title);
    if (model.subtitle) {
      var subtitle = makeElement(doc, "div", "statblock-responsive__subtitle");
      appendChildren(subtitle, model.subtitle);
      header.appendChild(subtitle);
    }
    responsive.appendChild(header);
    renderSummary(doc, model, responsive);
    renderAbilities(doc, model.abilities, responsive);
    renderDetails(doc, model.details, responsive);
    if (model.extras.length) {
      var extras = makeElement(doc, "div", "statblock-responsive__extras");
      model.extras.forEach(function (extra) { if (extra) extras.appendChild(extra); });
      responsive.appendChild(extras);
    }
    renderSections(doc, model.sections, responsive);
    moveInlineImagesToBottom(doc, responsive);
    renderMedia(doc, model.media, responsive);
    block.appendChild(responsive);
    return responsive;
  }

  function wrapSource(doc, block) {
    var source = makeElement(doc, "div", "statblock-source");
    while (block.firstChild) source.appendChild(block.firstChild);
    block.appendChild(source);
    return source;
  }

  function setVisibility(block, view, mobile) {
    var source = block.querySelector(".statblock-source");
    var responsive = block.querySelector(".statblock-responsive");
    if (!responsive) return;
    var useResponsive = mobile && view === "responsive";
    block.setAttribute("data-statblock-view", useResponsive ? "responsive" : "original");
    var layout = ancestorElement(block, "table");
    if (layout && layout.classList.contains("statblock-layout")) {
      layout.setAttribute("data-statblock-view", useResponsive ? "responsive" : "original");
    }
    source.setAttribute("aria-hidden", useResponsive ? "true" : "false");
    responsive.setAttribute("aria-hidden", useResponsive ? "false" : "true");
    responsive.hidden = !useResponsive;
  }

  function addViewToggle(doc, block, responsive) {
    var toggle = makeElement(doc, "div", "statblock-view-toggle");
    toggle.setAttribute("role", "group");
    toggle.setAttribute("aria-label", "数据块布局");
    var mobileButton = makeElement(doc, "button", "statblock-view-toggle__button");
    mobileButton.type = "button";
    mobileButton.textContent = "移动适配";
    var originalButton = makeElement(doc, "button", "statblock-view-toggle__button");
    originalButton.type = "button";
    originalButton.textContent = "原版布局";
    toggle.appendChild(mobileButton);
    toggle.appendChild(originalButton);
    block.parentNode.insertBefore(toggle, block);
    var view = readView();
    function apply(value) {
      view = value;
      writeView(value);
      mobileButton.setAttribute("aria-pressed", String(value === "responsive"));
      originalButton.setAttribute("aria-pressed", String(value === "original"));
      setVisibility(block, value, isMobile());
    }
    mobileButton.addEventListener("click", function () { apply("responsive"); });
    originalButton.addEventListener("click", function () { apply("original"); });
    apply(view);
    return function (mobile) { setVisibility(block, view, mobile); };
  }

  function isMobile() {
    try {
      return window.matchMedia ? window.matchMedia(MOBILE_QUERY).matches : window.innerWidth < 768;
    } catch (error) {
      return window.innerWidth < 768;
    }
  }

  function enhanceStatBlocks(doc) {
    var refresh = [];
    toArray(doc.querySelectorAll(".stat-block")).forEach(function (block) {
      if (block.getAttribute("data-statblock-enhanced") === "true") return;
      var model;
      try { model = parseStatBlock(block); } catch (error) { model = null; }
      if (!model) {
        block.setAttribute("data-statblock-enhanced", "fallback");
        return;
      }
      try {
        var layout = findImageLayout(block);
        markImageLayout(layout);
        block.setAttribute("data-statblock-enhanced", "true");
        wrapSource(doc, block);
        model.media = layout ? layout.images : [];
        var responsive = renderStatBlock(doc, block, model);
        refresh.push(addViewToggle(doc, block, responsive));
      } catch (error) {
        block.setAttribute("data-statblock-enhanced", "fallback");
      }
    });
    function refreshVisibility() {
      var mobile = isMobile();
      refresh.forEach(function (update) { update(mobile); });
    }
    refreshVisibility();
    if (refresh.length && !doc.documentElement.getAttribute("data-statblock-resize")) {
      doc.documentElement.setAttribute("data-statblock-resize", "true");
      window.addEventListener("resize", refreshVisibility);
    }
  }

  function hasSpan(table) {
    return Boolean(table.querySelector("[rowspan], [colspan]"));
  }

  function columnCount(table) {
    var maximum = 0;
    toArray(table.querySelectorAll("tr")).forEach(function (row) {
      var count = 0;
      directCells(row).forEach(function (cell) { count += parseInt(cell.getAttribute("colspan") || "1", 10) || 1; });
      maximum = Math.max(maximum, count);
    });
    return maximum;
  }

  function firstRow(table) {
    return table.querySelector("tr");
  }

  function classifyTable(table) {
    var className = String(table.className || "").toLowerCase();
    if (table.getAttribute("role") === "presentation" || /(^|[\s_-])layout([\s_-]|$)/.test(className) || table.getAttribute("data-statblock-layout") === "true") return "unknown";
    var count = columnCount(table);
    var row = firstRow(table);
    var cells = directCells(row);
    var firstText = cells.length ? nodeText(cells[0]) : "";
    var headerText = nodeText(row);
    if (!headerText && !table.querySelector("th")) return "unknown";
    var dice = count === 2 && (/^\s*\d+d\d+/i.test(firstText) || /\b\d+d\d+\b/i.test(headerText));
    if (hasSpan(table)) return "wide";
    if (dice) return "dice";
    if (count <= 3) return "simple";
    return "wide";
  }

  function wrapTable(doc, table, kind) {
    var parent = table.parentElement;
    var wrapper = parent && (parent.classList.contains("table-responsive") || parent.classList.contains("webhelp-table-scroll")) ? parent : null;
    if (wrapper && !wrapper.classList.contains("table-responsive")) wrapper.classList.add("table-responsive");
    if (!wrapper && kind === "wide") {
      wrapper = makeElement(doc, "div", "table-responsive table-responsive--scroll");
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "可横向滚动的表格");
      wrapper.tabIndex = 0;
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
    if (wrapper) wrapper.classList.add("table-responsive--" + (kind === "wide" ? "scroll" : "fit"));
  }

  function enhanceTables(doc) {
    toArray(doc.querySelectorAll("table")).forEach(function (table) {
      if (table.closest && table.closest(".stat-block")) return;
      if (table.parentElement && table.parentElement.closest && table.parentElement.closest("table")) return;
      if (table.getAttribute("data-table-enhanced") === "true") return;
      var kind;
      try { kind = classifyTable(table); } catch (error) { kind = "unknown"; }
      if (kind === "unknown") return;
      table.classList.add("table-enhanced", "table-enhanced--" + kind);
      table.classList.add(kind === "wide" ? "table-responsive--scroll" : "table-responsive--fit");
      if (kind === "dice") table.classList.add("table-responsive--dice");
      table.setAttribute("data-table-enhanced", "true");
      wrapTable(doc, table, kind);
    });
  }

  function enhance(doc) {
    if (!doc || !doc.documentElement || !doc.body) return;
    enhanceStatBlocks(doc);
    enhanceTables(doc);
    doc.documentElement.setAttribute("data-content-enhanced", "true");
  }

  window.WebHelpContentEnhancer = {
    classifyTable: classifyTable,
    enhance: enhance,
    enhanceStatBlocks: enhanceStatBlocks,
    enhanceTables: enhanceTables,
    parseStatBlock: parseStatBlock
  };

  try { enhance(document); } catch (error) {}
})();
