(function () {
  "use strict";

  var frame = document.getElementById("content");
  var fallback = document.body.getAttribute("data-default-page") || "";

  function pageValue() {
    try {
      var url = new URL(window.location.href);
      var query = url.searchParams.get("page");
      if (query) return query;
    } catch (error) {}
    var match = /(?:^#|[&#])page=([^&]*)/i.exec(window.location.hash || "");
    if (!match) return fallback;
    try { return decodeURIComponent(match[1]); } catch (error) { return match[1]; }
  }

  function path(value) {
    var source = String(value || "").replace(/\\/g, "/").replace(/^topics\//i, "");
    try { source = decodeURIComponent(source); } catch (error) {}
    var parts = source.split("/").filter(function (part) { return part && part !== "." && part !== ".."; });
    return "topics/" + parts.map(function (part) { return encodeURIComponent(part); }).join("/");
  }

  function enhanceContent() {
    if (!window.addEventListener || !document.querySelector || !document.documentElement.classList) return;
    var doc;
    try { doc = frame.contentDocument; } catch (error) { return; }
    if (!doc || !doc.head) return;
    function stylesheet(id, href) {
      if (doc.getElementById(id)) return;
      var link = doc.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      doc.head.appendChild(link);
    }
    function asset(pathname) {
      try { return new URL(pathname, window.location.href).href; } catch (error) { return pathname; }
    }
    stylesheet("webhelpTopicStyles", asset("assets/webhelp-topic.css"));
    stylesheet("webhelpContentEnhanceStyles", asset("assets/content-enhance.css"));
    if (!doc.getElementById("webhelpContentEnhanceScript")) {
      var script = doc.createElement("script");
      script.id = "webhelpContentEnhanceScript";
      script.src = asset("assets/content-enhance.js");
      script.async = false;
      doc.head.appendChild(script);
    }
  }

  frame.src = path(pageValue());
  if (frame.addEventListener) frame.addEventListener("load", enhanceContent);
})();
