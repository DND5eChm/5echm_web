(function (window, document) {
  "use strict";

  /*
   * Keep generated navigation and optional topic enhancements usable in
   * older WebViews/IE-era engines. Modern browsers already provide these
   * methods, so this file is a no-op there.
   */
  var ElementCtor = window.Element;

  function install(target, name, method) {
    if (!target || target[name]) return;
    try { target[name] = method; } catch (error) {}
  }

  if (window.String && !String.prototype.trim) {
    install(String.prototype, "trim", function () {
      return this.replace(/^\s+|\s+$/g, "");
    });
  }

  if (window.Array) {
    install(Array.prototype, "indexOf", function (value, fromIndex) {
      var length = this.length >>> 0;
      var index = Number(fromIndex) || 0;
      if (index < 0) index = Math.max(length + index, 0);
      for (; index < length; index += 1) if (this[index] === value) return index;
      return -1;
    });
    install(Array.prototype, "forEach", function (callback, thisArg) {
      var index;
      if (typeof callback !== "function") throw new TypeError("callback must be a function");
      for (index = 0; index < this.length; index += 1) {
        if (index in this) callback.call(thisArg, this[index], index, this);
      }
    });
    install(Array.prototype, "map", function (callback, thisArg) {
      var result = [];
      var index;
      if (typeof callback !== "function") throw new TypeError("callback must be a function");
      for (index = 0; index < this.length; index += 1) {
        result[index] = callback.call(thisArg, this[index], index, this);
      }
      return result;
    });
    install(Array.prototype, "filter", function (callback, thisArg) {
      var result = [];
      var index;
      if (typeof callback !== "function") throw new TypeError("callback must be a function");
      for (index = 0; index < this.length; index += 1) {
        if (callback.call(thisArg, this[index], index, this)) result.push(this[index]);
      }
      return result;
    });
    install(Array.prototype, "some", function (callback, thisArg) {
      var index;
      if (typeof callback !== "function") throw new TypeError("callback must be a function");
      for (index = 0; index < this.length; index += 1) {
        if (callback.call(thisArg, this[index], index, this)) return true;
      }
      return false;
    });
    install(Array.prototype, "every", function (callback, thisArg) {
      var index;
      if (typeof callback !== "function") throw new TypeError("callback must be a function");
      for (index = 0; index < this.length; index += 1) {
        if (!callback.call(thisArg, this[index], index, this)) return false;
      }
      return true;
    });
    install(Array.prototype, "find", function (predicate, thisArg) {
      var index;
      if (typeof predicate !== "function") throw new TypeError("predicate must be a function");
      for (index = 0; index < this.length; index += 1) {
        if (predicate.call(thisArg, this[index], index, this)) return this[index];
      }
      return undefined;
    });
    if (!Array.isArray) {
      try {
        Array.isArray = function (value) { return Object.prototype.toString.call(value) === "[object Array]"; };
      } catch (error) {}
    }
    if (!Array.from) {
      install(Array, "from", function (value, mapFn, thisArg) {
        var result = [];
        var length = value == null ? 0 : value.length >>> 0;
        var index;
        if (typeof mapFn !== "undefined" && typeof mapFn !== "function") throw new TypeError("mapFn must be a function");
        for (index = 0; index < length; index += 1) {
          result[index] = mapFn ? mapFn.call(thisArg, value[index], index) : value[index];
        }
        return result;
      });
    }
  }

  if (window.Object && !Object.keys) {
    install(Object, "keys", function (value) {
      var keys = [];
      var key;
      for (key in Object(value)) {
        if (Object.prototype.hasOwnProperty.call(value, key)) keys.push(key);
      }
      return keys;
    });
  }

  if (ElementCtor && document.documentElement && !("classList" in document.documentElement) &&
      window.Object && Object.defineProperty) {
    try {
      Object.defineProperty(ElementCtor.prototype, "classList", {
        configurable: true,
        get: function () {
          var element = this;
          function values() {
            var value = element.getAttribute("class") || "";
            return value.replace(/^\s+|\s+$/g, "").split(/\s+/).filter(function (item) { return item; });
          }
          function write(list) {
            element.setAttribute("class", list.join(" "));
          }
          return {
            add: function () {
              var list = values();
              var index;
              var name;
              for (index = 0; index < arguments.length; index += 1) {
                name = String(arguments[index]);
                if (list.indexOf(name) === -1) list.push(name);
              }
              write(list);
            },
            remove: function () {
              var list = values();
              var index;
              var name;
              var position;
              for (index = 0; index < arguments.length; index += 1) {
                name = String(arguments[index]);
                position = list.indexOf(name);
                while (position !== -1) {
                  list.splice(position, 1);
                  position = list.indexOf(name);
                }
              }
              write(list);
            },
            toggle: function (name, force) {
              var list = values();
              var has = list.indexOf(String(name)) !== -1;
              var shouldHave = force === undefined ? !has : Boolean(force);
              if (shouldHave && !has) list.push(String(name));
              if (!shouldHave && has) list.splice(list.indexOf(String(name)), 1);
              write(list);
              return shouldHave;
            },
            contains: function (name) { return values().indexOf(String(name)) !== -1; },
            item: function (index) { return values()[index] || null; },
            toString: function () { return values().join(" "); }
          };
        }
      });
    } catch (error) {}
  }

  if (!window.Promise) {
    function LegacyPromise(executor) {
      var self = this;
      self.state = "pending";
      self.value = undefined;
      self.handlers = [];

      function settle(state, value) {
        if (self.state !== "pending") return;
        self.state = state;
        self.value = value;
        self.flush();
      }

      function resolve(value) {
        var then;
        if (value === self) return reject(new TypeError("Promise cannot resolve itself"));
        if (value && (typeof value === "object" || typeof value === "function")) {
          try { then = value.then; } catch (error) { return reject(error); }
          if (typeof then === "function") {
            try {
              then.call(value, resolve, reject);
            } catch (error) {
              reject(error);
            }
            return;
          }
        }
        settle("fulfilled", value);
      }

      function reject(reason) {
        settle("rejected", reason);
      }

      self.flush = function () {
        if (self.state === "pending") return;
        window.setTimeout(function () {
          var handlers = self.handlers.slice();
          var index;
          self.handlers = [];
          for (index = 0; index < handlers.length; index += 1) {
            self.runHandler(handlers[index]);
          }
        }, 0);
      };

      self.runHandler = function (handler) {
        var callback = self.state === "fulfilled" ? handler.onFulfilled : handler.onRejected;
        if (typeof callback !== "function") {
          (self.state === "fulfilled" ? handler.resolve : handler.reject)(self.value);
          return;
        }
        try {
          handler.resolve(callback(self.value));
        } catch (error) {
          handler.reject(error);
        }
      };

      try { executor(resolve, reject); } catch (error) { reject(error); }
    }

    LegacyPromise.prototype.then = function (onFulfilled, onRejected) {
      var self = this;
      return new LegacyPromise(function (resolve, reject) {
        self.handlers.push({
          onFulfilled: onFulfilled,
          onRejected: onRejected,
          resolve: resolve,
          reject: reject
        });
        self.flush();
      });
    };

    LegacyPromise.prototype.catch = function (onRejected) {
      return this.then(null, onRejected);
    };

    LegacyPromise.resolve = function (value) {
      if (value instanceof LegacyPromise) return value;
      return new LegacyPromise(function (resolve) { resolve(value); });
    };

    LegacyPromise.reject = function (reason) {
      return new LegacyPromise(function (resolve, reject) { reject(reason); });
    };

    LegacyPromise.all = function (values) {
      return new LegacyPromise(function (resolve, reject) {
        var list = values || [];
        var result = [];
        var remaining = list.length;
        var index;
        if (!remaining) { resolve(result); return; }
        function complete(position, value) {
          result[position] = value;
          remaining -= 1;
          if (!remaining) resolve(result);
        }
        for (index = 0; index < list.length; index += 1) {
          (function (position) {
            LegacyPromise.resolve(list[position]).then(function (value) {
              complete(position, value);
            }, reject);
          }(index));
        }
      });
    };

    window.Promise = LegacyPromise;
  }

  function fallbackMatches(element, selector) {
    var owner = element && (element.ownerDocument || document);
    var candidates;
    var index;
    if (!owner || !owner.querySelectorAll) return false;
    candidates = owner.querySelectorAll(selector);
    for (index = 0; index < candidates.length; index += 1) {
      if (candidates[index] === element) return true;
    }
    return false;
  }

  if (ElementCtor && ElementCtor.prototype) {
    var nativeMatches = ElementCtor.prototype.matches ||
      ElementCtor.prototype.msMatchesSelector ||
      ElementCtor.prototype.webkitMatchesSelector;

    install(ElementCtor.prototype, "matches", function (selector) {
      if (nativeMatches) return nativeMatches.call(this, selector);
      return fallbackMatches(this, selector);
    });

    install(ElementCtor.prototype, "closest", function (selector) {
      var current = this;
      while (current && current.nodeType === 1) {
        if (current.matches ? current.matches(selector) : fallbackMatches(current, selector)) return current;
        current = current.parentElement;
      }
      return null;
    });

    install(ElementCtor.prototype, "remove", function () {
      if (this.parentNode) this.parentNode.removeChild(this);
    });
  }

  function installForEach(Constructor) {
    if (!Constructor || !Constructor.prototype || Constructor.prototype.forEach) return;
    install(Constructor.prototype, "forEach", function (callback, thisArg) {
      var index;
      if (typeof callback !== "function") throw new TypeError("callback must be a function");
      for (index = 0; index < this.length; index += 1) {
        callback.call(thisArg, this[index], index, this);
      }
    });
  }

  installForEach(window.NodeList);
  installForEach(window.HTMLCollection);
})(window, document);
