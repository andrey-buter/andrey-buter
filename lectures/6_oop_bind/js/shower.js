/**
 * Core for Shower HTML presentation engine
 * shower-core v2.1.0, https://github.com/shower/core
 * @copyright 2010-2017 Vadim Makeev, http://pepelsbey.net/
 * @license MIT
 */
! function(global) {
    var undef, DECL_STATES = {
            NOT_RESOLVED: "NOT_RESOLVED",
            IN_RESOLVING: "IN_RESOLVING",
            RESOLVED: "RESOLVED"
        },
        create = function() {
            var curOptions = {
                    trackCircularDependencies: !0,
                    allowMultipleDeclarations: !0
                },
                modulesStorage = {},
                waitForNextTick = !1,
                pendingRequires = [],
                define = function(name, deps, declFn) {
                    declFn || (declFn = deps, deps = []);
                    var module = modulesStorage[name];
                    module || (module = modulesStorage[name] = {
                        name: name,
                        decl: undef
                    }), module.decl = {
                        name: name,
                        prev: module.decl,
                        fn: declFn,
                        state: DECL_STATES.NOT_RESOLVED,
                        deps: deps,
                        dependents: [],
                        exports: undef
                    }
                },
                require = function(modules, cb, errorCb) {
                    "string" == typeof modules && (modules = [modules]), waitForNextTick || (waitForNextTick = !0, nextTick(onNextTick)), pendingRequires.push({
                        deps: modules,
                        cb: function(exports, error) {
                            error ? (errorCb || onError)(error) : cb.apply(global, exports)
                        }
                    })
                },
                getState = function(name) {
                    var module = modulesStorage[name];
                    return module ? DECL_STATES[module.decl.state] : "NOT_DEFINED"
                },
                isDefined = function(name) {
                    return !!modulesStorage[name]
                },
                setOptions = function(options) {
                    for (var name in options) options.hasOwnProperty(name) && (curOptions[name] = options[name])
                },
                getStat = function() {
                    var module, res = {};
                    for (var name in modulesStorage) modulesStorage.hasOwnProperty(name) && (module = modulesStorage[name], (res[module.decl.state] || (res[module.decl.state] = [])).push(name));
                    return res
                },
                onNextTick = function() {
                    waitForNextTick = !1, applyRequires()
                },
                applyRequires = function() {
                    var require, requiresToProcess = pendingRequires,
                        i = 0;
                    for (pendingRequires = []; require = requiresToProcess[i++];) requireDeps(null, require.deps, [], require.cb)
                },
                requireDeps = function(fromDecl, deps, path, cb) {
                    var unresolvedDepsCnt = deps.length;
                    unresolvedDepsCnt || cb([]);
                    for (var dep, decl, decls = [], onDeclResolved = function(_, error) {
                            if (error) return void cb(null, error);
                            if (!--unresolvedDepsCnt) {
                                for (var decl, exports = [], i = 0; decl = decls[i++];) exports.push(decl.exports);
                                cb(exports)
                            }
                        }, i = 0, len = unresolvedDepsCnt; i < len;) {
                        if (dep = deps[i++], "string" == typeof dep) {
                            if (!modulesStorage[dep]) return void cb(null, buildModuleNotFoundError(dep, fromDecl));
                            decl = modulesStorage[dep].decl
                        } else decl = dep;
                        decls.push(decl), startDeclResolving(decl, path, onDeclResolved)
                    }
                },
                startDeclResolving = function(decl, path, cb) {
                    if (decl.state === DECL_STATES.RESOLVED) return void cb(decl.exports);
                    if (decl.state === DECL_STATES.IN_RESOLVING) return void(curOptions.trackCircularDependencies && isDependenceCircular(decl, path) ? cb(null, buildCircularDependenceError(decl, path)) : decl.dependents.push(cb));
                    if (decl.dependents.push(cb), decl.prev && !curOptions.allowMultipleDeclarations) return void provideError(decl, buildMultipleDeclarationError(decl));
                    curOptions.trackCircularDependencies && (path = path.slice()).push(decl);
                    var isProvided = !1,
                        deps = decl.prev ? decl.deps.concat([decl.prev]) : decl.deps;
                    decl.state = DECL_STATES.IN_RESOLVING, requireDeps(decl, deps, path, function(depDeclsExports, error) {
                        return error ? void provideError(decl, error) : (depDeclsExports.unshift(function(exports, error) {
                            return isProvided ? void cb(null, buildDeclAreadyProvidedError(decl)) : (isProvided = !0, void(error ? provideError(decl, error) : provideDecl(decl, exports)))
                        }), void decl.fn.apply({
                            name: decl.name,
                            deps: decl.deps,
                            global: global
                        }, depDeclsExports))
                    })
                },
                provideDecl = function(decl, exports) {
                    decl.exports = exports, decl.state = DECL_STATES.RESOLVED;
                    for (var dependent, i = 0; dependent = decl.dependents[i++];) dependent(exports);
                    decl.dependents = undef
                },
                provideError = function(decl, error) {
                    decl.state = DECL_STATES.NOT_RESOLVED;
                    for (var dependent, i = 0; dependent = decl.dependents[i++];) dependent(null, error);
                    decl.dependents = []
                };
            return {
                create: create,
                define: define,
                require: require,
                getState: getState,
                isDefined: isDefined,
                setOptions: setOptions,
                getStat: getStat
            }
        },
        onError = function(e) {
            nextTick(function() {
                throw e
            })
        },
        buildModuleNotFoundError = function(name, decl) {
            return Error(decl ? 'Module "' + decl.name + '": can\'t resolve dependence "' + name + '"' : 'Required module "' + name + "\" can't be resolved")
        },
        buildCircularDependenceError = function(decl, path) {
            for (var pathDecl, strPath = [], i = 0; pathDecl = path[i++];) strPath.push(pathDecl.name);
            return strPath.push(decl.name), Error('Circular dependence has been detected: "' + strPath.join(" -> ") + '"')
        },
        buildDeclAreadyProvidedError = function(decl) {
            return Error('Declaration of module "' + decl.name + '" has already been provided')
        },
        buildMultipleDeclarationError = function(decl) {
            return Error('Multiple declarations of module "' + decl.name + '" have been detected')
        },
        isDependenceCircular = function(decl, path) {
            for (var pathDecl, i = 0; pathDecl = path[i++];)
                if (decl === pathDecl) return !0;
            return !1
        },
        nextTick = function() {
            var fns = [],
                enqueueFn = function(fn) {
                    return 1 === fns.push(fn)
                },
                callFns = function() {
                    var fnsToCall = fns,
                        i = 0,
                        len = fns.length;
                    for (fns = []; i < len;) fnsToCall[i++]()
                };
            if ("object" == typeof process && process.nextTick) return function(fn) {
                enqueueFn(fn) && process.nextTick(callFns)
            };
            if (global.setImmediate) return function(fn) {
                enqueueFn(fn) && global.setImmediate(callFns)
            };
            if (global.postMessage && !global.opera) {
                var isPostMessageAsync = !0;
                if (global.attachEvent) {
                    var checkAsync = function() {
                        isPostMessageAsync = !1
                    };
                    global.attachEvent("onmessage", checkAsync), global.postMessage("__checkAsync", "*"), global.detachEvent("onmessage", checkAsync)
                }
                if (isPostMessageAsync) {
                    var msg = "__modules" + +new Date,
                        onMessage = function(e) {
                            e.data === msg && (e.stopPropagation && e.stopPropagation(), callFns())
                        };
                    return global.addEventListener ? global.addEventListener("message", onMessage, !0) : global.attachEvent("onmessage", onMessage),
                        function(fn) {
                            enqueueFn(fn) && global.postMessage(msg, "*")
                        }
                }
            }
            var doc = global.document;
            if ("onreadystatechange" in doc.createElement("script")) {
                var head = doc.getElementsByTagName("head")[0],
                    createScript = function() {
                        var script = doc.createElement("script");
                        script.onreadystatechange = function() {
                            script.parentNode.removeChild(script), script = script.onreadystatechange = null, callFns()
                        }, head.appendChild(script)
                    };
                return function(fn) {
                    enqueueFn(fn) && createScript()
                }
            }
            return function(fn) {
                enqueueFn(fn) && setTimeout(callFns, 0)
            }
        }();
    "object" == typeof exports ? module.exports = create() : global.modules = create()
}("undefined" != typeof window ? window : global),
function(global) {
    function initialize() {
        global.shower.modules.require("shower.defaultOptions", function(defaultOptions) {
            var hasOptions = global.hasOwnProperty("showerOptions"),
                options = global.shower.options,
                containerSelector = options.shower_selector || defaultOptions.container_selector,
                element = document.querySelector(containerSelector),
                getDataAttr = getData.bind(this, element),
                autoInit = "undefined" == typeof options.auto_init || options.auto_init;
            if (!element) throw new Error("Shower element with selector " + containerSelector + " not found.");
            ("false" !== getDataAttr("auto-init") || hasOptions && autoInit) && (hasOptions || dataAttrsOptions.forEach(function(name) {
                var value = getDataAttr(name);
                null !== value && "undefined" != typeof value && (options[name.replace(/-/g, "_")] = value)
            }), global.shower.modules.require(["shower"], function(sh) {
                sh.init({
                    container: element,
                    options: options
                })
            }))
        })
    }

    function getData(element, name) {
        return element.dataset ? element.dataset[name] : element.getAttribute("data-" + name)
    }
    var dataAttrsOptions = ["debug-mode", "slides-selector", "hotkeys"];
    global.shower = {
        modules: modules.create(),
        options: global.showerOptions || {}
    }, /interactive|complete|loaded/.test(document.readyState) ? initialize() : document.addEventListener("DOMContentLoaded", initialize)
}(window), shower.modules.define("shower", ["shower.global"], function(provide, showerGlobal) {
    provide(showerGlobal)
}), shower.modules.define("Emitter", ["emitter.Event", "emitter.EventGroup", "util.extend"], function(provide, EmitterEvent, EventGroup, extend) {
    function EventEmitter(parameters) {
        parameters = parameters || {}, this._context = parameters.context, this._parent = parameters.parent, this._listeners = {}
    }

    function sortByPriority(aListener, bListener) {
        return aListener.priority - bListener.priority
    }
    extend(EventEmitter.prototype, {
        on: function(types, callback, context, priority) {
            if ("undefined" == typeof callback) throw new Error("Callback is not defined.");
            if (priority = priority || 0, "string" == typeof types) this._addListener(types, callback, context, priority);
            else
                for (var i = 0, l = types.length; i < l; i++) this._addListener(types[i], callback, context, priority);
            return this
        },
        off: function(types, callback, context, priority) {
            if (priority = priority || 0, "string" == typeof types) this._removeListener(types, callback, context, priority);
            else
                for (var i = 0, l = types.length; i < l; i++) this._removeListener(types[i], callback, context, priority);
            return this
        },
        once: function(eventType, callback, context, priority) {
            var handler = function(event) {
                this.off(eventType, handler, this, priority), context ? callback.call(context, event) : callback(event)
            };
            return this.on(eventType, handler, this, priority), this
        },
        emit: function(eventType, eventObject) {
            var event = eventObject,
                listeners = this._listeners;
            event && "function" == typeof event.get || (event = this.createEventObject(eventType, eventObject, this._context)), event.isPropagationStopped() || (listeners.hasOwnProperty(eventType) && this._callListeners(listeners[eventType], event), this._parent && !event.isPropagationStopped() && this._parent.emit(eventType, event))
        },
        createEventObject: function(type, eventData, target) {
            var data = {
                target: target,
                type: type
            };
            return new EmitterEvent(eventData ? extend(data, eventData) : data)
        },
        setParent: function(parent) {
            this._parent != parent && (this._parent = parent)
        },
        getParent: function() {
            return this._parent
        },
        group: function() {
            return new EventGroup(this)
        },
        _addListener: function(eventType, callback, context, priority) {
            var listener = {
                callback: callback,
                context: context,
                priority: priority
            };
            this._listeners[eventType] ? this._listeners[eventType].push(listener) : this._listeners[eventType] = [listener]
        },
        _removeListener: function(eventType, callback, context, priority) {
            var listener, listeners = this._listeners[eventType];
            if (listeners) {
                for (var foundIndex = -1, i = 0, l = listeners.length; i < l; i++) listener = listeners[i], listener.callback == callback && listener.context == context && listener.priority == priority && (foundIndex = i);
                foundIndex != -1 && (1 == listeners.length ? this._clearType(eventType) : listeners.splice(foundIndex, 1))
            }
        },
        _clearType: function(eventType) {
            this._listeners.hasOwnProperty(eventType) && delete this._listeners[eventType]
        },
        _callListeners: function(listeners, event) {
            var i = listeners.length - 1;
            for (listeners.sort(sortByPriority); i >= 0 && !event.defaultPrevented();) {
                var listener = listeners[i];
                listener && (listener.context ? listener.callback.call(listener.context, event) : listener.callback(event)), i--
            }
        }
    }), provide(EventEmitter)
}), shower.modules.define("emitter.Event", ["util.extend"], function(provide, extend) {
    function Event(data) {
        this._data = data, this._preventDefault = !1, this._stopPropagation = !1
    }
    extend(Event.prototype, {
        get: function(key) {
            return this._data[key]
        },
        preventDefault: function() {
            return this._preventDefault = !0, this._preventDefault
        },
        defaultPrevented: function() {
            return this._preventDefault
        },
        stopPropagation: function() {
            return this._stopPropagation = !0, this._stopPropagation
        },
        isPropagationStopped: function() {
            return this._stopPropagation
        }
    }), provide(Event)
}), shower.modules.define("emitter.EventGroup", ["util.extend"], function(provide, extend) {
    function EventGroup(eventManager) {
        this.events = eventManager, this._listeners = []
    }
    extend(EventGroup.prototype, {
        on: function(types, callback, context) {
            if (Array.isArray(types))
                for (var i = 0, k = types.length; i < k; i++) this._listeners.push(types[i], callback, context);
            else this._listeners.push(types, callback, context);
            return this.events.on(types, callback, context), this
        },
        off: function(types, callback, context) {
            if (Array.isArray(types))
                for (var i = 0, k = types.length; i < k; i++) this._removeListener(types[i], callback, context);
            else this._removeListener(types, callback, context);
            return this
        },
        offAll: function() {
            for (var i = 0, k = this._listeners.length; i < k; i += 3) this.events.off(this._listeners[i], this._listeners[i + 1], this._listeners[i + 2]);
            return this._listeners.length = 0, this
        },
        _removeListener: function(type, callback, context) {
            for (var index = this._listeners.indexOf(type, 0); index != -1;) this._listeners[index + 1] == callback && this._listeners[index + 2] == context && (this._listeners.splice(index, 3), this.events.off(type, callback, context)), index = this._listeners.indexOf(type, index)
        }
    }), provide(EventGroup)
}), shower.modules.define("Plugins", ["Emitter", "util.extend"], function(provide, EventEmitter, extend) {
    function Plugins(showerGlobal) {
        this.events = new EventEmitter({
            context: this
        }), this._showerGlobal = showerGlobal, this._showerInstances = showerGlobal.getInited(), this._plugins = {}, this._instances = [], showerGlobal.events.on("init", this._onShowerInit, this)
    }
    extend(Plugins.prototype, {
        destroy: function() {
            this._showerGlobal.events.off("init", this._onShowerInit, this), this._plugins = null
        },
        add: function(name, options) {
            if (this._plugins.hasOwnProperty(name)) throw new Error("Plugin " + name + " already exist.");
            return this._requireAndAdd({
                name: name,
                options: options
            }), this
        },
        remove: function(name) {
            if (!this._plugins.hasOwnProperty(name)) throw new Error("Plugin " + name + " not found.");
            return delete this._plugins[name], this.events.emit("remove", {
                name: name
            }), this
        },
        get: function(name, shower) {
            var pluginInstance, plugin = this._plugins[name];
            if (plugin && shower)
                for (var i = 0, l = this._instances.length; i < l; i++) {
                    var instanceInfo = this._instances[i];
                    instanceInfo.plugin.name === name && instanceInfo.shower === shower && (pluginInstance = instanceInfo.instance)
                }
            return pluginInstance
        },
        _requireAndAdd: function(plugin) {
            shower.modules.require(plugin.name, function(pluginClass) {
                plugin.class = pluginClass, this._plugins[plugin.name] = plugin, this._instancePlugin(plugin)
            }.bind(this))
        },
        _instancePlugin: function(plugin) {
            this._showerInstances.forEach(function(shower) {
                this._instance(plugin, shower)
            }, this), this.events.emit("add", {
                name: plugin.name
            })
        },
        _instanceFor: function(shower) {
            for (var name in this._plugins) this._plugins.hasOwnProperty(name) && this._instance(this._plugins[name], shower)
        },
        _instance: function(plugin, shower) {
            var options = plugin.options || shower.options.get("plugin_" + plugin.name);
            this._instances.push({
                shower: shower,
                plugin: plugin,
                instance: new plugin.class(shower, options)
            })
        },
        _onShowerInit: function(event) {
            var shower = event.get("shower");
            this._instanceFor(shower)
        }
    }), provide(Plugins)
}), shower.modules.define("shower.global", ["Emitter", "Plugins"], function(provide, EventEmitter, Plugins) {
    var inited = [],
        sh = {
            ready: function(callback) {
                return callback && (inited.length ? inited.forEach(callback) : this.events.once("init", function(e) {
                    callback(e.get("shower"))
                })), Boolean(inited.length)
            },
            init: function(initOptions) {
                initOptions = initOptions || {}, shower.modules.require(["Shower"], function(Shower) {
                    new Shower(initOptions.container, initOptions.options)
                })
            },
            getInited: function() {
                return inited.slice()
            }
        };
    sh.events = new EventEmitter({
        context: sh
    }), sh.plugins = new Plugins(sh), sh.events.on("notify", function(e) {
        var showerInstance = e.get("shower");
        inited.push(showerInstance), sh.events.emit("init", e)
    }), provide(sh)
}), shower.modules.define("Options", ["Emitter", "options.Monitor", "util.Store", "util.extend", "util.inherit"], function(provide, EventEmitter, Monitor, Store, extend, inherit) {
    function Options(initOptions) {
        Options.super.constructor.apply(this, arguments), this.events = new EventEmitter
    }
    inherit(Options, Store, {
        set: function(name, value) {
            var changed = [];
            if ("string" == typeof name) Options.super.set.call(this, name, value), changed.push({
                name: name,
                value: value
            });
            else {
                var options = name || {};
                Object.keys(options).forEach(function(optionName) {
                    var optionValue = options[optionName];
                    Options.super.set.call(this, optionName, optionValue), changed.push({
                        name: optionName,
                        value: optionValue
                    })
                })
            }
            return changed.length && this.events.emit("set", {
                items: changed
            }), this
        },
        unset: function(name) {
            return Options.super.unset(this, name), this.events.emit("unset", {
                name: name
            }), this
        },
        getMonitor: function() {
            return new Monitor(this)
        }
    }), provide(Options)
}), shower.modules.define("options.Monitor", ["util.extend"], function(provide, extend) {
    function Monitor(options) {
        this._options = options, this._optionsEvents = options.events.group().on(["set", "unset"], this._onOptionsChange, this), this._fieldsHanders = {}
    }
    extend(Monitor.prototype, {
        destroy: function() {
            this._options = null, this._optionsEvents.offAll(), this._fieldsHanders = null
        },
        add: function(field, callback, context) {
            if (Array.prototype.isArray.call(null, field)) {
                var fields = field;
                for (var fieldName in fields) fields.hasOwnProperty(fieldName) && this._addHandler(fieldName, callback, context)
            } else this._addHandler(field, callback, context);
            return this
        },
        remove: function(field, callback, context) {
            if (Array.prototype.isArray.call(null, field)) {
                var fields = field;
                for (var fieldName in fields) fields.hasOwnProperty(fieldName) && this._remodeHandler(fieldName, callback, context)
            } else this._remodeHandler(field, callback, context);
            return this
        },
        getOptions: function() {
            return this._options
        },
        _onOptionsChange: function(event) {
            var fieldsUpdated = "unset" === event.get("type") ? [event.get("name")] : event.get("items");
            fieldsUpdated.forEach(function(field) {
                this._fieldsHanders.hasOwnProperty(field) && this._fieldsHanders[field].forEach(function(handler) {
                    handler.callback.call(handler.context, this._options.get(field))
                })
            }, this)
        },
        _addHandler: function(field, callback, context) {
            var handler = {
                callback: callback,
                context: context
            };
            this._fieldsHanders.hasOwnProperty(fieldName) ? this._fieldsHanders[fieldName].push(handler) : this._fieldsHanders[fieldName] = [handler]
        },
        _remodeHandler: function(field, callback, context) {
            if (!this._fieldsHanders.hasOwnProperty(field)) throw new Error("Remove undefined handler for " + field + " field");
            var fieldsHanders = this._fieldsHanders[field],
                handler = fieldsHanders.filter(function(hander) {
                    return hander.callback === callback && hander.context === context
                })[0];
            if (!hander) throw new Error("Hanlder for " + field + " not found.");
            fieldsHanders.splice(fieldsHanders.indexOf(handler, 1))
        }
    }), provide(Monitor)
}), shower.modules.define("Shower", ["Emitter", "Options", "shower.global", "shower.defaultOptions", "shower.Container", "shower.Player", "shower.Location", "shower.slidesParser", "util.extend"], function(provide, EventEmitter, Options, showerGlobal, defaultShowerOptions, Container, Player, Location, defaultSlidesParser, extend) {
    function Shower(container, options) {
        options = options || {}, this.events = new EventEmitter({
            context: this
        }), this.options = new Options({}, defaultShowerOptions, options);
        var containerElement = container || this.options.get("container_selector");
        "string" == typeof containerElement && (containerElement = document.querySelector(containerElement)), this.player = new Player(this), this.container = new Container(this, containerElement), this._slides = [], this._isHotkeysOn = !0, this._liveRegion = null, this._initSlides(), this._initLiveRegion(), this.options.get("debug_mode") && (document.body.classList.add(this.options.get("debug_mode_classname")), console.info("Debug mode on")), this.options.get("hotkeys") || this.disableHotkeys(), this.location = new Location(this), showerGlobal.events.emit("notify", {
            shower: this
        }), this._playerListeners = this.player.events.group().on("activate", this._onPlayerSlideActivate, this)
    }
    extend(Shower.prototype, {
        destroy: function() {
            this.events.emit("destroy"), this.location.destroy(), this.container.destroy(), this.player.destroy(), this._slides = []
        },
        add: function(slide) {
            if (Array.isArray.call(null, slide))
                for (var i = 0, k = slide.length; i < k; i++) this._addSlide(slide[i]);
            else this._addSlide(slide);
            return this
        },
        remove: function(slide) {
            var slidePosition;
            if ("number" == typeof slide) slidePosition = slide;
            else {
                if (this._slides.indexOf(slide) == -1) throw new Error("Slide not found");
                slidePosition = this._slides.indexOf(slide)
            }
            return slide = this._slides.splice(slidePosition, 1)[0], this.events.emit("slideremove", {
                slide: slide
            }), slide.destroy(), this
        },
        get: function(index) {
            return this._slides[index]
        },
        getSlides: function() {
            return this._slides.slice()
        },
        getSlidesCount: function() {
            return this._slides.length
        },
        getSlideIndex: function(slide) {
            return this._slides.indexOf(slide)
        },
        disableHotkeys: function() {
            return this._isHotkeysOn = !1, this
        },
        enableHotkeys: function() {
            return this._isHotkeysOn = !0, this
        },
        isHotkeysEnabled: function() {
            return this._isHotkeysOn
        },
        getLiveRegion: function() {
            return this._liveRegion
        },
        updateLiveRegion: function(content) {
            return this._liveRegion.innerHTML = content, this
        },
        _onPlayerSlideActivate: function(event) {
            var currentSlide = event.get("slide");
            this.updateLiveRegion(currentSlide.getContent())
        },
        _initSlides: function() {
            var slidesParser = this.options.get("slides_parser") || defaultSlidesParser,
                slides = slidesParser(this.container.getElement(), this.options.get("slides_selector"));
            this.add(slides)
        },
        _addSlide: function(slide) {
            slide.state.set("index", this._slides.length), this._slides.push(slide), this.events.emit("slideadd", {
                slide: slide
            })
        },
        _initLiveRegion: function() {
            var liveRegion = document.createElement("section");
            liveRegion.setAttribute("role", "region"), liveRegion.setAttribute("aria-live", "assertive"), liveRegion.setAttribute("aria-relevant", "additions"), liveRegion.setAttribute("aria-label", "Slide Content: Auto-updating"), liveRegion.className = "region", document.body.appendChild(liveRegion), this._liveRegion = liveRegion
        }
    }), provide(Shower)
}), shower.modules.define("shower.Container", ["Emitter", "util.bound", "util.extend"], function(provide, EventEmitter, bound, extend) {
    function Container(shower, containerElement) {
        this.events = new EventEmitter({
            context: this,
            parent: shower.events
        }), this._shower = shower, this._element = containerElement, this._isSlideMode = !1, this.init()
    }
    extend(Container.prototype, {
        init: function() {
            var bodyClassList = document.body.classList,
                showerOptions = this._shower.options,
                fullModeClass = showerOptions.get("mode_full_classname"),
                listModeClass = showerOptions.get("mode_list_classname");
            bodyClassList.contains(listModeClass) || bodyClassList.contains(fullModeClass) || bodyClassList.add(listModeClass), this._setupListeners()
        },
        destroy: function() {
            this._clearListeners(), this._element = null, this._shower = null, this._isSlideMode = null
        },
        getElement: function() {
            return this._element
        },
        enterSlideMode: function() {
            var bodyClassList = document.body.classList,
                showerOptions = this._shower.options;
            return bodyClassList.remove(showerOptions.get("mode_list_classname")), bodyClassList.add(showerOptions.get("mode_full_classname")), document.body.setAttribute("role", "application"), this._applyTransform(this._getTransformScale()), this._isSlideMode = !0, this.events.emit("slidemodeenter"), this
        },
        exitSlideMode: function() {
            var elementClassList = document.body.classList,
                showerOptions = this._shower.options;
            return elementClassList.remove(showerOptions.get("mode_full_classname")), elementClassList.add(showerOptions.get("mode_list_classname")), document.body.removeAttribute("role", "application"), this._applyTransform("none"), this._isSlideMode = !1, this.scrollToCurrentSlide(), this.events.emit("slidemodeexit"), this
        },
        isSlideMode: function() {
            return this._isSlideMode
        },
        scrollToCurrentSlide: function() {
            var activeSlideClassName = this._shower.options.get("slide_active_classname"),
                slideElement = this._element.querySelector("." + activeSlideClassName);
            return slideElement && window.scrollTo(0, slideElement.offsetTop), this
        },
        _setupListeners: function() {
            this._showerListeners = this._shower.events.group().on("slideadd", this._onSlideAdd, this).on("slideremove", this._onSlideRemove, this), window.addEventListener("resize", bound(this, "_onResize")), document.addEventListener("keydown", bound(this, "_onKeyDown"))
        },
        _clearListeners: function() {
            this._showerListeners.offAll(), window.removeEventListener("resize", bound(this, "_onResize")), document.removeEventListener("keydown", bound(this, "_onKeyDown"))
        },
        _getTransformScale: function() {
            var denominator = Math.max(document.body.clientWidth / window.innerWidth, document.body.clientHeight / window.innerHeight);
            return "scale(" + 1 / denominator + ")"
        },
        _applyTransform: function(transformValue) {
            ["WebkitTransform", "MozTransform", "msTransform", "OTransform", "transform"].forEach(function(property) {
                document.body.style[property] = transformValue
            })
        },
        _onResize: function() {
            this.isSlideMode() && this._applyTransform(this._getTransformScale())
        },
        _onSlideAdd: function(e) {
            var slide = e.get("slide");
            slide.events.on("click", this._onSlideClick, this)
        },
        _onSlideRemove: function(e) {
            var slide = e.get("slide");
            slide.events.off("click", this._onSlideClick, this)
        },
        _onSlideClick: function() {
            this._isSlideMode || this.enterSlideMode()
        },
        _onKeyDown: function(e) {
            if (this._shower.isHotkeysEnabled()) switch (e.which) {
                case 13:
                    if (e.preventDefault(), !this.isSlideMode() && e.metaKey) {
                        var slideNumber = e.shiftKey ? 0 : this._shower.player.getCurrentSlideIndex();
                        this._shower.player.go(slideNumber), this.enterSlideMode()
                    } else e.shiftKey ? this._shower.player.prev() : this._shower.player.next();
                    break;
                case 27:
                    e.preventDefault(), this.exitSlideMode();
                    break;
                case 116:
                    if (!this.isSlideMode() && e.shiftKey) {
                        e.preventDefault();
                        var slideNumber = this._shower.player.getCurrentSlideIndex();
                        this._shower.player.go(slideNumber), this.enterSlideMode()
                    }
                    break;
                case 80:
                    !this.isSlideMode() && e.altKey && e.metaKey && (e.preventDefault(), this.enterSlideMode())
            }
        }
    }), provide(Container)
}), shower.modules.define("shower.Location", ["util.SessionStore", "util.bound", "util.extend"], function(provide, SessionStore, bound, extend) {
    function Location(shower) {
        this._shower = shower;
        var sessionStoreKey = shower.options.get("sessionstore_key") + "-shower.Location";
        this.state = new SessionStore(sessionStoreKey, {
            isSlideMode: !1
        }), this._showerListeners = null, this._playerListeners = null, this._documentTitle = document.title, this._popStateProcess = null, this._setupListeners(), this._init()
    }
    extend(Location.prototype, {
        destroy: function() {
            this._clearListeners()
        },
        save: function() {
            this.state.set("isSlideMode", this._isSlideMode())
        },
        _init: function() {
            var slideInfo, shower = this._shower,
                currentSlideId = window.location.hash.substr(1),
                slideModeClass = shower.options.get("mode_full_classname");
            window.location.hash = "", (this.state.get("isSlideMode") || document.body.classList.contains(slideModeClass)) && shower.container.enterSlideMode(), "" !== currentSlideId && (slideInfo = this._getSlideById(currentSlideId), shower.player.go("undefined" != typeof slideInfo.index ? slideInfo.index : 0))
        },
        _setupListeners: function() {
            var shower = this._shower;
            this._playerListeners = shower.player.events.group().on("activate", this._onSlideActivate, this), this._containerListener = shower.container.events.group().on(["slidemodeenter", "slidemodeexit"], this._onContainerSlideModeChange, this), window.addEventListener("popstate", bound(this, "_onPopstate"))
        },
        _clearListeners: function() {
            window.removeEventListener("popstate", bound(this, "_onPopstate")), this._playerListeners.offAll(), this._containerListener.offAll()
        },
        _getSlideById: function(slideId) {
            for (var slide, index, slides = this._shower.getSlides(), i = slides.length - 1; i >= 0; i--)
                if (slides[i].getId() === slideId) {
                    slide = slides[i], index = i;
                    break
                }
            return {
                slide: slide,
                index: index
            }
        },
        _onSlideActivate: function(e) {
            window.location.hash = e.get("slide").getId(), this._setTitle()
        },
        _onContainerSlideModeChange: function() {
            this._setTitle(), this.save()
        },
        _isSlideMode: function() {
            return this._shower.container.isSlideMode()
        },
        _onPopstate: function() {
            var slideInfo, shower = this._shower,
                slideId = window.location.hash.substr(1),
                currentSlide = shower.player.getCurrentSlide(),
                currentSlideNumber = shower.player.getCurrentSlideIndex();
            this._isSlideMode() && currentSlideNumber === -1 ? shower.player.go(0) : currentSlideNumber === -1 && "" !== window.location.hash && shower.player.go(0), currentSlide && slideId !== currentSlide.getId() && (slideInfo = this._getSlideById(slideId), shower.player.go(slideInfo.index))
        },
        _setTitle: function() {
            var title = document.title,
                isSlideMode = this._isSlideMode(),
                currentSlide = this._shower.player.getCurrentSlide();
            if (isSlideMode && currentSlide) {
                var slideTitle = currentSlide.getTitle();
                document.title = slideTitle ? slideTitle + " — " + this._documentTitle : this._documentTitle
            } else this._documentTitle !== title && (document.title = this._documentTitle)
        }
    }), provide(Location)
}), shower.modules.define("shower.Player", ["Emitter", "util.bound", "util.extend"], function(provide, EventEmitter, bound, extend) {
    function Player(shower) {
        this.events = new EventEmitter({
            context: this,
            parent: shower.events
        }), this._shower = shower, this._showerListeners = null, this._playerListeners = null, this._currentSlideNumber = -1, this._currentSlide = null, this.init()
    }
    extend(Player.prototype, {
        init: function() {
            this._showerListeners = this._shower.events.group().on("slideadd", this._onSlideAdd, this).on("slideremove", this._onSlideRemove, this).on("slidemodeenter", this._onSlideModeEnter, this), this._playerListeners = this.events.group().on("prev", this._onPrev, this).on("next", this._onNext, this).on("prevslide", this._onPrev, this).on("nextslide", this._onNext, this), document.addEventListener("keydown", bound(this, "_onKeyDown"))
        },
        destroy: function() {
            this._showerListeners.offAll(), this._playerListeners.offAll(), document.removeEventListener("keydown", bound(this, "_onKeyDown")), this._currentSlide = null, this._currentSlideNumber = null, this._shower = null
        },
        next: function() {
            return this.events.emit("next"), this
        },
        prev: function() {
            return this.events.emit("prev"), this
        },
        nextSlide: function() {
            return this.events.emit("nextslide"), this
        },
        prevSlide: function() {
            return this.events.emit("prevslide"), this
        },
        first: function() {
            return this.go(0), this
        },
        last: function() {
            return this.go(this._shower.getSlidesCount() - 1), this
        },
        go: function(index) {
            "number" != typeof index && (index = this._shower.getSlideIndex(index));
            var slidesCount = this._shower.getSlidesCount(),
                currentSlide = this._currentSlide;
            return index != this._currentSlideNumber && index < slidesCount && index >= 0 && (currentSlide && currentSlide.isActive() && currentSlide.deactivate(), currentSlide = this._shower.get(index), this._currentSlide = currentSlide, this._currentSlideNumber = index, currentSlide.isActive() || currentSlide.activate(), this.events.emit("activate", {
                index: index,
                slide: currentSlide
            })), this
        },
        getCurrentSlide: function() {
            return this._currentSlide
        },
        getCurrentSlideIndex: function() {
            return this._currentSlideNumber
        },
        _onPrev: function() {
            this._changeSlide(this._currentSlideNumber - 1)
        },
        _onNext: function() {
            this._changeSlide(this._currentSlideNumber + 1)
        },
        _changeSlide: function(index) {
            this.go(index)
        },
        _onSlideAdd: function(e) {
            var slide = e.get("slide");
            slide.events.on("activate", this._onSlideActivate, this)
        },
        _onSlideRemove: function(e) {
            var slide = e.get("slide");
            slide.events.off("activate", this._onSlideActivate, this)
        },
        _onSlideActivate: function(e) {
            var slide = e.get("slide"),
                slideNumber = this._shower.getSlideIndex(slide);
            this.go(slideNumber)
        },
        _onKeyDown: function(e) {
            if (this._shower.isHotkeysEnabled() && !/^(?:button|input|select|textarea)$/i.test(e.target.tagName)) {
                this.events.emit("keydown", {
                    event: e
                });
                var action, allowModifiers = !1;
                switch (e.which) {
                    case 33:
                    case 38:
                    case 37:
                    case 72:
                    case 75:
                    case 80:
                        action = e.shiftKey ? "prevSlide" : "prev";
                        break;
                    case 34:
                    case 40:
                    case 39:
                    case 76:
                    case 74:
                    case 78:
                        action = e.shiftKey ? "nextSlide" : "next";
                        break;
                    case 36:
                        allowModifiers = !0, action = "first";
                        break;
                    case 35:
                        allowModifiers = !0, action = "last";
                        break;
                    case 32:
                        this._shower.container.isSlideMode() && (action = e.shiftKey ? "prev" : "next")
                }!action || !allowModifiers && (e.altKey || e.ctrlKey || e.metaKey) || (e.preventDefault(), this[action]())
            }
        },
        _onSlideModeEnter: function() {
            this._currentSlide || this.go(0)
        }
    }), provide(Player)
}), shower.modules.define("shower.defaultOptions", function(provide, slidesParser) {
    provide({
        container_selector: ".shower",
        debug_mode: !1,
        debug_mode_classname: "debug",
        hotkeys: !0,
        sessionstore_key: "shower",
        slides_selector: ".shower .slide",
        mode_full_classname: "full",
        mode_list_classname: "list",
        slide_title_element_selector: "H2",
        slide_active_classname: "active",
        slide_visited_classname: "visited"
    })
}), shower.modules.define("shower.slidesParser", ["Slide"], function(provide, Slide) {
    function parse(containerElement, cssSelector) {
        var slidesElements = containerElement.querySelectorAll(cssSelector);
        return slidesElements = Array.prototype.slice.call(slidesElements), slidesElements.map(function(slideElement, index) {
            var slide = new Slide(slideElement);
            return slideElement.id || (slideElement.id = index + 1), slide
        })
    }
    provide(parse)
}), shower.modules.define("Slide", ["shower.defaultOptions", "Emitter", "Options", "slide.Layout", "slide.layoutFactory", "util.Store", "util.extend"], function(provide, defaultOptions, EventEmitter, OptionsManager, Layout, slideLayoutFactory, DataStore, extend) {
    function Slide(content, options, state) {
        this.events = new EventEmitter, this.options = new OptionsManager(options), this.layout = null, this.state = new DataStore({
            visited: 0,
            index: null
        }, state), this._content = content, this._isVisited = this.state.get("visited") > 0, this._isActive = !1, this.init()
    }
    extend(Slide.prototype, {
        init: function() {
            this.layout = "string" == typeof this._content ? new slideLayoutFactory.createLayout({
                    content: this._content
                }) : new Layout(this._content, this.options), this.layout.setParent(this),
                this._setupListeners()
        },
        destroy: function() {
            this._clearListeners(), this._isActive = null, this.options = null, this.layout.destroy()
        },
        activate: function() {
            this._isActive = !0;
            var visited = this.state.get("visited");
            return this.state.set("visited", ++visited), this.events.emit("activate", {
                slide: this
            }), this
        },
        deactivate: function() {
            return this._isActive = !1, this.events.emit("deactivate", {
                slide: this
            }), this
        },
        isActive: function() {
            return this._isActive
        },
        isVisited: function() {
            return this.state.get("visited") > 0
        },
        getTitle: function() {
            return this.layout.getTitle()
        },
        setTitle: function(title) {
            return this.layout.setTitle(title), this
        },
        getId: function() {
            return this.layout.getElement().id
        },
        getContent: function() {
            return this.layout.getContent()
        },
        _setupListeners: function() {
            this.layoutListeners = this.layout.events.group().on("click", this._onSlideClick, this)
        },
        _clearListeners: function() {
            this.layoutListeners.offAll()
        },
        _onSlideClick: function() {
            this.activate(), this.events.emit("click", {
                slide: this
            })
        }
    }), provide(Slide)
}), shower.modules.define("slide.Layout", ["Options", "shower.defaultOptions", "Emitter", "util.bound", "util.extend"], function(provide, OptionsManager, defaultOptions, EventEmitter, bound, extend) {
    function Layout(element, options) {
        this.options = new OptionsManager({
            title_element_selector: defaultOptions.slide_title_element_selector,
            active_classname: defaultOptions.slide_active_classname,
            visited_classname: defaultOptions.slide_visited_classname
        }, options), this.events = new EventEmitter, this._element = element, this._parent = null, this._parentElement = null, this.init()
    }
    extend(Layout.prototype, {
        init: function() {
            var parentNode = this._element.parentNode;
            parentNode ? this._parentElement = parentNode : this.setParentElement(parentNode)
        },
        destroy: function() {
            this.setParent(null)
        },
        setParent: function(parent) {
            this._parent != parent && (this._clearListeners(), this._parent = parent, this._parent && this._setupListeners(), this.events.emit("parentchange", {
                parent: parent
            }))
        },
        getParent: function() {
            return this._parent
        },
        setParentElement: function(parentElement) {
            parentElement != this._parentElement && (this._parentElement = parentElement, parentElement.appendChild(this._element), this.events.emit("parentelementchange", {
                parentElement: parentElement
            }))
        },
        getParentElement: function() {
            return this._parentElement
        },
        getElement: function() {
            return this._element
        },
        setTitle: function(title) {
            var titleElementSelector = this.options.get("title_element_selector"),
                titleElement = this._element.querySelector(titleElementSelector);
            titleElement ? titleElement.innerHTML = title : (titleElement = document.createElement(titleElementSelector), titleElement.innerHTML = title, this._element.insertBefore(titleElement, this._element.firstChild))
        },
        getTitle: function() {
            var titleElementSelector = this.options.get("title_element_selector"),
                titleElement = this._element.querySelector(titleElementSelector);
            return titleElement ? titleElement.textContent : null
        },
        getData: function(name) {
            var element = this._element;
            return element.dataset ? element.dataset[name] : element.getAttribute("data-" + name)
        },
        getContent: function() {
            return this._element.innerHTML
        },
        _setupListeners: function() {
            this._slideListeners = this._parent.events.group().on("activate", this._onSlideActivate, this).on("deactivate", this._onSlideDeactivate, this), this._element.addEventListener("click", bound(this, "_onSlideClick"), !1)
        },
        _clearListeners: function() {
            this._slideListeners && this._slideListeners.offAll(), this._element.removeEventListener("click", bound(this, "_onSlideClick"))
        },
        _onSlideActivate: function() {
            this._element.classList.add(this.options.get("active_classname"))
        },
        _onSlideDeactivate: function() {
            var elementClassList = this._element.classList;
            elementClassList.remove(this.options.get("active_classname")), elementClassList.add(this.options.get("visited_classname"))
        },
        _onSlideClick: function() {
            this.events.emit("click")
        }
    }), provide(Layout)
}), shower.modules.define("slide.layoutFactory", ["slide.Layout", "util.extend"], function(provide, SlideLayout, extend) {
    var layoutFactory = {};
    extend(layoutFactory, {
        createLayout: function(parameters) {
            parameters = parameters || {};
            var element = layoutFactory._createElement(extend({
                content: "",
                contentType: "slide"
            }, parameters));
            return new SlideLayout(element)
        },
        _createElement: function(options) {
            var element = document.createElement("section");
            return element.innerHTML = options.content, element.classList.add(options.contentType), element
        }
    }), provide(layoutFactory)
}), shower.modules.define("util.SessionStore", ["util.Store", "util.inherit"], function(provide, Store, inherit) {
    function SessionStore(storeKey, initData) {
        this._storageKey = storeKey;
        var data = this._loadFromStorage() || initData;
        SessionStore.super.constructor.call(this, data)
    }
    inherit(SessionStore, Store, {
        set: function(key, value) {
            SessionStore.super.set.call(this, key, value), this._saveToStorage()
        },
        unset: function(key) {
            SessionStore.super.unset.call(this, key), this._saveToStorage()
        },
        _saveToStorage: function() {
            window.sessionStorage.setItem(this._storageKey, JSON.stringify(this.getAll()))
        },
        _loadFromStorage: function() {
            var store = window.sessionStorage.getItem(this._storageKey);
            return store && JSON.parse(store)
        }
    }), provide(SessionStore)
}), shower.modules.define("util.Store", ["util.extend"], function(provide, extend) {
    function Store(initData) {
        this._data = initData || {};
        for (var i = 1, k = arguments.length; i < k; i++) extend(this._data, arguments[i] || {})
    }
    extend(Store.prototype, {
        get: function(key, defaultValue) {
            return this._data.hasOwnProperty(key) ? this._data[key] : defaultValue
        },
        getAll: function() {
            return extend({}, this._data)
        },
        set: function(key, value) {
            return this._data[key] = value, this
        },
        unset: function(key) {
            if (!this._data.hasOwnProperty(key)) throw new Error(key + " not found.");
            return delete this._data[key], this
        },
        destroy: function() {
            this._data = {}
        }
    }), provide(Store)
}), shower.modules.define("util.bound", function(provide) {
    function bound(ctx, fn) {
        return ctx["__bound_" + fn] || (ctx["__bound_" + fn] = ctx[fn].bind(ctx))
    }
    provide(bound)
}), shower.modules.define("util.extend", function(provide) {
    function extend(target) {
        if (!target) throw new Error("util.extend: Target not found");
        return "undefined" == typeof Object.assign ? polyfill.apply(null, arguments) : Object.assign.apply(null, arguments)
    }

    function polyfill(target) {
        for (var i = 1, l = arguments.length; i < l; i++) {
            var obj = arguments[i];
            for (var property in obj) obj.hasOwnProperty(property) && (target[property] = obj[property])
        }
        return target
    }
    provide(extend)
}), shower.modules.define("util.inherit", ["util.extend"], function(provide, extend) {
    var inherit = function(childClass, parentClass, override) {
        return childClass.prototype = Object.create(parentClass.prototype), childClass.prototype.constructor = childClass, childClass.super = parentClass.prototype, childClass.super.constructor = parentClass, override && extend(childClass.prototype, override), childClass.prototype
    };
    provide(inherit)
}), shower.modules.define("shower-next", ["shower", "Emitter", "util.extend"], function(provide, globalShower, EventEmitter, extend) {
    function Next(shower, options) {
        options = options || {}, this.events = new EventEmitter({
            context: this
        }), this._shower = shower, this._elementsSelector = options.selector || DEFAULT_SELECTOR, this._elements = [], this._innerComplete = 0, this._setupListeners(), this._shower.player.getCurrentSlideIndex() != -1 && this._onSlideActivate()
    }
    var TIMER_PLUGIN_NAME = "shower-timer",
        DEFAULT_SELECTOR = ".next";
    extend(Next.prototype, {
        destroy: function() {
            this._clearListeners(), this._elements = null, this._elementsSelector = null, this._innerComplete = null, this._shower = null
        },
        next: function() {
            if (!this._elements.length) throw new Error("Inner nav elements not found.");
            return this._innerComplete++, this._go(), this.events.emit("next"), this
        },
        prev: function() {
            if (!this._elements.length) throw new Error("Inner nav elements not found.");
            return this._innerComplete--, this._go(), this.events.emit("prev"), this
        },
        getLength: function() {
            return this._elements = this._getElements(), this._elements.length
        },
        getComplete: function() {
            return this._innerComplete
        },
        _setupListeners: function() {
            var shower = this._shower;
            this._showerListeners = shower.events.group().on("destroy", this.destroy, this), this._playerListeners = shower.player.events.group().on("activate", this._onSlideActivate, this).on("next", this._onNext, this).on("prev", this._onPrev, this);
            var timerPlugin = globalShower.plugins.get(TIMER_PLUGIN_NAME, shower);
            timerPlugin ? this._setupTimerPluginListener(timerPlugin) : this._pluginsListeners = globalShower.plugins.events.group().on("add", function(e) {
                e.get("name") === TIMER_PLUGIN_NAME && (this._setupTimerPluginListener(), this._pluginsListeners.offAll())
            }, this)
        },
        _setupTimerPluginListener: function(plugin) {
            if (!plugin) {
                globalShower.plugins.get(TIMER_PLUGIN_NAME, this._shower)
            }
            plugin.events.on("next", this._onNext, this, 100)
        },
        _clearListeners: function() {
            this._showerListeners.offAll(), this._playerListeners.offAll(), this._pluginsListeners && this._pluginsListeners.offAll()
        },
        _getElements: function() {
            var slideLayout = this._shower.player.getCurrentSlide().layout,
                slideElement = slideLayout.getElement();
            return Array.prototype.slice.call(slideElement.querySelectorAll(this._elementsSelector))
        },
        _onNext: function(e) {
            var elementsLength = this._elements.length,
                isSlideMode = this._shower.container.isSlideMode();
            isSlideMode && elementsLength && this._innerComplete < elementsLength && (e.preventDefault(), this.next())
        },
        _onPrev: function(e) {
            var elementsLength = this._elements.length,
                completed = (this._shower.container.isSlideMode(), this._innerComplete);
            elementsLength && completed < elementsLength && completed > 0 && (e.preventDefault(), this.prev())
        },
        _go: function() {
            for (var i = 0, k = this._elements.length; i < k; i++) {
                var element = this._elements[i];
                i < this._innerComplete ? element.classList.add("active") : element.classList.remove("active")
            }
        },
        _onSlideActivate: function() {
            this._elements = this._getElements(), this._innerComplete = this._getInnerComplete()
        },
        _getInnerComplete: function() {
            return this._elements.filter(function(element) {
                return element.classList.contains("active")
            }).length
        }
    }), provide(Next)
}), shower.modules.require(["shower"], function(sh) {
    sh.plugins.add("shower-next")
}), shower.modules.define("shower-progress", ["util.extend"], function(provide, extend) {
    function Progress(shower, options) {
        options = options || {}, this._shower = shower, this._playerListeners = null, this._element = null, this._elementSelector = options.selector || ".progress";
        var showerContainerElement = this._shower.container.getElement();
        this._element = showerContainerElement.querySelector(this._elementSelector), this._element && (this._setupListeners(), this._element.setAttribute("role", "progressbar"), this._element.setAttribute("aria-valuemin", "0"), this._element.setAttribute("aria-valuemax", "100"), this.updateProgress())
    }
    extend(Progress.prototype, {
        destroy: function() {
            this._clearListeners(), this._shower = null
        },
        updateProgress: function() {
            var slidesCount = this._shower.getSlidesCount(),
                currentSlideNumber = this._shower.player.getCurrentSlideIndex(),
                currentProgressValue = 100 / (slidesCount - 1) * currentSlideNumber;
            this._element && (this._element.style.width = currentProgressValue.toFixed(2) + "%", this._element.setAttribute("aria-valuenow", currentProgressValue.toFixed()), this._element.setAttribute("aria-valuetext", "Slideshow Progress: " + currentProgressValue.toFixed() + "%"))
        },
        _setupListeners: function() {
            var shower = this._shower;
            this._showerListeners = shower.events.group().on("destroy", this.destroy, this), this._playerListeners = shower.player.events.group().on("activate", this._onSlideChange, this)
        },
        _clearListeners: function() {
            this._showerListeners && this._showerListeners.offAll(), this._playerListeners && this._playerListeners.offAll()
        },
        _onSlideChange: function() {
            this.updateProgress()
        }
    }), provide(Progress)
}), shower.modules.require(["shower"], function(sh) {
    sh.plugins.add("shower-progress")
}), shower.modules.define("shower-timer", ["shower", "Emitter", "util.extend"], function(provide, showerGlobal, EventEmitter, extend) {
    function Timer(shower) {
        this.events = new EventEmitter, this._shower = shower, this._timer = null, this._showerListeners = null, this._playerListeners = null, this._pluginsListeners = null, this._setupListeners()
    }
    var PLUGIN_NAME_NEXT = "shower-next";
    extend(Timer.prototype, {
        destroy: function() {
            this._clearTimer(), this._clearListeners(), this._shower = null
        },
        run: function(timing) {
            this._initTimer(timing)
        },
        stop: function() {
            this._clearTimer()
        },
        _setupListeners: function() {
            var shower = this._shower;
            this.events.on("next", this._onNext, this), this._showerListeners = shower.events.group().on("destroy", this.destroy, this), this._playerListeners = shower.player.events.group().on("keydown", this._clearTimer, this).on("activate", this._onSlideActivate, this), this._nextPlugin = showerGlobal.plugins.get(PLUGIN_NAME_NEXT, shower), this._nextPlugin || (this._pluginsListeners = shower.plugins.events.group().on("pluginadd", function(e) {
                e.get("name") === PLUGIN_NAME_NEXT && (this._nextPlugin = shower.plugins.get(PLUGIN_NAME_NEXT), this._pluginsListeners.offAll())
            }, this)), shower.player.getCurrentSlideIndex() != -1 && this._onSlideActivate()
        },
        _clearListeners: function() {
            this._showerListeners.offAll(), this._playerListeners.offAll()
        },
        _onSlideActivate: function() {
            this._clearTimer();
            var currentSlide = this._shower.player.getCurrentSlide();
            if (this._shower.container.isSlideMode() && currentSlide.state.get("visited") < 2) {
                var timing = currentSlide.layout.getData("timing");
                timing && /^(\d{1,2}:)?\d{1,3}$/.test(timing) && (timing.indexOf(":") !== -1 ? (timing = timing.split(":"), timing = 1e3 * (60 * parseInt(timing[0], 10) + parseInt(timing[1], 10))) : timing = 1e3 * parseInt(timing, 10), 0 !== timing && this._initTimer(timing))
            }
        },
        _initTimer: function(timing) {
            var events = this.events,
                nextPlugin = (this._shower, this._nextPlugin);
            nextPlugin && nextPlugin.getLength() && nextPlugin.getLength() != nextPlugin.getComplete() && (timing /= nextPlugin.getLength() + 1), this._timer = setInterval(function() {
                events.emit("next")
            }, timing)
        },
        _clearTimer: function() {
            this._timer && (clearInterval(this._timer), this._timer = null)
        },
        _onNext: function() {
            this._clearTimer(), this._shower.player.next()
        }
    }), provide(Timer)
}), shower.modules.require(["shower"], function(sh) {
    sh.plugins.add("shower-timer")
}), shower.modules.define("shower-touch", ["util.extend"], function(provide, extend) {
    function Touch(shower, options) {
        options = options || {}, this._shower = shower, this._setupListeners()
    }
    var INTERACTIVE_ELEMENTS = ["VIDEO", "AUDIO", "A", "BUTTON", "INPUT"];
    extend(Touch.prototype, {
        destroy: function() {
            this._clearListeners(), this._shower = null
        },
        _setupListeners: function() {
            var shower = this._shower;
            this._showerListeners = shower.events.group().on("add", this._onSlideAdd, this), this._bindedTouchStart = this._onTouchStart.bind(this), this._bindedTouchMove = this._onTouchMove.bind(this), this._shower.getSlides().forEach(this._addTouchStartListener, this), document.addEventListener("touchmove", this._bindedTouchMove, !0)
        },
        _clearListeners: function() {
            this._showerListeners.offAll(), this._shower.getSlides().forEach(this._removeTouchStartListener, this), document.removeEventListener("touchmove", this._bindedTouchMove, !1)
        },
        _onSlideAdd: function(event) {
            var slide = event.get("slide");
            this._addTouchStartListener(slide)
        },
        _addTouchStartListener: function(slide) {
            var element = slide.layout.getElement();
            element.addEventListener("touchstart", this._bindedTouchStart, !1)
        },
        _removeTouchStartListener: function(slide) {
            var element = slide.layout.getElement();
            element.removeEventListener("touchstart", this._bindedTouchStart, !1)
        },
        _onTouchStart: function(e) {
            var x, shower = this._shower,
                isSlideMode = shower.container.isSlideMode(),
                element = e.target,
                slide = this._getSlideByElement(e.currentTarget);
            slide && (isSlideMode && !this._isInteractiveElement(element) && (e.preventDefault(), x = e.touches[0].pageX, x > window.innerWidth / 2 ? shower.player.next() : shower.player.prev()), isSlideMode || slide.activate())
        },
        _onTouchMove: function(e) {
            this._shower.container.isSlideMode() && e.preventDefault()
        },
        _getSlideByElement: function(element) {
            for (var slides = this._shower.getSlides(), result = null, i = 0, k = slides.length; i < k; i++)
                if (element.id === slides[i].getId()) {
                    result = this._shower.get(i);
                    break
                }
            return result
        },
        _isInteractiveElement: function(element) {
            return INTERACTIVE_ELEMENTS.some(function(elName) {
                return elName === element.tagName
            })
        }
    }), provide(Touch)
}), shower.modules.require(["shower"], function(sh) {
    sh.plugins.add("shower-touch")
});