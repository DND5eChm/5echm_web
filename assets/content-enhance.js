(function () {
  "use strict";

  var STORAGE_KEY = "5echm.webhelp.statblock-view";
  var MOBILE_QUERY = "(max-width: 767px)";
  var EXPORT_MAX_DIMENSION = 8192;
  var EXPORT_MAX_AREA = 16000000;
  var QUICK_REFERENCE_PAGE_SIZE = 150;
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
  var QUICK_REFERENCE_CONFIG = {
    spell: {
      rowAttribute: "spell",
      groups: [
        { name: "action", label: "施法时间" },
        { name: "level", label: "环阶" },
        { name: "school", label: "学派" },
        { name: "class", label: "职业" },
        { name: "book", label: "来源" }
      ],
      special: [
        { label: "专注", positive: "专注", negative: "非专" },
        { label: "仪式", positive: "仪式", negative: "非仪" },
        { label: "言语", positive: "言语", negative: "非言" },
        { label: "姿势", positive: "姿势", negative: "非姿" },
        { label: "材料", positive: "材料", negative: "非材" },
        { label: "贵重材料", positive: "价耗", negative: "无特" }
      ],
      sorts: [
        { value: "source", label: "原表顺序" },
        { value: "name", label: "名称" },
        { value: "level", label: "环阶" }
      ]
    },
    item: {
      rowAttribute: "item",
      groups: [
        { name: "rarity", label: "稀有度" },
        { name: "category", label: "类别" },
        { name: "book", label: "来源" }
      ],
      choice: {
        name: "attunement",
        label: "同调",
        anyLabel: "全选",
        optionLabels: { "否": "无需", "是": "需要", "特殊": "特殊" }
      },
      sorts: [
        { value: "source", label: "原表顺序" },
        { value: "name", label: "名称" },
        { value: "rarity", label: "稀有度" }
      ]
    },
    monster: {
      rowAttribute: "monster",
      groups: [
        { name: "size", label: "体型" },
        { name: "type", label: "类型" },
        { name: "book", label: "来源" }
      ],
      choice: {
        name: "legendary",
        label: "传奇动作",
        anyLabel: "全选",
        optionLabels: { "有": "有", "无": "无" }
      },
      range: { minId: "crMinSelect", maxId: "crMaxSelect", label: "挑战等级" },
      sorts: [
        { value: "source", label: "原表顺序" },
        { value: "name", label: "名称" },
        { value: "cr", label: "挑战等级" }
      ]
    }
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

  function makeSvgIcon(doc, pathData) {
    var namespace = "http://www.w3.org/2000/svg";
    var svg = doc.createElementNS(namespace, "svg");
    var path = doc.createElementNS(namespace, "path");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("statblock-button-icon");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
    return svg;
  }

  function setButtonState(button, active) {
    button.setAttribute("aria-pressed", String(Boolean(active)));
  }

  function inputLabel(input) {
    var label = input && input.nextElementSibling;
    if (label && label.tagName && label.tagName.toLowerCase() === "label") return label;
    return null;
  }

  function inputLabelText(input) {
    var label = inputLabel(input);
    return cleanText(label ? label.textContent : input && input.value);
  }

  function normalizeControlIds(controls, prefix) {
    controls.forEach(function (control, index) {
      control.id = prefix + "-" + (index + 1);
    });
  }

  function clearLegacyControlEvents(control) {
    ["click", "change", "input", "keyup", "search"].forEach(function (name) {
      control.removeAttribute("on" + name);
      control["on" + name] = null;
    });
  }

  function makeFilterGroup(doc, label) {
    var fieldset = makeElement(doc, "fieldset", "quickref-filter-group");
    var legend = makeElement(doc, "legend", "quickref-filter-label");
    var controls = makeElement(doc, "div", "quickref-filter-options");
    legend.textContent = label;
    fieldset.appendChild(legend);
    fieldset.appendChild(controls);
    return { element: fieldset, controls: controls };
  }

  function makeAllButton(doc, label) {
    var button = makeElement(doc, "button", "quickref-option quickref-option--all");
    button.type = "button";
    button.textContent = label || "全选";
    return button;
  }

  function makeInvertButton(doc) {
    var button = makeElement(doc, "button", "quickref-option quickref-option--invert");
    button.type = "button";
    button.textContent = "反选";
    return button;
  }

  function invertInputs(inputs) {
    inputs.forEach(function (input) { input.checked = !input.checked; });
  }

  function makeCheckGroup(doc, kind, definition, onChange) {
    var inputs = toArray(doc.getElementsByName(definition.name));
    if (!inputs.length) return null;
    inputs.forEach(clearLegacyControlEvents);
    var group = makeFilterGroup(doc, definition.label);
    var allButton = makeAllButton(doc);
    var invertButton = makeInvertButton(doc);
    normalizeControlIds(inputs, "quickref-" + kind + "-" + definition.name);
    group.controls.appendChild(allButton);
    group.controls.appendChild(invertButton);

    var state = {
      element: group.element,
      reset: function () { inputs.forEach(function (input) { input.checked = true; }); },
      active: function () { return !inputs.every(function (input) { return input.checked; }); },
      update: function () { setButtonState(allButton, !state.active()); }
    };
    inputs.forEach(function (input) {
      var oldLabel = inputLabel(input);
      var text = inputLabelText(input);
      var label = makeElement(doc, "label", "quickref-check");
      var caption = makeElement(doc, "span", "quickref-option");
      caption.textContent = text;
      label.appendChild(input);
      label.appendChild(caption);
      group.controls.appendChild(label);
      if (oldLabel) oldLabel.remove();
      input.addEventListener("change", function () {
        state.update();
        onChange();
      });
    });
    allButton.addEventListener("click", function () {
      state.reset();
      state.update();
      onChange();
    });
    invertButton.addEventListener("click", function () {
      invertInputs(inputs);
      state.update();
      onChange();
    });
    state.update();
    return state;
  }

  function makeChoiceGroup(doc, kind, definition, onChange) {
    var inputs = toArray(doc.getElementsByName(definition.name));
    if (!inputs.length) return null;
    inputs.forEach(clearLegacyControlEvents);
    var group = makeFilterGroup(doc, definition.label);
    var hidden = makeElement(doc, "div", "quickref-native-controls");
    var allButton = makeAllButton(doc, definition.anyLabel);
    var invertButton = makeInvertButton(doc);
    var buttons = [];
    normalizeControlIds(inputs, "quickref-" + kind + "-" + definition.name);
    group.controls.classList.add("quickref-filter-options--segmented");
    group.controls.appendChild(allButton);
    group.controls.appendChild(invertButton);

    var state = {
      element: group.element,
      reset: function () { inputs.forEach(function (input) { input.checked = true; }); },
      active: function () { return !inputs.every(function (input) { return input.checked; }); },
      update: function () {
        setButtonState(allButton, !state.active());
        buttons.forEach(function (entry) {
          setButtonState(entry.button, state.active() && entry.input.checked);
        });
      }
    };
    inputs.forEach(function (input) {
      var oldLabel = inputLabel(input);
      var button = makeElement(doc, "button", "quickref-option");
      button.type = "button";
      button.textContent = definition.optionLabels && definition.optionLabels[input.value] || inputLabelText(input);
      button.addEventListener("click", function () {
        inputs.forEach(function (candidate) { candidate.checked = candidate === input; });
        state.update();
        onChange();
      });
      buttons.push({ button: button, input: input });
      hidden.appendChild(input);
      group.controls.appendChild(button);
      if (oldLabel) oldLabel.remove();
    });
    group.element.appendChild(hidden);
    allButton.addEventListener("click", function () {
      state.reset();
      state.update();
      onChange();
    });
    invertButton.addEventListener("click", function () {
      invertInputs(inputs);
      state.update();
      onChange();
    });
    state.update();
    return state;
  }

  function makeSpecialGroup(doc, kind, definitions, onChange) {
    var inputs = toArray(doc.getElementsByName("special"));
    if (!inputs.length) return null;
    inputs.forEach(clearLegacyControlEvents);
    var group = makeFilterGroup(doc, "特性");
    var hidden = makeElement(doc, "div", "quickref-native-controls");
    var rows = [];
    normalizeControlIds(inputs, "quickref-" + kind + "-special");
    group.controls.classList.add("quickref-special-options");

    inputs.forEach(function (input) {
      var oldLabel = inputLabel(input);
      hidden.appendChild(input);
      if (oldLabel) oldLabel.remove();
    });

    var state = {
      element: group.element,
      reset: function () { inputs.forEach(function (input) { input.checked = false; }); },
      active: function () { return inputs.some(function (input) { return input.checked; }); },
      update: function () {
        rows.forEach(function (entry) {
          var value = entry.positive.checked ? "positive" : (entry.negative.checked ? "negative" : "any");
          setButtonState(entry.button, value === entry.value);
        });
      }
    };
    definitions.forEach(function (definition) {
      var positive = inputs.find(function (input) { return input.value === definition.positive; });
      var negative = inputs.find(function (input) { return input.value === definition.negative; });
      if (!positive || !negative) return;
      var row = makeElement(doc, "div", "quickref-special-row");
      var label = makeElement(doc, "span", "quickref-special-label");
      var buttons = makeElement(doc, "div", "quickref-segmented");
      label.textContent = definition.label;
      row.appendChild(label);
      row.appendChild(buttons);
      [
        { value: "any", label: "任意" },
        { value: "positive", label: "需要" },
        { value: "negative", label: "无需" }
      ].forEach(function (option) {
        var button = makeElement(doc, "button", "quickref-option");
        button.type = "button";
        button.textContent = option.label;
        button.addEventListener("click", function () {
          positive.checked = option.value === "positive";
          negative.checked = option.value === "negative";
          state.update();
          onChange();
        });
        buttons.appendChild(button);
        rows.push({ button: button, positive: positive, negative: negative, value: option.value });
      });
      group.controls.appendChild(row);
    });
    group.element.appendChild(hidden);
    state.update();
    return state;
  }

  function makeRangeGroup(doc, definition, onChange) {
    var min = doc.getElementById(definition.minId);
    var max = doc.getElementById(definition.maxId);
    if (!min || !max) return null;
    var group = makeFilterGroup(doc, definition.label);
    var state = {
      element: group.element,
      reset: function () {
        min.selectedIndex = 0;
        max.selectedIndex = Math.max(0, max.options.length - 1);
      },
      active: function () {
        return min.selectedIndex !== 0 || max.selectedIndex !== Math.max(0, max.options.length - 1);
      },
      update: function () {}
    };

    function addSelect(select, labelText) {
      clearLegacyControlEvents(select);
      var label = makeElement(doc, "label", "quickref-range-control");
      var caption = makeElement(doc, "span");
      caption.textContent = labelText;
      label.appendChild(caption);
      label.appendChild(select);
      group.controls.appendChild(label);
      select.addEventListener("change", function () {
        if (min.selectedIndex > max.selectedIndex) {
          if (select === min) max.selectedIndex = min.selectedIndex;
          else min.selectedIndex = max.selectedIndex;
        }
        state.update();
        onChange();
      });
    }

    group.controls.classList.add("quickref-range-options");
    addSelect(min, "最低");
    addSelect(max, "最高");
    return state;
  }

  function addMetaItem(doc, line, text, className) {
    if (!cleanText(text)) return;
    var item = makeElement(doc, "span", className || "quickref-meta-item");
    item.textContent = cleanText(text);
    line.appendChild(item);
  }

  function makeMetaLine(doc, values, source) {
    var line = makeElement(doc, "div", "quickref-meta-line");
    values.forEach(function (value) { addMetaItem(doc, line, value); });
    addMetaItem(doc, line, source, "quickref-meta-source");
    return line;
  }

  function cellText(cells, index) {
    return nodeText(cells[index]);
  }

  function makeMobileSummary(doc, kind, cells) {
    var summary = makeElement(doc, "td", "quickref-mobile-summary");
    var firstLine;
    var secondLine;
    if (kind === "spell") {
      var components = [cellText(cells, 5), cellText(cells, 6), cellText(cells, 7)].filter(function (value) {
        return value && value !== "×";
      }).join(" / ");
      var ritual = cellText(cells, 8);
      var concentration = cellText(cells, 9);
      var features = [ritual && ritual !== "×" ? "仪式" : "", concentration && concentration !== "×" ? "专注" : ""].filter(Boolean).join(" · ") || "常规";
      firstLine = makeMetaLine(doc, [cellText(cells, 1), cellText(cells, 2), cellText(cells, 4)], cellText(cells, 10));
      secondLine = makeMetaLine(doc, [cellText(cells, 3), components, features], "");
    } else if (kind === "item") {
      var attunement = { "是": "需要同调", "否": "无需同调", "特殊": "特殊同调" }[cellText(cells, 4)] || cellText(cells, 4);
      firstLine = makeMetaLine(doc, [cellText(cells, 1), cellText(cells, 2), attunement], cellText(cells, 6));
      secondLine = makeMetaLine(doc, [cellText(cells, 3), cellText(cells, 5)], "");
    } else {
      firstLine = makeMetaLine(doc, ["CR " + cellText(cells, 4), cellText(cells, 1), cellText(cells, 2)], cellText(cells, 5));
      secondLine = makeMetaLine(doc, [cellText(cells, 3) === "有" ? "传奇动作" : ""], "");
    }
    summary.appendChild(firstLine);
    if (secondLine.children.length) summary.appendChild(secondLine);
    return summary;
  }

  function quickReferenceKind(doc) {
    if (doc.querySelector("tr[spell][tags]")) return "spell";
    if (doc.querySelector("tr[item][tags]")) return "item";
    if (doc.querySelector("tr[monster][tags]")) return "monster";
    return "";
  }

  function shellTopicUrl(doc, link) {
    try {
      var target = new URL(link.href, doc.location.href);
      var marker = "/topics/";
      var markerIndex = target.pathname.indexOf(marker);
      if (markerIndex < 0) return "";
      var shell = window.parent !== window ? new URL(window.parent.location.href) : new URL(target.href.slice(0, markerIndex + 1) + "index.htm");
      var topicPath = decodeURIComponent(target.pathname.slice(markerIndex + marker.length)) + target.hash;
      shell.hash = "";
      shell.search = "";
      shell.searchParams.set("page", topicPath);
      return shell.href;
    } catch (error) {
      return "";
    }
  }

  function setupQuickReferencePreview(doc, table) {
    var view = doc.defaultView;
    if (!view || !view.matchMedia || !view.matchMedia("(hover: hover) and (pointer: fine)").matches || !view.fetch) return;

    var preview = makeElement(doc, "aside", "quickref-preview");
    var title = makeElement(doc, "strong", "quickref-preview-title");
    var content = makeElement(doc, "div", "quickref-preview-content");
    var documentCache = Object.create(null);
    var previewCache = Object.create(null);
    var entryAnchors = Object.create(null);
    var timer = 0;
    var hideTimer = 0;
    var requestId = 0;
    var activeLink = null;
    preview.hidden = true;
    preview.setAttribute("role", "tooltip");
    preview.appendChild(title);
    preview.appendChild(content);
    doc.body.appendChild(preview);

    function entryKey(value) {
      try {
        var url = new URL(value, doc.location.href);
        var fragment = "";
        try { fragment = decodeURIComponent(url.hash.slice(1)); } catch (error) { fragment = url.hash.slice(1); }
        return url.origin + url.pathname + url.search + "#" + fragment;
      } catch (error) {
        return "";
      }
    }

    toArray(table.querySelectorAll("a[data-quickref-preview-url]")).forEach(function (link) {
      entryAnchors[entryKey(link.getAttribute("data-quickref-preview-url"))] = true;
    });

    function positionPreview() {
      if (preview.hidden || !activeLink) return;
      var margin = 12;
      var offset = 12;
      var anchorRect = activeLink.getBoundingClientRect();
      var desiredWidth = Math.min(672, view.innerWidth - margin * 2);
      var rightSpace = view.innerWidth - anchorRect.right - offset - margin;
      var leftSpace = anchorRect.left - offset - margin;
      var width;
      var left;
      preview.style.width = "";
      if (rightSpace >= 360) {
        width = Math.min(desiredWidth, rightSpace);
        left = anchorRect.right + offset;
      } else if (leftSpace >= 360) {
        width = Math.min(desiredWidth, leftSpace);
        left = anchorRect.left - offset - width;
      } else {
        width = desiredWidth;
        left = Math.max(margin, view.innerWidth - width - margin);
      }
      preview.style.width = width + "px";
      var rect = preview.getBoundingClientRect();
      var top = Math.max(margin, Math.min(anchorRect.top - 8, view.innerHeight - rect.height - margin));
      preview.style.left = Math.max(margin, left) + "px";
      preview.style.top = top + "px";
    }

    function sectionPreview(html, sourceUrl, fallbackTitle) {
      var parsed = new view.DOMParser().parseFromString(html, "text/html");
      var source = new URL(sourceUrl, doc.location.href);
      var anchorName = "";
      try { anchorName = decodeURIComponent(source.hash.slice(1)); } catch (error) { anchorName = source.hash.slice(1); }
      var target = anchorName && (parsed.getElementById(anchorName) || parsed.getElementsByName(anchorName)[0]);
      if (!target) return { title: fallbackTitle, content: "未找到可预览内容" };

      var heading = target.closest ? target.closest("h1, h2, h3, h4, h5, h6") : null;
      if (!heading && target.nextElementSibling && /^H[1-6]$/.test(target.nextElementSibling.tagName)) heading = target.nextElementSibling;
      var start = heading || (target.parentElement === parsed.body ? target.nextElementSibling : target.parentElement) || target;
      var container = parsed.createElement("div");
      var cursor = start.nextElementSibling;
      var sourceKey = entryKey(source.href);
      var nodeCount = 0;

      function startsNextEntry(element) {
        var anchors = [];
        if (element.matches("[id], a[name]")) anchors.push(element);
        anchors = anchors.concat(toArray(element.querySelectorAll("[id], a[name]")));
        return anchors.some(function (anchor) {
          var name = anchor.getAttribute("id") || anchor.getAttribute("name");
          if (!name) return false;
          var candidate = new URL(source.href);
          candidate.hash = name;
          var candidateKey = entryKey(candidate.href);
          return candidateKey !== sourceKey && entryAnchors[candidateKey];
        });
      }

      while (cursor && nodeCount < 400) {
        if (startsNextEntry(cursor)) break;
        var text = nodeText(cursor);
        if (text) {
          var clone = cursor.cloneNode(true);
          toArray(clone.querySelectorAll("script, style, iframe, object, embed, form, input, button")).forEach(function (element) {
            element.remove();
          });
          [clone].concat(toArray(clone.querySelectorAll("*"))).forEach(function (element) {
            toArray(element.attributes).forEach(function (attribute) {
              if (attribute.name === "id" || attribute.name === "name" || /^on/i.test(attribute.name)) element.removeAttribute(attribute.name);
            });
            ["src", "href"].forEach(function (attributeName) {
              var value = element.getAttribute(attributeName);
              if (!value || /^data:/i.test(value)) return;
              if (/^javascript:/i.test(value)) {
                element.removeAttribute(attributeName);
                return;
              }
              try { element.setAttribute(attributeName, new URL(value, source.href).href); } catch (error) {}
            });
          });
          var previewTables = [];
          if (clone.tagName && clone.tagName.toLowerCase() === "table") previewTables.push(clone);
          previewTables = previewTables.concat(toArray(clone.querySelectorAll("table")));
          previewTables.forEach(function (table) { markLegacyTableColors(parsed, table); });
          container.appendChild(clone);
        }
        nodeCount += 1;
        cursor = cursor.nextElementSibling;
      }
      return {
        title: nodeText(heading || start) || fallbackTitle,
        html: container.innerHTML,
        content: container.innerHTML ? "" : "未找到可预览内容"
      };
    }

    function loadPreview(link) {
      var sourceUrl = link.getAttribute("data-quickref-preview-url");
      if (previewCache[sourceUrl]) return previewCache[sourceUrl];
      var documentUrl = sourceUrl.split("#")[0];
      if (!documentCache[documentUrl]) {
        documentCache[documentUrl] = view.fetch(documentUrl, { credentials: "same-origin" }).then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.text();
        });
      }
      previewCache[sourceUrl] = documentCache[documentUrl].then(function (html) {
        return sectionPreview(html, sourceUrl, nodeText(link));
      });
      return previewCache[sourceUrl];
    }

    function showPreview(link) {
      var currentRequest = ++requestId;
      view.clearTimeout(hideTimer);
      activeLink = link;
      title.textContent = nodeText(link);
      content.textContent = "加载中…";
      preview.hidden = false;
      positionPreview();
      loadPreview(link).then(function (result) {
        if (currentRequest !== requestId || activeLink !== link) return;
        title.textContent = result.title;
        if (result.html) content.innerHTML = result.html;
        else content.textContent = result.content;
        positionPreview();
      }).catch(function () {
        if (currentRequest !== requestId || activeLink !== link) return;
        content.textContent = "预览不可用";
        positionPreview();
      });
    }

    function hidePreview() {
      view.clearTimeout(timer);
      view.clearTimeout(hideTimer);
      requestId += 1;
      activeLink = null;
      preview.hidden = true;
    }

    function scheduleHide() {
      view.clearTimeout(hideTimer);
      hideTimer = view.setTimeout(hidePreview, 180);
    }

    table.addEventListener("pointerover", function (event) {
      var link = event.target.closest ? event.target.closest("a[data-quickref-preview-url]") : null;
      if (!link || !table.contains(link) || link === activeLink) return;
      view.clearTimeout(timer);
      view.clearTimeout(hideTimer);
      timer = view.setTimeout(function () { showPreview(link); }, 220);
    });
    table.addEventListener("pointerout", function (event) {
      var link = event.target.closest ? event.target.closest("a[data-quickref-preview-url]") : null;
      if (link && !link.contains(event.relatedTarget) && !preview.contains(event.relatedTarget)) scheduleHide();
    });
    preview.addEventListener("pointerenter", function () {
      view.clearTimeout(timer);
      view.clearTimeout(hideTimer);
    });
    preview.addEventListener("pointerleave", function (event) {
      if (!activeLink || !activeLink.contains(event.relatedTarget)) scheduleHide();
    });
  }

  function levelRank(value) {
    var rank = ["戏法", "零环", "一环", "二环", "三环", "四环", "五环", "六环", "七环", "八环", "九环"].indexOf(cleanText(value));
    return rank < 0 ? 999 : rank;
  }

  function rarityRank(value) {
    var rank = ["普通", "非普通", "珍稀", "极珍稀", "传说", "神器", "多种稀有度", "其他", "其它"].indexOf(cleanText(value));
    return rank < 0 ? 999 : rank;
  }

  function crRank(value) {
    var fractions = { "0": 0, "1/8": 0.125, "1/4": 0.25, "1/2": 0.5 };
    var text = cleanText(value);
    return Object.prototype.hasOwnProperty.call(fractions, text) ? fractions[text] : (parseFloat(text) || 0);
  }

  function quickReferenceSortValue(kind, sort, row) {
    var cells = directCells(row);
    if (sort === "name") return cleanText(row.getAttribute(QUICK_REFERENCE_CONFIG[kind].rowAttribute));
    if (sort === "level") return levelRank(cellText(cells, 1));
    if (sort === "rarity") return rarityRank(cellText(cells, 1));
    if (sort === "cr") return crRank(cellText(cells, 4));
    return parseInt(row.getAttribute("data-quickref-order"), 10) || 0;
  }

  function enhanceQuickReference(doc) {
    var kind = quickReferenceKind(doc);
    if (!kind) return;
    var config = QUICK_REFERENCE_CONFIG[kind];
    var firstRow = doc.querySelector("tr[" + config.rowAttribute + "][tags]");
    var table = firstRow && firstRow.closest ? firstRow.closest("table") : null;
    var filter = doc.getElementById("filterDiv");
    var searchInput = doc.getElementById("input");
    if (!table || !filter || !searchInput || table.getAttribute("data-quickref-enhanced") === "true") return;

    var header = table.querySelector("tr:not([tags])");
    var headerCells = directCells(header);
    var rows = toArray(table.querySelectorAll("tr[" + config.rowAttribute + "][tags]"));
    var body = rows.length ? rows[0].parentNode : null;
    var states = [];
    var filterTimer = 0;
    var appliedSort = "source";
    var currentPage = 0;
    var filteredRows = rows.slice();
    var records = [];

    doc.documentElement.classList.add("quickref-document", "quickref-document--" + kind);
    doc.body.classList.add("quickref-page");
    table.classList.add("quickref-table", "quickref-table--" + kind);
    table.setAttribute("data-quickref-enhanced", "true");
    if (header) header.classList.add("quickref-header");

    rows.forEach(function (row, index) {
      var cells = directCells(row);
      row.classList.add("quickref-record");
      row.setAttribute("data-quickref-order", String(index));
      cells.forEach(function (cell, cellIndex) {
        cell.setAttribute("data-label", cellText(headerCells, cellIndex));
      });
      if (cells[0]) {
        cells[0].classList.add("quickref-primary");
        toArray(cells[0].querySelectorAll("a[href]")).forEach(function (link) {
          link.setAttribute("data-quickref-preview-url", link.href);
          link.href = shellTopicUrl(doc, link) || link.href;
          link.target = "_blank";
          link.rel = "noopener";
        });
      }
      row.appendChild(makeMobileSummary(doc, kind, cells));
      records.push({
        row: row,
        name: cleanText(row.getAttribute(config.rowAttribute)).toLowerCase(),
        tags: String(row.getAttribute("tags") || ""),
        range: kind === "monster" ? crRank(cellText(cells, 4)) : 0
      });
    });
    setupQuickReferencePreview(doc, table);

    var searchHost = searchInput.parentElement;
    var toolbar = makeElement(doc, "div", "quickref-toolbar");
    var searchRow = makeElement(doc, "div", "quickref-search-row");
    var resultRow = makeElement(doc, "div", "quickref-result-row");
    var toggle = makeElement(doc, "button", "quickref-button quickref-filter-toggle");
    var toggleLabel = makeElement(doc, "span");
    var toggleCount = makeElement(doc, "span", "quickref-active-count");
    var resultCount = makeElement(doc, "span", "quickref-result-count");
    var sortLabel = makeElement(doc, "label", "quickref-sort");
    var sortCaption = makeElement(doc, "span");
    var sortSelect = makeElement(doc, "select");
    var pagination = makeElement(doc, "div", "quickref-pagination");
    var previousPage = makeElement(doc, "button", "quickref-button");
    var pageStatus = makeElement(doc, "span", "quickref-page-status");
    var nextPage = makeElement(doc, "button", "quickref-button");
    clearLegacyControlEvents(searchInput);
    searchInput.type = "search";
    searchInput.setAttribute("aria-label", kind === "spell" ? "搜索法术" : (kind === "item" ? "搜索物品" : "搜索怪物"));
    searchInput.autocomplete = "off";
    toggle.type = "button";
    toggleLabel.textContent = "筛选";
    toggle.appendChild(toggleLabel);
    toggle.appendChild(toggleCount);
    resultCount.setAttribute("aria-live", "polite");
    sortCaption.textContent = "排序";
    sortLabel.appendChild(sortCaption);
    sortLabel.appendChild(sortSelect);
    previousPage.type = "button";
    previousPage.textContent = "上一页";
    nextPage.type = "button";
    nextPage.textContent = "下一页";
    pagination.setAttribute("role", "navigation");
    pagination.setAttribute("aria-label", "速查结果分页");
    pagination.appendChild(previousPage);
    pagination.appendChild(pageStatus);
    pagination.appendChild(nextPage);
    config.sorts.forEach(function (sort) {
      var option = doc.createElement("option");
      option.value = sort.value;
      option.textContent = sort.label;
      sortSelect.appendChild(option);
    });
    searchRow.appendChild(searchInput);
    searchRow.appendChild(toggle);
    resultRow.appendChild(resultCount);
    resultRow.appendChild(sortLabel);
    resultRow.appendChild(pagination);
    toolbar.appendChild(searchRow);
    toolbar.appendChild(resultRow);
    searchHost.parentNode.insertBefore(toolbar, searchHost);
    searchHost.remove();

    var filterHeading = makeElement(doc, "div", "quickref-filter-heading");
    var filterTitle = makeElement(doc, "strong");
    var reset = makeElement(doc, "button", "quickref-button quickref-reset");
    var filterGrid = makeElement(doc, "div", "quickref-filter-grid");
    filterTitle.textContent = "筛选条件";
    reset.type = "button";
    reset.textContent = "重置";
    filterHeading.appendChild(filterTitle);
    filterHeading.appendChild(reset);

    function selectedValues(name) {
      return toArray(doc.getElementsByName(name)).filter(function (input) {
        return input.checked;
      }).map(function (input) {
        return String(input.value || "");
      });
    }

    function matchesAny(tags, values) {
      return values.some(function (value) { return tags.indexOf(value) !== -1; });
    }

    function selectedRange(select, fallback) {
      if (!select || select.selectedIndex < 0) return fallback;
      return crRank(cleanText(select.options[select.selectedIndex].text));
    }

    function readCriteria() {
      var criteria = {
        groups: config.groups.map(function (definition) {
          return selectedValues(definition.name);
        }),
        choice: config.choice ? selectedValues(config.choice.name) : null,
        special: config.special ? selectedValues("special") : null,
        minimum: -Infinity,
        maximum: Infinity
      };
      if (config.range) {
        criteria.minimum = selectedRange(doc.getElementById(config.range.minId), -Infinity);
        criteria.maximum = selectedRange(doc.getElementById(config.range.maxId), Infinity);
      }
      return criteria;
    }

    function recordMatches(record, keyword, criteria) {
      if (keyword && record.name.indexOf(keyword) === -1) return false;
      if (!criteria.groups.every(function (values) {
        return matchesAny(record.tags, values);
      })) return false;
      if (criteria.choice && !matchesAny(record.tags, criteria.choice)) return false;
      if (criteria.special && !criteria.special.every(function (value) {
        return record.tags.indexOf(value) !== -1;
      })) return false;
      if (record.range < criteria.minimum || record.range > criteria.maximum) return false;
      return true;
    }

    function renderPage() {
      if (!body) return;
      var pageCount = Math.max(1, Math.ceil(filteredRows.length / QUICK_REFERENCE_PAGE_SIZE));
      var start;
      var fragment = doc.createDocumentFragment();
      currentPage = Math.max(0, Math.min(currentPage, pageCount - 1));
      start = currentPage * QUICK_REFERENCE_PAGE_SIZE;
      rows.forEach(function (row) {
        if (row.parentNode === body) body.removeChild(row);
      });
      filteredRows.slice(start, start + QUICK_REFERENCE_PAGE_SIZE).forEach(function (row) {
        row.style.display = "";
        fragment.appendChild(row);
      });
      body.appendChild(fragment);
      resultCount.textContent = "找到 " + filteredRows.length + " / " + rows.length + " 条";
      pageStatus.textContent = (currentPage + 1) + " / " + pageCount;
      previousPage.disabled = currentPage === 0;
      nextPage.disabled = currentPage >= pageCount - 1;
      pagination.hidden = pageCount <= 1;
    }

    function renderAllForPrint() {
      if (!body || filteredRows.length <= QUICK_REFERENCE_PAGE_SIZE) return;
      var fragment = doc.createDocumentFragment();
      rows.forEach(function (row) {
        if (row.parentNode === body) body.removeChild(row);
      });
      filteredRows.forEach(function (row) {
        row.style.display = "";
        fragment.appendChild(row);
      });
      body.appendChild(fragment);
    }

    function runSearch() {
      var keyword = cleanText(searchInput.value).toLowerCase();
      var criteria = readCriteria();
      filterTimer = 0;
      currentPage = 0;
      filteredRows = records.filter(function (record) {
        return recordMatches(record, keyword, criteria);
      }).map(function (record) {
        return record.row;
      });
      renderPage();
      updateStatus();
    }

    function filtersChanged() {
      window.clearTimeout(filterTimer);
      filterTimer = window.setTimeout(runSearch, 20);
    }

    if (config.range) {
      var rangeState = makeRangeGroup(doc, config.range, filtersChanged);
      if (rangeState) states.push(rangeState);
    }
    config.groups.forEach(function (definition) {
      var state = makeCheckGroup(doc, kind, definition, filtersChanged);
      if (state) states.push(state);
    });
    if (config.choice) {
      var choiceState = makeChoiceGroup(doc, kind, config.choice, filtersChanged);
      if (choiceState) states.push(choiceState);
    }
    if (config.special) {
      var specialState = makeSpecialGroup(doc, kind, config.special, filtersChanged);
      if (specialState) states.push(specialState);
    }

    while (filter.firstChild) filter.removeChild(filter.firstChild);
    filter.removeAttribute("style");
    filter.className = "quickref-filters";
    filter.hidden = true;
    filterHeading.id = "quickref-filter-heading";
    filter.setAttribute("aria-labelledby", filterHeading.id);
    filter.appendChild(filterHeading);
    states.forEach(function (state) { filterGrid.appendChild(state.element); });
    filter.appendChild(filterGrid);
    var separator = filter.nextElementSibling;
    if (separator && separator.tagName && separator.tagName.toLowerCase() === "hr") separator.classList.add("quickref-separator");

    function sortRows() {
      var sort = sortSelect.value;
      if (sort === appliedSort) return;
      records.sort(function (leftRecord, rightRecord) {
        var left = leftRecord.row;
        var right = rightRecord.row;
        var leftValue = quickReferenceSortValue(kind, sort, left);
        var rightValue = quickReferenceSortValue(kind, sort, right);
        var result = typeof leftValue === "string" ? leftValue.localeCompare(rightValue, "zh-CN") : leftValue - rightValue;
        return result || (parseInt(left.getAttribute("data-quickref-order"), 10) - parseInt(right.getAttribute("data-quickref-order"), 10));
      });
      rows = records.map(function (record) { return record.row; });
      appliedSort = sort;
      runSearch();
    }

    function updateStatus() {
      var active = states.filter(function (state) { return state.active(); }).length;
      toggleCount.textContent = active ? String(active) : "";
      toggleCount.hidden = !active;
    }

    toggle.addEventListener("click", function () {
      filter.hidden = !filter.hidden;
      toggle.setAttribute("aria-expanded", String(!filter.hidden));
    });
    toggle.setAttribute("aria-controls", filter.id);
    toggle.setAttribute("aria-expanded", "false");
    reset.addEventListener("click", function () {
      searchInput.value = "";
      states.forEach(function (state) { state.reset(); state.update(); });
      sortSelect.value = "source";
      if (appliedSort === "source") runSearch();
      else sortRows();
    });
    sortSelect.addEventListener("change", sortRows);
    previousPage.addEventListener("click", function () {
      if (currentPage <= 0) return;
      currentPage -= 1;
      renderPage();
    });
    nextPage.addEventListener("click", function () {
      if ((currentPage + 1) * QUICK_REFERENCE_PAGE_SIZE >= filteredRows.length) return;
      currentPage += 1;
      renderPage();
    });
    if (doc.defaultView) {
      doc.defaultView.addEventListener("beforeprint", renderAllForPrint);
      doc.defaultView.addEventListener("afterprint", renderPage);
    }
    searchInput.addEventListener("input", function () {
      window.clearTimeout(filterTimer);
      filterTimer = window.setTimeout(runSearch, 60);
    });
    searchInput.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      window.clearTimeout(filterTimer);
      runSearch();
    });

    window.search = runSearch;
    states.forEach(function (state) { state.update(); });
    runSearch();
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

  function waitForImages(root) {
    return Promise.all(toArray(root.querySelectorAll("img")).map(function (image) {
      if (image.complete && image.naturalWidth) return Promise.resolve();
      return new Promise(function (resolve, reject) {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", function () { reject(new Error("图片加载失败")); }, { once: true });
      });
    }));
  }

  function imageToDataUrl(image) {
    var source = image.currentSrc || image.src || "";
    if (/^data:/i.test(source)) return Promise.resolve(source);
    return new Promise(function (resolve, reject) {
      try {
        var canvas = image.ownerDocument.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext("2d").drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        if (!window.fetch) {
          reject(error);
          return;
        }
        window.fetch(source, { credentials: "same-origin" }).then(function (response) {
          if (!response.ok) throw new Error("图片读取失败");
          return response.blob();
        }).then(function (blob) {
          return new Promise(function (finish, fail) {
            var reader = new FileReader();
            reader.addEventListener("load", function () { finish(reader.result); }, { once: true });
            reader.addEventListener("error", fail, { once: true });
            reader.readAsDataURL(blob);
          });
        }).then(resolve, reject);
      }
    });
  }

  function inlineImages(root) {
    return Promise.all(toArray(root.querySelectorAll("img")).map(function (image) {
      return imageToDataUrl(image).then(function (dataUrl) {
        image.removeAttribute("srcset");
        image.src = dataUrl;
      });
    }));
  }

  function canvasToPng(canvas) {
    return new Promise(function (resolve, reject) {
      if (!canvas.toBlob) {
        try {
          var data = window.atob(canvas.toDataURL("image/png").split(",")[1]);
          var bytes = new Uint8Array(data.length);
          for (var index = 0; index < data.length; index += 1) bytes[index] = data.charCodeAt(index);
          resolve(new Blob([bytes], { type: "image/png" }));
        } catch (error) {
          reject(error);
        }
        return;
      }
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error("PNG 生成失败"));
      }, "image/png");
    });
  }

  function numberValue(value) {
    var number = parseFloat(value);
    return isFinite(number) ? number : 0;
  }

  function visibleColor(value) {
    return value && value !== "transparent" && value !== "rgba(0, 0, 0, 0)";
  }

  function drawElementBox(context, element, rootRect, style) {
    var rects = toArray(element.getClientRects());
    rects.forEach(function (rect) {
      var x = rect.left - rootRect.left;
      var y = rect.top - rootRect.top;
      if (visibleColor(style.backgroundColor)) {
        context.fillStyle = style.backgroundColor;
        context.fillRect(x, y, rect.width, rect.height);
      }
      [
        ["Top", x, y, rect.width, numberValue(style.borderTopWidth)],
        ["Right", x + rect.width - numberValue(style.borderRightWidth), y, numberValue(style.borderRightWidth), rect.height],
        ["Bottom", x, y + rect.height - numberValue(style.borderBottomWidth), rect.width, numberValue(style.borderBottomWidth)],
        ["Left", x, y, numberValue(style.borderLeftWidth), rect.height]
      ].forEach(function (border) {
        var color = style["border" + border[0] + "Color"];
        if (!visibleColor(color) || border[3] <= 0 || border[4] <= 0) return;
        context.fillStyle = color;
        context.fillRect(border[1], border[2], border[3], border[4]);
      });
    });
  }

  function textFont(style) {
    return [
      style.fontStyle || "normal",
      style.fontVariant || "normal",
      style.fontWeight || "400",
      style.fontSize || "16px",
      style.fontFamily || "sans-serif"
    ].join(" ");
  }

  function drawTextNode(context, node, rootRect) {
    var text = node.nodeValue || "";
    if (!text || !node.parentElement) return;
    var style = window.getComputedStyle(node.parentElement);
    if (style.display === "none" || style.visibility === "hidden" || !visibleColor(style.color)) return;
    var range = node.ownerDocument.createRange();
    var runs = [];
    var current = null;
    var previousRight = 0;
    for (var index = 0; index < text.length; index += 1) {
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      var rect = range.getClientRects()[0];
      if (!rect || (!rect.width && !rect.height)) continue;
      var character = /\s/.test(text.charAt(index)) ? " " : text.charAt(index);
      if (character === " " && current && /\s$/.test(current.text)) continue;
      var sameLine = current && Math.abs(current.top - rect.top) < 1 && Math.abs(previousRight - rect.left) < 2;
      if (!sameLine) {
        current = { text: "", left: rect.left, top: rect.top, bottom: rect.bottom };
        runs.push(current);
      }
      current.text += character;
      current.bottom = Math.max(current.bottom, rect.bottom);
      previousRight = rect.right;
    }
    range.detach();
    context.fillStyle = style.color;
    context.font = textFont(style);
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    if ("letterSpacing" in context) context.letterSpacing = style.letterSpacing;
    var fontSize = numberValue(style.fontSize) || 16;
    runs.forEach(function (run) {
      if (!run.text.trim()) return;
      var x = run.left - rootRect.left;
      var baseline = run.bottom - rootRect.top - Math.max(0, (run.bottom - run.top - fontSize) / 2) - fontSize * 0.18;
      context.fillText(run.text, x, baseline);
    });
  }

  function drawNode(context, node, rootRect) {
    if (node.nodeType === 3) {
      drawTextNode(context, node, rootRect);
      return;
    }
    if (node.nodeType !== 1) return;
    var style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || numberValue(style.opacity) === 0) return;
    drawElementBox(context, node, rootRect, style);
    if (node.tagName.toLowerCase() === "img") {
      var imageRect = node.getBoundingClientRect();
      context.drawImage(node, imageRect.left - rootRect.left, imageRect.top - rootRect.top, imageRect.width, imageRect.height);
      return;
    }
    toArray(node.childNodes).forEach(function (child) {
      drawNode(context, child, rootRect);
    });
  }

  function rasterizeElement(element) {
    var width = Math.ceil(element.getBoundingClientRect().width);
    var height = Math.ceil(element.getBoundingClientRect().height);
    var requestedScale = Math.min(window.devicePixelRatio || 1, 2);
    var scale = Math.min(
      requestedScale,
      EXPORT_MAX_DIMENSION / Math.max(width, height),
      Math.sqrt(EXPORT_MAX_AREA / Math.max(1, width * height))
    );
    var outputWidth = Math.max(1, Math.floor(width * scale));
    var outputHeight = Math.max(1, Math.floor(height * scale));
    var canvas = element.ownerDocument.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    var context = canvas.getContext("2d");
    context.setTransform(scale, 0, 0, scale, 0, 0);
    drawNode(context, element, element.getBoundingClientRect());
    return canvasToPng(canvas);
  }

  function captureStatBlock(doc, responsive) {
    var holder = makeElement(doc, "div", "statblock-export-holder");
    var capture = makeElement(doc, "div", "statblock-export-capture");
    var card = responsive.cloneNode(true);
    capture.style.width = "720px";
    card.hidden = false;
    card.removeAttribute("aria-hidden");
    card.style.display = "block";
    capture.appendChild(card);
    holder.appendChild(capture);
    doc.body.appendChild(holder);
    var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    return fontsReady.then(function () {
      return waitForImages(capture);
    }).then(function () {
      return inlineImages(capture);
    }).then(function () {
      return waitForImages(capture);
    }).then(function () {
      return rasterizeElement(capture);
    }).then(function (blob) {
      holder.parentNode.removeChild(holder);
      return blob;
    }, function (error) {
      if (holder.parentNode) holder.parentNode.removeChild(holder);
      throw error;
    });
  }

  function safeFileName(value) {
    return cleanText(value || "怪物卡").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 80) || "怪物卡";
  }

  function makePopupButton(doc, label, pathData) {
    var button = makeElement(doc, "button", "export-action");
    button.type = "button";
    button.appendChild(makeSvgIcon(doc, pathData));
    button.appendChild(doc.createTextNode(label));
    return button;
  }

  function openExportWindow(title) {
    var popup = window.open("", "_blank");
    if (!popup) return null;
    var doc = popup.document;
    doc.open();
    doc.write('<!doctype html><html lang="zh-Hans"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title></title></head><body></body></html>');
    doc.close();
    doc.title = title + " - 怪物卡图片";
    var style = doc.createElement("style");
    style.textContent = "*{box-sizing:border-box}html{color-scheme:light}body{margin:0;color:#242629;background:#ecebea;font:16px/1.5 system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;letter-spacing:0}.export-bar{position:sticky;z-index:2;top:0;display:flex;align-items:center;gap:8px;min-height:56px;padding:8px max(12px,env(safe-area-inset-right)) 8px max(12px,env(safe-area-inset-left));background:rgba(255,255,255,.96);border-bottom:1px solid #d4d1ce}.export-title{min-width:0;margin-right:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}.export-action{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:8px 12px;color:#fff;background:#751515;border:1px solid #751515;border-radius:4px;font:inherit;font-weight:700;letter-spacing:0;cursor:pointer}.export-action:hover{background:#5f1111}.export-action:focus-visible{outline:3px solid #d6a130;outline-offset:2px}.statblock-button-icon{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.export-main{display:grid;place-items:start center;min-height:calc(100svh - 57px);padding:20px max(12px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}.export-status{place-self:center;margin:12vh 0;color:#555}.export-image{display:block;max-width:100%;height:auto;background:#fff;box-shadow:0 3px 14px rgba(0,0,0,.18)}[hidden]{display:none!important}@media(max-width:560px){.export-bar{flex-wrap:wrap}.export-title{flex:1 0 calc(100% - 8px)}.export-action{flex:1}.export-main{padding-top:12px}}@media(prefers-reduced-motion:no-preference){.export-image{animation:reveal .18s ease-out}@keyframes reveal{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}}";
    doc.head.appendChild(style);
    var bar = makeElement(doc, "header", "export-bar");
    var heading = makeElement(doc, "div", "export-title");
    heading.textContent = title;
    var download = makePopupButton(doc, "保存 PNG", "M12 3v12m0 0 4-4m-4 4-4-4M5 19h14");
    var share = makePopupButton(doc, "分享", "M12 16V4m0 0-4 4m4-4 4 4M5 12v7h14v-7");
    download.hidden = true;
    share.hidden = true;
    bar.appendChild(heading);
    bar.appendChild(download);
    bar.appendChild(share);
    var main = makeElement(doc, "main", "export-main");
    var status = makeElement(doc, "div", "export-status");
    status.setAttribute("role", "status");
    status.textContent = "正在生成图片…";
    main.appendChild(status);
    doc.body.appendChild(bar);
    doc.body.appendChild(main);
    return { window: popup, document: doc, main: main, status: status, download: download, share: share };
  }

  function showExportResult(view, blob, title) {
    var fileName = safeFileName(title) + ".png";
    var imageUrl = URL.createObjectURL(blob);
    var image = makeElement(view.document, "img", "export-image");
    image.alt = title;
    image.src = imageUrl;
    view.status.hidden = true;
    view.main.appendChild(image);
    view.download.hidden = false;
    view.download.addEventListener("click", function () {
      var link = view.document.createElement("a");
      link.href = imageUrl;
      link.download = fileName;
      view.document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    });
    try {
      var file = new view.window.File([blob], fileName, { type: "image/png" });
      var shareData = { files: [file], title: title };
      if (view.window.navigator.share && (!view.window.navigator.canShare || view.window.navigator.canShare(shareData))) {
        view.share.hidden = false;
        view.share.addEventListener("click", function () {
          view.window.navigator.share(shareData).catch(function () {});
        });
      }
    } catch (error) {}
  }

  function addExportButton(doc, toggle, responsive) {
    var button = makeElement(doc, "button", "statblock-view-toggle__button statblock-export-button");
    var label = makeElement(doc, "span", "statblock-export-button__label");
    var title = nodeText(responsive.querySelector(".statblock-responsive__title")) || doc.title || "怪物卡";
    button.type = "button";
    button.title = "生成并保存怪物卡图片";
    button.appendChild(makeSvgIcon(doc, "M4 5h16v14H4zM8 10l2.5 3 2-2 3.5 4M15.5 8.5h.01"));
    label.textContent = "导出图片";
    button.appendChild(label);
    toggle.appendChild(button);
    button.addEventListener("click", function () {
      var view = openExportWindow(title);
      if (!view) {
        label.textContent = "弹窗被拦截";
        window.setTimeout(function () { label.textContent = "导出图片"; }, 2000);
        return;
      }
      button.disabled = true;
      label.textContent = "生成中…";
      captureStatBlock(doc, responsive).then(function (blob) {
        showExportResult(view, blob, title);
      }).catch(function (error) {
        view.status.textContent = error && error.message ? error.message : "图片生成失败";
      }).then(function () {
        button.disabled = false;
        label.textContent = "导出图片";
      });
    });
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
    addExportButton(doc, toggle, responsive);
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

  function hasFixedWidth(table) {
    var value = table.style && table.style.width || table.getAttribute("width") || "";
    return /^\s*\d+(?:\.\d+)?(?:px)?\s*$/i.test(value);
  }

  function isFixedLayoutTable(table) {
    var row;
    if (!hasFixedWidth(table)) return false;
    if (table.querySelector("table")) return true;
    row = firstRow(table);
    return directCells(row).length <= 1;
  }

  function rowSpanValue(cell) {
    return Math.max(1, parseInt(cell && cell.getAttribute("rowspan") || "1", 10) || 1);
  }

  function colSpanValue(cell) {
    return Math.max(1, parseInt(cell && cell.getAttribute("colspan") || "1", 10) || 1);
  }

  function firstCellHasWidth(table) {
    var row = firstRow(table);
    var cells = directCells(row);
    return Boolean(cells[0] && cells[0].getAttribute("width"));
  }

  function headerRows(table) {
    var rows = toArray(table.querySelectorAll("tr"));
    var result = [];
    var ended = false;
    rows.forEach(function (row) {
      var cells = directCells(row);
      var header = !ended && (row.querySelector("th") || cells.some(function (cell) {
        return Boolean(cell.querySelector("strong, b"));
      }));
      if (header) result.push(row);
      else ended = true;
    });
    return result;
  }

  function mobileTableRole(table, kind) {
    var rows = toArray(table.querySelectorAll("tr"));
    var count = columnCount(table);
    var headers = headerRows(table);
    var headerText = headers.map(nodeText).join(" ");
    var hasLevelHeader = /等级|级别|\blevel\b/i.test(headerText);
    var hasProgressionHeader = /特性|熟练加值|熟练|法术位|环阶|准备法术|\bfeature\b|proficiency|spell\s*slot|prepared\s*spell/i.test(headerText);
    var hasTwoCellRows = rows.length > 1 && rows.filter(function (row) {
      return directCells(row).length === 2;
    }).length >= Math.ceil(rows.length * 0.6);
    var hasLabelCell = rows.some(function (row) {
      var cells = directCells(row);
      return cells.length === 2 && (cells[0].querySelector("strong, b") || cells[0].getAttribute("width"));
    });

    if (!table.classList.contains("quickref-table") && !hasSpan(table) && count === 2 &&
        hasTwoCellRows && (hasLabelCell || firstCellHasWidth(table))) {
      return "key-value";
    }
    if (!table.classList.contains("quickref-table") && kind === "wide" &&
        hasProgressionHeader && (count >= 6 || hasSpan(table) || (count >= 5 && hasLevelHeader))) {
      return "progression";
    }
    return kind === "wide" ? "scroll" : "fit";
  }

  function annotateTableColumns(table) {
    var rows = toArray(table.querySelectorAll("tr"));
    var occupied = [];
    var cellsByRow = [];
    var columnRoles = {};
    var headers = headerRows(table);

    headers.forEach(function (row, index) {
      row.classList.add("table-header-row", "table-header-row--" + (index + 1));
    });

    rows.forEach(function (row, index) {
      var cursor = 0;
      var entries = [];
      directCells(row).forEach(function (cell) {
        var colspan = colSpanValue(cell);
        var rowspan = rowSpanValue(cell);
        while (occupied[cursor] && occupied[cursor] > index) cursor += 1;
        entries.push({ cell: cell, start: cursor, span: colspan });
        for (var column = cursor; column < cursor + colspan; column += 1) {
          occupied[column] = Math.max(occupied[column] || 0, index + rowspan);
        }
        cursor += colspan;
      });
      cellsByRow.push(entries);
    });

    headers.forEach(function (row) {
      var entries = cellsByRow[rows.indexOf(row)] || [];
      entries.forEach(function (entry) {
        var text = nodeText(entry.cell);
        var role = /等级|级别|\blevel\b/i.test(text) ? "level" :
          (/熟练加值|熟练|\bPB\b|proficiency/i.test(text) ? "proficiency" :
            (/职业特性|特性|描述|效果|feature|description|effect/i.test(text) ? "feature" : ""));
        if (!role) return;
        for (var column = entry.start; column < entry.start + entry.span; column += 1) {
          columnRoles[column] = role;
        }
      });
    });

    cellsByRow.forEach(function (entries) {
      entries.forEach(function (entry) {
        entry.cell.setAttribute("data-table-column", String(entry.start + 1));
        entry.cell.setAttribute("data-table-column-span", String(entry.span));
        if (columnRoles[entry.start]) entry.cell.setAttribute("data-table-column-role", columnRoles[entry.start]);
      });
    });
    table.style.setProperty("--webhelp-table-columns", String(columnCount(table)));
    return columnRoles;
  }

  function tableMinWidth(columnCountValue) {
    return Math.max(672, (Math.max(1, columnCountValue) * 52) + 140);
  }

  function addTableScrollAffordance(doc, wrapper, table, role) {
    if (!wrapper || role !== "progression" || wrapper.getAttribute("data-scroll-affordance") === "true") return;
    var hint = makeElement(doc, "div", "table-responsive__hint");
    hint.setAttribute("role", "note");
    hint.textContent = "左右滑动查看完整表格";
    wrapper.insertBefore(hint, table);
    wrapper.setAttribute("data-scroll-affordance", "true");

    function refresh() {
      hint.hidden = wrapper.scrollWidth <= wrapper.clientWidth + 2 || wrapper.scrollLeft > 8;
    }

    wrapper.addEventListener("scroll", refresh, { passive: true });
    if (doc.defaultView) doc.defaultView.addEventListener("resize", refresh);
    refresh();
    if (doc.defaultView && doc.defaultView.requestAnimationFrame) doc.defaultView.requestAnimationFrame(refresh);
  }

  function normalizeCssColor(doc, value) {
    var probe;
    var color = cleanText(value);
    if (!color || color.toLowerCase() === "transparent") return "";
    probe = doc.createElement("span");
    probe.style.color = color;
    return probe.style.color;
  }

  function markLegacyTableColors(doc, table) {
    var elements = [table].concat(toArray(table.querySelectorAll("[bgcolor], [color], [style]")));
    elements.forEach(function (element) {
      var ownerTable = element === table ? table : (element.closest ? element.closest("table") : null);
      var background;
      var foreground;
      if (ownerTable !== table) return;

      background = normalizeCssColor(doc, element.getAttribute("bgcolor") || element.style.backgroundColor);
      if (background) {
        element.style.setProperty("--legacy-table-background", background);
        element.setAttribute("data-webhelp-legacy-background", "true");
      }

      foreground = normalizeCssColor(doc, element.getAttribute("color") || element.style.color);
      if (foreground) {
        element.style.setProperty("--legacy-table-foreground", foreground);
        element.setAttribute("data-webhelp-legacy-foreground", "true");
      }
    });
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
    if (hasFixedWidth(table)) return "wide";
    var dice = count === 2 && (/^\s*\d+d\d+/i.test(firstText) || /\b\d+d\d+\b/i.test(headerText));
    if (hasSpan(table)) return "wide";
    if (dice) return "dice";
    if (count <= 3) return "simple";
    return "wide";
  }

  function wrapTable(doc, table, kind, adaptive, mobileRole) {
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
    if (wrapper && adaptive) wrapper.classList.add("table-responsive--adaptive");
    if (wrapper && mobileRole) {
      wrapper.classList.add("table-responsive--" + mobileRole);
      if (mobileRole === "progression") {
        wrapper.setAttribute("role", "region");
        if (!wrapper.hasAttribute("tabindex")) wrapper.tabIndex = 0;
        wrapper.setAttribute("aria-label", "可横向滚动的成长进阶表格");
        addTableScrollAffordance(doc, wrapper, table, mobileRole);
      }
    }
  }

  function enhanceTables(doc) {
    toArray(doc.querySelectorAll("table")).forEach(function (table) {
      if (table.closest && table.closest(".stat-block")) return;
      if (table.parentElement && table.parentElement.closest && table.parentElement.closest("table")) return;
      if (table.getAttribute("data-table-enhanced") === "true") return;
      var kind;
      var adaptive;
      try { kind = classifyTable(table); } catch (error) { kind = "unknown"; }
      if (kind === "unknown") return;
      adaptive = isFixedLayoutTable(table);
      var mobileRole = mobileTableRole(table, kind);
      table.classList.add("table-enhanced", "table-enhanced--" + kind);
      if (adaptive) table.classList.add("table-enhanced--adaptive");
      table.classList.add(kind === "wide" ? "table-responsive--scroll" : "table-responsive--fit");
      if (kind === "dice") table.classList.add("table-responsive--dice");
      table.classList.add("table-enhanced--" + mobileRole);
      table.setAttribute("data-mobile-table", mobileRole);
      if (mobileRole === "progression") {
        table.style.setProperty("--webhelp-table-min-width", tableMinWidth(columnCount(table)) + "px");
        annotateTableColumns(table);
      }
      markLegacyTableColors(doc, table);
      table.setAttribute("data-table-enhanced", "true");
      wrapTable(doc, table, kind, adaptive, mobileRole);
    });
  }

  function enhance(doc) {
    if (!doc || !doc.documentElement || !doc.body) return;
    enhanceStatBlocks(doc);
    enhanceQuickReference(doc);
    enhanceTables(doc);
    doc.documentElement.setAttribute("data-content-enhanced", "true");
  }

  window.WebHelpContentEnhancer = {
    classifyTable: classifyTable,
    enhance: enhance,
    enhanceQuickReference: enhanceQuickReference,
    enhanceStatBlocks: enhanceStatBlocks,
    enhanceTables: enhanceTables,
    parseStatBlock: parseStatBlock
  };

  try { enhance(document); } catch (error) {}
})();
