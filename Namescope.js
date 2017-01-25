// Part of the Boomstick.js Package
// Main $boomStick object instantiation

// Called this namescope to not confuse it with the namespace scope
var $$NameScopeService = (function () {
    'use strict';
    var seqIdentifier = 0;
    
    // Definition of the object
    // $$ followed by a name is an object
    // $ followed by a name is a callable function
    // __ followed by a name is an internal (private) object / function that shouldn't be referenced outside of this context
    var $$ScopeObject = function (parent, id) {
        this.$$watchers = [];
        this.$$subscriptions = [];
        this.$$injections = {};
        this.$$factory = {};
        this.$$service = {};
        this.$$models = [];
        this.$$children = [];
        this.$$namespace = {};
        this.$$parent = parent;
        this.$$id = id || 0;
        this.$$ns = '$';
    }

    // Setup a watch on a model
    $$ScopeObject.prototype.$watch = function (exp, fn) {
        // Add to collection of watchers - barely implemented.
        // TODO: Check if the model to watch exists and implement last / dirty / pristine / init
        this.$$watchers.push({ exp: exp, fn: fn, last: this[exp], dirty: false, pristine: true, init: false });
    };

    // Bind a model to a scope / namespace, if the model is modified it will trigger an automatic digest to those who are watching the model
    $$ScopeObject.prototype.$bindModel = function (exp, modelName, modelScope) {
        var nObj = { exp: exp, modelName: modelName, modelScope: modelScope };

        // Check to see if the model already exists due to a digest, if so, use it instead.
        var exists = this.$$models.filter(function (model) {
            return model.modelName == nObj.modelName;
        });
        if (exists.length > 0) {
            nObj = exists[0];
            nObj.exp = exp;
            nObj.modelScope = modelScope;
        } else {
            // TODO: refactor, support more elements.
            Object.defineProperty(nObj, '$$Model', {
                get: function () {
                    if (this.exp instanceof HTMLInputElement) {
                        return this.exp.getAttribute('type').toLowerCase() == 'checkbox' ? this.exp.checked : this.exp.value;
                    }
                    return this.exp.getAttribute('value');
                },
                set: function (value) {
                    this.modelScope[this.modelName] = value;
                    if (this.exp instanceof HTMLInputElement) {
                        if (this.exp.getAttribute('type').toLowerCase() == 'checkbox'){
                            this.exp.checked = value;
                        } else {
                            this.exp.value = value;
                        }   
                    } else {
                        this.exp.setAttribute('value', value);
                        this.exp.innerHTML = value;
                    }
                    this.modelScope.$$watcher.$digest(this.exp);
                }
            });
            // Add to collection of models
            this.$$models.push(nObj);
        }
        return nObj;
    };

    // Create new watcher, append it to the namescope
    $$ScopeObject.prototype.$new = function (ns) {
        seqIdentifier++;
        var obj = new $$ScopeObject(this, seqIdentifier);
        obj.$$ns = ns || this.$$ns;
        this.$$children.push(obj);
        return obj;
    };

    // TODO: Needs serious work.
    $$ScopeObject.prototype.$digest = function (source) {
        var scope = this;
        this.$$watchers.forEach(function (watcher, idx) {
            watcher.fn(source, watcher);
        });
    };

    // Encapsulates a set of controllers into it's own environment
    // @appName      - the name of the namespace you want to create, if it exists already it will return the existing namespace object, not replace it.
    // @dependencies - array of dependencies that are required immediately, factories are idempotent during this phase, so they are initialized once per namespace,
    //                 requesting the same factory more than once will not replace it. This allows them to be sharable / reference-able within the namespace.
    $$ScopeObject.prototype.$namespace = function (appName, dependencies) {
        // if dependencies are available, inject them into the namespace from the base namespace
        if (this.$$namespace[appName] === undefined) {
            Object.defineProperty(this.$$namespace, appName, {
                writable: false,
                enumerable: true,
                value: this.$new(appName)
            });
            // ------------------------------------------------
            // Add default injections
            // TODO: Put this somewhere else, make configurable
            // ------------------------------------------------
            var thisRef = this, ns = this.$$namespace[appName];
            ['delimiters', 'Q', 'window', 'baseURL', '$t'].forEach(function (str) {
                ns.$register(str, thisRef.$$injections[str]);
            });
            ns.$register('$$ns', ns);
            // ------------------------------------------------
        }
        var ns = this.$$namespace[appName];
        if (dependencies !== undefined && dependencies instanceof Array)
            for (var x = 0; x < dependencies.length; x++) {
                if (this.$$injections[dependencies[x]] !== undefined) {
                    ns.$register(dependencies[x], this.$$injections[dependencies[x]]);
                } else if (this.$$factory[dependencies[x]] !== undefined) {
                    ns.$register(dependencies[x], this.$inject.apply(ns, this.$$factory[dependencies[x]]));
                } else if (this.$$service[dependencies[x]] !== undefined) {
                    ns.$register(dependencies[x], this.$$service[dependencies[x]](ns));
                } else {
                    ns.$register(dependencies[x], undefined);
                }
            }
        return this.$$namespace[appName];
    };
    
    // Subscribe to a broadcast within a namespace
    // @fnName - Event name to subscribe to
    // @callback - Function to execute when a broadcast is triggered
    $$ScopeObject.prototype.$subscribe = function (fnName, callback) {
        this.$$subscriptions.push({ fn: fnName, callback: callback });
    };
    
    // Broadcasts an event to subscribers within the namespace only.
    // @fnName - Event name
    // @result - Data to submit to each subscriber
    $$ScopeObject.prototype.$broadcast = function (fnName, result) {
        var scope = this;
        this.$$subscriptions.filter(function (scrip) {
            return scrip.fn === fnName;
        }).forEach(function (scrip, idx) {
            scrip.callback.call(scrip, result);
        });
    };
    
    // New function / object that can be executed immediately or injected into another function / object
    // @fnName - Unique name of a injectable function
    // @fn     - Array of injectable names, final indexed item is executable function
    $$ScopeObject.prototype.$register = function (fnName, fn) {
        if (this.$$injections[fnName] === undefined)
            Object.defineProperty(this.$$injections, fnName, {
                writable: false,
                enumerable: true,
                value: fn
            });
        return this;
    };
    
    // New instance when injected, can be dependent on a single-instance service (must already exist)
    // @fnName - Unique name of an injectable factory-style function
    // @fnArr  - Array of injectable names, final indexed item is executable function
    $$ScopeObject.prototype.$registerFactory = function (fnName, fnArr) {
        if (this.$$factory[fnName] === undefined)
            Object.defineProperty(this.$$factory, fnName, {
                writable: false,
                enumerable: true,
                value: fnArr
            });
        return this;
    };
    
    // Single instance per namespace, cannot have dependencies (top level object)
    // @fnName - Unique name of an injectable factory-style function
    // @fn     - Function, first argument is always / only the namespace scope object
    $$ScopeObject.prototype.$registerService = function (fnName, fn) {
        if (this.$$service[fnName] === undefined)
            Object.defineProperty(this.$$service, fnName, {
                writable: false,
                enumerable: true,
                value: fn
            });
        return this;
    };
    
    // Helper/Debug function to return a factory, not needed in normal use
    // @fnName - Registered factory name
    $$ScopeObject.prototype.$getFactory = function (fnName) {
        return this.$$factory[fnName];
    };
    
    // Executes a function by injecting dependencies into it; dependency must be loaded first, does not defer.
    // Expected arguments:
    // 1. List of injectable objects by name (string)
    // 2. Final argument is the function to inject the objects into.
    // Example - MyNamespace.$inject('Q', function (Q) { return; } ); -- inject Q (from namespace) into the function.
    $$ScopeObject.prototype.$inject = function () {
        var args = Array.prototype.slice.call(arguments).slice(0, arguments.length - 1);
        var finalargs = [];
        if (args === undefined)
            return arguments[0]();
        for (var a in args) {
            if (this.$$injections.hasOwnProperty(args[a])) {
                finalargs.push(this.$$injections[args[a]]);
            } else if (this.$$factory.hasOwnProperty(args[a])) {
                finalargs.push(this.$inject.apply(this, this.$$factory[args[a]]));
            } else if (this.$$service.hasOwnProperty(args[a])) {
                finalargs.push(this.$$service[args[a]](this));
            } else {
                finalargs.push(undefined);
            }
        }
        return arguments[arguments.length - 1].apply(null, finalargs);
    };
    return $$ScopeObject;
})();

// Main Object - used to configure / start an application
var $boomStick = new $$NameScopeService();