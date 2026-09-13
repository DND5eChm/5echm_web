(function () {
  "use strict";

  /*
   * Repair legacy topic colors after the browser has resolved inline styles,
   * inherited colors and translucent backgrounds. The source topic is never
   * changed; repairs are scoped to this document and can be restored.
   */
  var DEFAULT_RATIO = 4.5;
  var MAX_ELEMENTS = 12000;
  var root = document.documentElement;
  var timer = 0;
  var observer = null;
  var lastReport = null;

  function toArray(list) {
    return Array.prototype.slice.call(list || []);
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function number(value, fallback) {
    var parsed = parseFloat(value);
    return isFinite(parsed) ? parsed : fallback;
  }

  function parseChannel(value) {
    var text = String(value || "").trim();
    if (/%$/.test(text)) return clamp(number(text.slice(0, -1), 0) * 2.55, 0, 255);
    return clamp(number(text, 0), 0, 255);
  }

  function parseAlpha(value) {
    if (value === undefined || value === "") return 1;
    if (/%$/.test(String(value))) return clamp(number(String(value).slice(0, -1), 100) / 100, 0, 1);
    return clamp(number(value, 1), 0, 1);
  }

  function parseColor(value, doc) {
    var text = String(value || "").trim().toLowerCase();
    var match;
    var hex;
    var probe;
    var normalized;

    if (!text || text === "transparent") return null;
    match = text.match(/^rgba?\(\s*([^,\s]+)\s*,\s*([^,\s]+)\s*,\s*([^,\s]+)(?:\s*,\s*([^\s]+))?\s*\)$/);
    if (!match) match = text.match(/^rgba?\(\s*([^,\s/]+)\s+([^,\s/]+)\s+([^,\s/]+)(?:\s*\/\s*([^,\s]+))?\s*\)$/);
    if (match) {
      return { r: parseChannel(match[1]), g: parseChannel(match[2]), b: parseChannel(match[3]), a: parseAlpha(match[4]) };
    }
    hex = text.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hex) {
      var valueHex = hex[1];
      if (valueHex.length <= 4) valueHex = valueHex.split("").map(function (part) { return part + part; }).join("");
      return {
        r: parseInt(valueHex.slice(0, 2), 16),
        g: parseInt(valueHex.slice(2, 4), 16),
        b: parseInt(valueHex.slice(4, 6), 16),
        a: valueHex.length === 8 ? parseInt(valueHex.slice(6, 8), 16) / 255 : 1
      };
    }
    if (!doc || !doc.createElement) return null;
    probe = doc.createElement("span");
    probe.style.color = text;
    normalized = probe.style.color;
    if (!normalized || normalized === text) return null;
    return parseColor(normalized, null);
  }

  function composite(foreground, background) {
    var alpha = clamp(foreground.a, 0, 1);
    return {
      r: foreground.r * alpha + background.r * (1 - alpha),
      g: foreground.g * alpha + background.g * (1 - alpha),
      b: foreground.b * alpha + background.b * (1 - alpha),
      a: 1
    };
  }

  function channelLuminance(value) {
    var channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  }

  function luminance(color) {
    return 0.2126 * channelLuminance(color.r) + 0.7152 * channelLuminance(color.g) + 0.0722 * channelLuminance(color.b);
  }

  function contrastRatio(first, second) {
    var firstLum = luminance(first);
    var secondLum = luminance(second);
    var brighter = Math.max(firstLum, secondLum);
    var darker = Math.min(firstLum, secondLum);
    return (brighter + 0.05) / (darker + 0.05);
  }

  function mix(first, second, amount) {
    return {
      r: first.r + (second.r - first.r) * amount,
      g: first.g + (second.g - first.g) * amount,
      b: first.b + (second.b - first.b) * amount,
      a: 1
    };
  }

  function distance(first, second) {
    var red = first.r - second.r;
    var green = first.g - second.g;
    var blue = first.b - second.b;
    return red * red + green * green + blue * blue;
  }

  function chooseRepairColor(foreground, background, minimumRatio) {
    var targets = [{ r: 0, g: 0, b: 0, a: 1 }, { r: 255, g: 255, b: 255, a: 1 }];
    var best = null;
    targets.forEach(function (target) {
      var targetRatio = contrastRatio(target, background);
      var low = 0;
      var high = 1;
      var candidate;
      var index;
      if (targetRatio < minimumRatio) return;
      for (index = 0; index < 18; index += 1) {
        var middle = (low + high) / 2;
        candidate = mix(foreground, target, middle);
        if (contrastRatio(candidate, background) >= minimumRatio) high = middle;
        else low = middle;
      }
      candidate = mix(foreground, target, high);
      if (!best || distance(candidate, foreground) < distance(best, foreground)) best = candidate;
    });
    if (best) return best;
    targets.sort(function (first, second) {
      return contrastRatio(second, background) - contrastRatio(first, background);
    });
    return targets[0];
  }

  function cssColor(color) {
    return "rgb(" + Math.round(color.r) + ", " + Math.round(color.g) + ", " + Math.round(color.b) + ")";
  }

  function directText(element) {
    var nodes = element && element.childNodes ? element.childNodes : [];
    var index;
    for (index = 0; index < nodes.length; index += 1) {
      if ((nodes[index].nodeType === 3 || nodes[index].nodeType === 4) && /\S/.test(nodes[index].nodeValue || "")) return true;
    }
    return false;
  }

  function ignored(element, style) {
    var node = element;
    var tag;
    while (node && node.nodeType === 1) {
      tag = String(node.tagName || "").toLowerCase();
      if (/^(script|style|noscript|template|svg|canvas|video|audio|iframe|object|embed)$/.test(tag)) return true;
      if (node.hasAttribute && (node.hasAttribute("data-webhelp-contrast-ignore") || node.getAttribute("aria-hidden") === "true")) return true;
      node = node.parentElement;
    }
    return !style || style.display === "none" || style.visibility === "hidden" || number(style.opacity, 1) < 0.05;
  }

  function effectiveBackground(doc, element) {
    var current = { r: 255, g: 255, b: 255, a: 1 };
    var node = element;
    var style;
    var color;
    while (node && node.nodeType === 1) {
      style = doc.defaultView.getComputedStyle(node);
      if (style.backgroundImage && style.backgroundImage !== "none") return null;
      color = parseColor(style.backgroundColor, doc);
      if (color) {
        current = composite(color, current);
        if (color.a >= 0.995) return current;
      }
      node = node.parentElement;
    }
    return current;
  }

  function fontRatio(style) {
    var size = number(style.fontSize, 16);
    var weight = number(style.fontWeight, 400);
    return size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : DEFAULT_RATIO;
  }

  function restore(doc) {
    toArray(doc.querySelectorAll("[data-webhelp-contrast-repaired='true']")).forEach(function (element) {
      var original = element.getAttribute("data-webhelp-contrast-original-color");
      var priority = element.getAttribute("data-webhelp-contrast-original-priority") || "";
      if (original) element.style.setProperty("color", original, priority);
      else element.style.removeProperty("color");
      element.removeAttribute("data-webhelp-contrast-repaired");
      element.removeAttribute("data-webhelp-contrast-original-color");
      element.removeAttribute("data-webhelp-contrast-original-priority");
    });
  }

  function preparePrint(doc) {
    toArray(doc.querySelectorAll("[data-webhelp-contrast-repaired='true']")).forEach(function (element) {
      element.setAttribute("data-webhelp-contrast-print-color", element.style.getPropertyValue("color"));
      element.style.setProperty("color", "#000000", "important");
    });
  }

  function restorePrint(doc) {
    toArray(doc.querySelectorAll("[data-webhelp-contrast-print-color]")).forEach(function (element) {
      element.style.setProperty("color", element.getAttribute("data-webhelp-contrast-print-color"), "important");
      element.removeAttribute("data-webhelp-contrast-print-color");
    });
  }

  function mode(doc) {
    return doc.documentElement.getAttribute("data-webhelp-contrast-mode") === "off" ? "off" : "auto";
  }

  function repair(doc, options) {
    var settings = options || {};
    var threshold = clamp(number(settings.minimumRatio || doc.documentElement.getAttribute("data-webhelp-contrast-threshold"), DEFAULT_RATIO), 3, 7);
    var elements;
    var report = { checked: 0, repaired: 0, lowContrast: 0, skipped: 0, threshold: threshold, findings: [] };
    var count = 0;
    if (!doc || !doc.body || !doc.defaultView) return report;
    elements = [doc.body].concat(toArray(doc.body.querySelectorAll("*")));
    if (!settings.dryRun && mode(doc) === "off") {
      restore(doc);
      root.removeAttribute("data-webhelp-contrast-repair-count");
      lastReport = report;
      return report;
    }
    if (!settings.dryRun) restore(doc);
    elements.some(function (element) {
      var style;
      var foreground;
      var background;
      var ratio;
      var minimum;
      var replacement;
      if (count >= MAX_ELEMENTS) return true;
      count += 1;
      if (!directText(element)) return false;
      style = doc.defaultView.getComputedStyle(element);
      if (ignored(element, style)) { report.skipped += 1; return false; }
      background = effectiveBackground(doc, element);
      foreground = parseColor(style.color, doc);
      if (!background || !foreground) { report.skipped += 1; return false; }
      foreground = composite(foreground, background);
      ratio = contrastRatio(foreground, background);
      minimum = fontRatio(style);
      report.checked += 1;
      if (ratio >= minimum) return false;
      report.lowContrast += 1;
      replacement = chooseRepairColor(foreground, background, minimum);
      if (!replacement || contrastRatio(replacement, background) <= ratio + 0.05) return false;
      if (!settings.dryRun) {
        element.setAttribute("data-webhelp-contrast-original-color", element.style.getPropertyValue("color"));
        element.setAttribute("data-webhelp-contrast-original-priority", element.style.getPropertyPriority("color"));
        element.style.setProperty("color", cssColor(replacement), "important");
        element.setAttribute("data-webhelp-contrast-repaired", "true");
      }
      report.repaired += 1;
      if (report.findings.length < 100) {
        report.findings.push({ tag: String(element.tagName || "").toLowerCase(), ratio: Math.round(ratio * 100) / 100, replacement: cssColor(replacement) });
      }
      return false;
    });
    report.truncated = count >= MAX_ELEMENTS;
    root.setAttribute("data-webhelp-contrast-repair-count", String(report.repaired));
    lastReport = report;
    return report;
  }

  function schedule() {
    if (timer || mode(document) === "off") return;
    timer = window.setTimeout(function () {
      timer = 0;
      try { repair(document); } catch (error) {}
    }, 80);
  }

  function start() {
    try { repair(document); } catch (error) {}
    if (window.addEventListener) {
      window.addEventListener("beforeprint", function () { preparePrint(document); });
      window.addEventListener("afterprint", function () { restorePrint(document); });
    }
    if (!window.MutationObserver || !document.body) return;
    observer = new MutationObserver(function (records) {
      var changed = records.some(function (record) { return record.type === "childList" || record.attributeName === "data-webhelp-theme" || record.attributeName === "data-webhelp-contrast-mode"; });
      if (changed) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observer.observe(root, { attributes: true, attributeFilter: ["data-webhelp-theme", "data-webhelp-contrast-mode"] });
  }

  window.WebHelpContrast = {
    audit: function (options) {
      var previousMode = root.getAttribute("data-webhelp-contrast-mode");
      var auditOptions = { dryRun: true };
      var report;
      if (options && options.minimumRatio !== undefined) auditOptions.minimumRatio = options.minimumRatio;
      restore(document);
      report = repair(document, auditOptions);
      if (previousMode !== "off") repair(document);
      return report;
    },
    repair: function (options) { return repair(document, options); },
    restore: function () { restore(document); root.removeAttribute("data-webhelp-contrast-repair-count"); },
    setMode: function (value) {
      var next = value === "off" ? "off" : "auto";
      root.setAttribute("data-webhelp-contrast-mode", next);
      if (next === "off") {
        restore(document);
        root.removeAttribute("data-webhelp-contrast-repair-count");
      }
      else repair(document);
      return next;
    },
    getReport: function () { return lastReport; }
  };

  start();
})();
