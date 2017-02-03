// jshint esversion: 6
(function () {
    'use strict';

    $boomStick.$register("$t",
        $boomStick.$inject('$delimiters', '$baseURL', '$TemplateCache', '$dom', '$mustache', '$utils', function (delimiters, baseURL, $TemplateCache, $dom, $mustache, $utils) {
            
            return function (share, templateName, options, $$ns) {

                const compiler = {
                    
                    $$Scope: share,
                    $$NameSpace: $$ns === undefined ? $boomStick.$new() : $$ns,
                    
                    __targetSelector: null,
                    __templateIdentity: null,
                    __internalScopedObj: null,

                    locators: {},
                    targetElements: null,
                    template: '',

                    cleanSelector: function(sel){
                        return sel.replace(/([#])([0-9])/g, "\$1\\3\$2 ");
                    },

                    // Bind this appliance to the scope / controller
                    bind: function (scopedName, templateSelector, targetSelector) {
                        this.__targetSelector = targetSelector instanceof HTMLElement ? targetSelector : 
                                                this.cleanSelector(targetSelector);
                        this.__internalScopedObj = scopedName;
                        
                        let promise = null;
                        const thisRef = this;                        
                        
                        if (templateSelector.hasOwnProperty('url')) {
                            
                            // Download the template and store it.
                            promise = new Promise(function(resolve, reject){
                                $TemplateCache.$get(baseURL + templateSelector.url).then(function (data) {
                                    thisRef.template = data;
                                    resolve(thisRef);
                                });
                            });

                        } else if (templateSelector.hasOwnProperty('code')) {
                            
                            // Template is in object
                            this.template = templateSelector.code;
                            promise = Promise.resolve(this);

                        } else {
                            
                            // Template is in template script tag.
                            // Remove reference to hard-coded "document" object.
                            this.template = document.querySelector(this.cleanSelector(templateSelector)).innerHTML;
                            promise = Promise.resolve(this);

                        }
                        return promise;
                    },

                    // This only processes on a text-node, very limited
                    iterateTextNodes: function (element, action, scope) {
                        if (element === undefined || element === null || element.childNodes === null || element.childNodes.length === 0)
                            return;
                        for (let x = 0; x < element.childNodes.length; x++)
                            if (element.childNodes[x] instanceof Text)
                                action.call(scope, element.childNodes[x], x);
                            else
                                this.iterateTextNodes(element.childNodes[x], action, scope);
                    },

                    // Add internal values to the scope object list. Automatically "dirty" the objects so they are rendered (dirty triggers a digest cycle.)
                    index: function (dirty) {
                        const indexedData = this.$$Scope[this.__internalScopedObj].map(function (obj, idx) {
                            obj.$$index = idx;
                            obj.$$dirty = dirty || true;
                            obj.$$deleted = false;
                            return obj;
                        });
                        this.$$Scope[this.__internalScopedObj].splice(0);
                        Array.prototype.push.apply(this.$$Scope[this.__internalScopedObj], indexedData);
                        return this;
                    },

                    // TODO: refactor
                    apply: function (preLinkFn, postLinkFn) {

                        const data = this.$$Scope[this.__internalScopedObj], 
                              thisRef = this;
                        let locs = this.locators[this.__internalScopedObj];

                        if (locs === undefined)
                            locs = this.locators[this.__internalScopedObj] = [];

                        const indexedData = data.filter(function (result) {
                            
                            // Remove deleted objects from the render cycle
                            return !result.$$deleted;
                        
                        }).map(function (result, idx) {
                            
                            // This should be removed, it's not a good idea.
                            if (result.$$index !== idx) {
                                result.$$index = idx;
                                result.$$dirty = true;
                            }
                            
                            // Only modify this object if it's dirty, otherwise the state hasn't changed so it does not need processed.
                            if (result.$$dirty) {
                                // Get the template and wrap it for browser compatibility.
                                const s = thisRef.template,                                    
                                      rowScope = result; // data for the current object being processed
                                
                                let t = $utils.wrapMap(s.trim()); // this is the adjusted template HTML represented as elements

                                // Because templates are processed on a set (array of objects), they need to be kept track of by using a specially named comment to differentiate between them.
                                const loc = locs[idx], repeaterId = thisRef.__internalScopedObj + " repeater"; // refactor this into a function that creates a repeater comment value
                                if (loc !== undefined) {
                                    // Build list of elements to remove, and then remove them from the DOM (they will be rebuilt)
                                    const removeList = [];
                                    let curr = loc.previousSibling;
                                    while (curr !== null) {
                                        if (curr.nodeType === Node.COMMENT_NODE && curr.nodeValue === repeaterId) {
                                            curr = null;
                                        } else {
                                            removeList.push(curr);
                                            curr = curr.previousSibling;
                                        }
                                    }
                                    removeList.forEach(function (el) {
                                        if (el.parentNode)
                                            el.parentNode.removeChild(el);
                                    });
                                }

                                // Each object has it's own watcher
                                if (rowScope.$$watcher === undefined)
                                    rowScope.$$watcher = thisRef.$$NameSpace.$new();

                                // Everything is treated as an array, single elements aren't collections so it's faked.
                                if (!(t instanceof HTMLCollection))
                                    t = [t];

                                // Pre-link Function, modification of the template can happen prior to evaluating the template's scope variables
                                preLinkFn(t); // arguments are the template elements

                                // Find textnode-based bindings and decompose into observed values
                                const nodeFn = (obj, idx) => { 
                                    obj.nodeValue = $mustache(obj.nodeValue, result, thisRef.$$Scope);
                                };
                                for (let x = 0; x < t.length; x++)
                                    thisRef.iterateTextNodes(t[x], nodeFn, thisRef);
                                
                                // Replace in place or add to the target element.
                                const target = thisRef.__targetSelector instanceof HTMLElement ? thisRef.__targetSelector : document.querySelector(thisRef.__targetSelector); // only allow this be attached to one element
                                
                                // If the location comment element exists, reuse it, otherwise create a new one
                                if (loc !== undefined) {
                                    if (!rowScope.$$deleted) { // doesn't appear that this should ever be false, need to refactor
                                        
                                        // TODO: Refactor, this is identical code to below in the else statement.
                                        // Process the template with dom library
                                        let w = t.length, fragment = document.createDocumentFragment();
                                        while (w-- > 0) {
                                            let c = fragment.appendChild(t[0]);
                                            $dom(null, c).register(rowScope, thisRef).decompose();
                                        }
                                        if (loc.parentElement)
                                            loc.parentElement.insertBefore(fragment, loc);
                                        else 
                                            loc.parentNode.insertBefore(fragment, loc);

                                    } else {
                                        
                                        // remove locater
                                        loc.parentNode.removeChild(loc);
                                        locs[idx] = undefined;

                                    }
                                } else {
                                    
                                    // TODO: Refactor, this is identical code to above in the if statement.
                                    let w = t.length, fragment = document.createDocumentFragment();
                                    while (w-- > 0) {
                                        let c = fragment.appendChild(t[0]);
                                        $dom(c).register(rowScope, thisRef).decompose();
                                    }
                                    
                                    // Attach the compiled element to the DOM along with a location comment element
                                    let cmt = document.createComment(repeaterId);
                                    fragment.appendChild(cmt);
                                    target.appendChild(fragment);

                                    // Set the locater so we can see what needs to be replaced on the next cycle
                                    locs[idx] = cmt;
                                }
                                result.$$dirty = false;
                            }
                            return result;
                        });

                        // Remove stagnant locations.
                        if (indexedData.length < locs.length)
                        {
                            const stagnant = locs.splice(indexedData.length);
                            stagnant.forEach(function (loc, idx) {
                                // This is identical code to above, need to refactor.
                                const repeaterId = thisRef.__internalScopedObj + " repeater"; // refactor this into a function that creates a repeater comment value
                                if (loc !== undefined) {
                                    const removeList = [];
                                    let curr = loc.previousSibling;
                                    while (curr !== null) {
                                        if (curr.nodeType === Node.COMMENT_NODE && curr.nodeValue === repeaterId) {
                                            curr = null;
                                        } else {
                                            removeList.push(curr);
                                            curr = curr.previousSibling;
                                        }
                                    }
                                    removeList.forEach(function (el) {
                                        if (el.parentNode)
                                            el.parentNode.removeChild(el);
                                    });
                                    // trash the locater object
                                    loc.parentNode.removeChild(loc);
                                }
                            });
                        }

                        // Remove all objects in place (avoids dereferencing the array object)
                        this.$$Scope[this.__internalScopedObj].splice(0);

                        // Push the newly processed objects back into the array, with the deleted objects removed.
                        Array.prototype.push.apply(this.$$Scope[this.__internalScopedObj], indexedData);

                        // If an "Post Link" function is supplied, execute it now.
                        if (postLinkFn instanceof Function)
                            postLinkFn(thisRef.__targetSelector instanceof HTMLElement ? thisRef.__targetSelector : document.querySelector(thisRef.__targetSelector));
                    }
                };

                // Bootstrap the template appliance by binding it to the scope objects
                let bindresult = compiler.bind(options.scopedName, options.templateSelector, options.targetSelector);
                // Prepares and indexes the scope objects with internal tracking variables
                compiler.index();

                // Attach template appliance to the controller / scope ($$Scope) so that its instance may be referenced
                if (share.TemplateAppliance === undefined) {
                    // Empty object to use as a container
                    Object.defineProperty(share, 'TemplateAppliance', {
                        enumerable: true,
                        value: {}
                    });
                    // Special function to manually force a digest of the template (stop-gap that will most likely stay)
                    Object.defineProperty(share.TemplateAppliance, '$recycle', {
                        enumerable: false,
                        get: function () {
                            /// @template - Template Appliance Name, if undefined, recycles all appliances
                            /// @fn - After render function, only applied when a named template is specified
                            return function (template, fn) {
                                if (template === undefined) {
                                    for (let eng in share.TemplateAppliance) {
                                        if (share.TemplateAppliance.hasOwnProperty(eng) && 
                                            eng !== '$recycle' && 
                                            share.TemplateAppliance[eng].apply instanceof Function) {
                                            share.TemplateAppliance[eng].apply.call(share.TemplateAppliance[eng]);
                                        }
                                    }
                                } else {
                                    if (share.TemplateAppliance.hasOwnProperty(template) && 
                                            template !== '$recycle' && 
                                            share.TemplateAppliance[template].apply instanceof Function) {
                                        share.TemplateAppliance[template].apply.call(share.TemplateAppliance[template], fn);
                                    }
                                }
                            };
                        }
                    });
                }
                // Attached this instance to the existing container object (indexed by template name)
                // Will overwrite existing names, including $recycle, so be attentive.
                if (share.TemplateAppliance[templateName] === undefined)
                    Object.defineProperty(share.TemplateAppliance, templateName, {
                        get: function () {
                            return compiler;
                        }
                    });

                // Promise that's resolved after the template is loaded (URL templates require asynchronous loading)
                return bindresult;
            };
        })
    );
})();