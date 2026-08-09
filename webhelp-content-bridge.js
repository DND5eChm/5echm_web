(function() {
    function escapeRegExp(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function clearHighlights() {
        var navigator = document.getElementById('searchHighlightNavigator');
        if (navigator && navigator.parentNode) navigator.parentNode.removeChild(navigator);
        var marks = document.querySelectorAll('mark[data-search-highlight="true"]');
        for (var i = 0; i < marks.length; i++) {
            if (marks[i].parentNode) marks[i].parentNode.replaceChild(document.createTextNode(marks[i].textContent || ''), marks[i]);
        }
    }

    function installStyle() {
        if (!document.head || document.getElementById('webhelpContentHighlightStyle')) return;
        var style = document.createElement('style');
        style.id = 'webhelpContentHighlightStyle';
        style.textContent =
            'mark[data-search-highlight="true"]{background:#fde68a;color:inherit;padding:1px 2px;border-radius:2px;font-weight:500;}' +
            '#searchHighlightNavigator{position:fixed;top:12px;right:16px;z-index:2147483647;display:flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid rgba(148,163,184,.55);border-radius:8px;background:rgba(255,255,255,.96);color:#1e293b;box-shadow:0 4px 14px rgba(15,23,42,.18);font:12px/1.2 Arial,sans-serif;}' +
            '#searchHighlightNavigator button{border:0;border-radius:5px;padding:4px 7px;cursor:pointer;background:#e0e7ff;color:#1e3a8a;font:inherit;}' +
            '#searchHighlightNavigator button:hover:not(:disabled){background:#c7d2fe;}#searchHighlightNavigator button:disabled{opacity:.45;cursor:default;}#searchHighlightNavigator .search-highlight-count{min-width:42px;text-align:center;white-space:nowrap;font-weight:600;}';
        document.head.appendChild(style);
    }

    function jump(state, index, smooth) {
        if (!state.marks.length) return;
        if (state.index >= 0 && state.marks[state.index]) {
            state.marks[state.index].style.background = '';
            state.marks[state.index].style.color = '';
            state.marks[state.index].style.outline = '';
        }
        state.index = (index + state.marks.length) % state.marks.length;
        var mark = state.marks[state.index];
        mark.style.background = '#f59e0b';
        mark.style.color = '#111827';
        mark.style.outline = '2px solid rgba(245,158,11,.45)';
        state.counter.textContent = (state.index + 1) + ' / ' + state.marks.length;
        try {
            mark.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center', inline: 'nearest' });
        } catch (e) {
            mark.scrollIntoView(true);
        }
    }

    function applyHighlight(data) {
        var terms = (data.words || []).filter(function(term, index, list) {
            return term && list.indexOf(term) === index;
        }).sort(function(a, b) { return b.length - a.length; });
        clearHighlights();
        installStyle();

        var marks = [];
        if (terms.length) {
            var regex = new RegExp('(' + terms.map(escapeRegExp).join('|') + ')', 'gi');
            var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
            var nodes = [];
            var node;
            while ((node = walker.nextNode())) {
                var tagName = node.parentNode && node.parentNode.tagName;
                if (tagName !== 'SCRIPT' && tagName !== 'STYLE' && tagName !== 'NOSCRIPT' && tagName !== 'MARK') nodes.push(node);
            }
            nodes.forEach(function(textNode) {
                var text = textNode.nodeValue || '';
                regex.lastIndex = 0;
                var match;
                var last = 0;
                var found = false;
                var fragment = document.createDocumentFragment();
                while ((match = regex.exec(text)) !== null) {
                    found = true;
                    if (match.index > last) fragment.appendChild(document.createTextNode(text.slice(last, match.index)));
                    var mark = document.createElement('mark');
                    mark.setAttribute('data-search-highlight', 'true');
                    mark.textContent = match[0];
                    fragment.appendChild(mark);
                    last = match.index + match[0].length;
                }
                if (!found) return;
                if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)));
                textNode.parentNode.replaceChild(fragment, textNode);
            });
            marks = Array.prototype.slice.call(document.querySelectorAll('mark[data-search-highlight="true"]'));
        }

        var navigator = document.createElement('div');
        navigator.id = 'searchHighlightNavigator';
        navigator.setAttribute('role', 'navigation');
        navigator.setAttribute('aria-label', '搜索关键词导航');
        var previous = document.createElement('button');
        previous.type = 'button';
        previous.textContent = '上一个';
        var counter = document.createElement('span');
        counter.className = 'search-highlight-count';
        var next = document.createElement('button');
        next.type = 'button';
        next.textContent = '下一个';
        navigator.appendChild(previous);
        navigator.appendChild(counter);
        navigator.appendChild(next);
        document.body.appendChild(navigator);

        var state = { marks: marks, index: -1, counter: counter };
        previous.disabled = marks.length < 2;
        next.disabled = marks.length < 2;
        previous.onclick = function() { jump(state, state.index - 1, true); };
        next.onclick = function() { jump(state, state.index + 1, true); };
        counter.textContent = marks.length ? '1 / ' + marks.length : '未找到';
        if (marks.length) jump(state, 0, false);
        try {
            if (window.parent && window.parent.postMessage) {
                window.parent.postMessage({ type: 'webhelp-search-highlighted', requestId: data.requestId, matches: marks.length }, '*');
            }
        } catch (e) {}
    }

    if (window.addEventListener) {
        window.addEventListener('message', function(event) {
            var data = event && event.data;
            if (!data || data.type !== 'webhelp-search-apply') return;
            try { applyHighlight(data); } catch (e) {}
        }, false);
    }
})();
