(function () {
    'use strict';

    $boomStick.$register("$t",
        $boomStick.$inject('$delimiters', '$baseURL', '$TemplateCache', '$dom', '$mustache', function (delimiters, baseURL, $TemplateCache, $dom, $mustache) {
            
            return function (share, templateName, options, $$ns) {

                var compiler = {
                    
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
                        
                        var promise = null,
                            thisRef = this;                        
                        
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
                            promise = Promise.resolve(thisRef);

                        } else {
                            
                            // Template is in template script tag.
                            // Remove reference to hard-coded "document" object.
                            this.template = document.querySelector(this.cleanSelector(templateSelector)).innerHTML;
                            promise = Promise.resolve(thisRef);

                        }
                        return promise;
                    },

                    // TODO: Bad code, replace
                    // eachNode: function (array, callback, scope) {
                    //     for (var i = 0; i < array.length; callback.call(scope, array[i], i), i++);
                    // },
                    // emptyTarget: function (target) {
                    //     this.eachNode(target, function (node) {
                    //         node.innerHTML = '';
                    //     });
                    // },

                    // Snipped from angular.js - MIT License, Angular.JS Team
                    encodeEntities: function (value) {
                        // Regular Expressions for parsing tags and attributes
                        var SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
                            // Match everything outside of normal chars and " (quote character)
                            NON_ALPHANUMERIC_REGEXP = /([^\#-~ |!])/g;
                        if (value === undefined || value === null)
                            return '';
                        return value.replace(/&/g, '&amp;').
                               replace(SURROGATE_PAIR_REGEXP, function (value) {
                                   var hi = value.charCodeAt(0);
                                   var low = value.charCodeAt(1);
                                   return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';';
                               }).
                               replace(NON_ALPHANUMERIC_REGEXP, function (value) {
                                   return '&#' + value.charCodeAt(0) + ';';
                               }).
                               replace(/</g, '&lt;').
                               replace(/>/g, '&gt;');
                    },

                    // This is from jQuery with mods - MIT License http://jquery.com
                    wrapMap: function (html) {
                        var wrapMap = {
                            option: [1, "<select multiple='multiple'>", "</select>"],
                            legend: [1, "<fieldset>", "</fieldset>"],
                            area: [1, "<map>", "</map>"],
                            param: [1, "<object>", "</object>"],
                            thead: [1, "<table>", "</table>"],
                            tr: [2, "<table><tbody>", "</tbody></table>"],
                            col: [2, "<table><tbody></tbody><colgroup>", "</colgroup></table>"],
                            td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
                            body: [0, "", ""],
                            _default: [1, "<div>", "</div>"]
                        };
                        wrapMap.optgroup = wrapMap.option;
                        wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
                        wrapMap.th = wrapMap.td;
                        var match = /<\s*\w.*?>/g.exec(html), element = document.createElement('div'), children = null;
                        if (match != null) {
                            var tag = match[0].replace(/</g, '').replace(/>/g, '').split(' ')[0];
                            if (tag.toLowerCase() === 'body') {
                                var dom = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null),
                                    body = document.createElement("body");
                                element.innerHTML = html.replace(/<body/g, '<div').replace(/<\/body>/g, '</div>');
                                var attrs = element.firstChild.attributes;
                                body.innerHTML = html;
                                for (var i = 0; i < attrs.length; i++) {
                                    body.setAttribute(attrs[i].name, attrs[i].value);
                                }
                                return body;
                            } else {
                                var map = wrapMap[tag] || wrapMap._default, element;
                                html = map[1] + html + map[2];
                                element.innerHTML = html;
                                var j = map[0] + 1;
                                while (j--) {
                                    element = element.lastChild;
                                    if (j == 1 && element.children.length > 1)
                                        children = element.children;
                                }
                            }
                        } else {
                            element.innerHTML = html;
                            element = element.lastChild;
                        }
                        return children === null ? element : children;
                    },

                    // This only processes on a text-node, very limited
                    iterateTextNodes: function (element, action, scope) {
                        if (element === undefined || element === null || element.childNodes === null || element.childNodes.length == 0)
                            return;
                        for (var x = 0; x < element.childNodes.length; x++)
                            if (element.childNodes[x] instanceof Text)
                                action.call(scope, element.childNodes[x], x);
                            else
                                this.iterateTextNodes(element.childNodes[x], action, scope);
                    },

                    // Add internal values to the scope object list. Automatically "dirty" the objects so they are rendered (dirty triggers a digest cycle.)
                    index: function (dirty) {
                        var indexedData = this.$$Scope[this.__internalScopedObj].map(function (obj, idx) {
                            obj.$$index = idx;
                            obj.$$dirty = dirty || true;
                            obj.$$deleted = false;
                            return obj;
                        });
                        this.$$Scope[this.__internalScopedObj].splice(0);
                        Array.prototype.push.apply(this.$$Scope[this.__internalScopedObj], indexedData);
                        return this;
                    },

                    // TODO: Rework / refactor, add expression evaluation -- maybe make this directive based
                    // decomposeMustache: function (rowScope) {
                    //     var y = /\{\{([^\}]+)\}\}/g, formatter = /([^\}]*)\:([^\}]+)/g;
                    //     return function (obj, idx) {
                    //         var bindvar = obj.nodeValue,
                    //             r = y.exec(bindvar), bindOut = bindvar;
                    //         while (r !== null) {
                    //             // Formatter => Property:FormatterFunction
                    //             formatter.compile(formatter);
                    //             var formatFn = formatter.exec(r[1]);
                    //             if (formatFn !== null) {
                    //                 if (this.$$Scope[formatFn[2]] !== undefined)
                    //                     bindOut = bindOut.replace(r[0], this.$$Scope[formatFn[2]].call(this.$$Scope, rowScope[formatFn[1]], rowScope));
                    //             } else {
                    //                 if (rowScope[r[1]] !== undefined)
                    //                     bindOut = bindOut.replace(r[0], rowScope[r[1]]); // sanitize not needed on text-nodes
                    //             }
                    //             r = y.exec(bindvar);
                    //         }
                    //         obj.nodeValue = bindOut; // safe, only changes contents of text nodes
                    //     };
                    // },

                    // TODO: refactor
                    apply: function (afterRenderFn) {

                        var data = this.$$Scope[this.__internalScopedObj], 
                            thisRef = this, locs = this.locators[this.__internalScopedObj];

                        if (locs === undefined)
                            locs = this.locators[this.__internalScopedObj] = [];

                        var indexedData = data.filter(function (result) {
                            
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
                                var s = thisRef.template,
                                    t = thisRef.wrapMap(s.trim()),
                                    rowScope = result; // data for the current object being processed

                                // Because templates are processed on a set (array of objects), they need to be kept track of by using a specially named comment to differentiate between them.
                                var loc = locs[idx], repeaterId = thisRef.__internalScopedObj + " repeater"; // refactor this into a function that creates a repeater comment value
                                if (loc !== undefined) {
                                    // Build list of elements to remove, and then remove them from the DOM (they will be rebuilt)
                                    var removeList = [], curr;
                                    curr = loc.previousSibling;
                                    while (curr != null) {
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

                                // Find textnode-based bindings and decompose into observed values
                                for (var x = 0; x < t.length; x++)
                                    thisRef.iterateTextNodes(t[x], function(obj, idx) { 
                                        obj.nodeValue = $mustache(obj.nodeValue, result, thisRef.$$Scope);
                                    }, thisRef);
                                
                                // Replace in place or add to the target element.
                                var target = thisRef.__targetSelector instanceof HTMLElement ? thisRef.__targetSelector : document.querySelector(thisRef.__targetSelector); // only allow this be attached to one element
                                
                                // If the location comment element exists, reuse it, otherwise create a new one
                                if (loc !== undefined) {
                                    if (!rowScope.$$deleted) { // doesn't appear that this should ever be false, need to refactor
                                        
                                        // TODO: Refactor, this is identical code to below in the else statement.
                                        // Process the template with dom library
                                        var w = t.length, fragment = document.createDocumentFragment();
                                        while (w-- > 0) {
                                            var c = fragment.appendChild(t[0]);
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
                                    var w = t.length, fragment = document.createDocumentFragment();
                                    while (w-- > 0) {
                                        var c = fragment.appendChild(t[0]);
                                        $dom(c).register(rowScope, thisRef).decompose();
                                    }
                                    
                                    // Attach the compiled element to the DOM along with a location comment element
                                    var cmt = document.createComment(repeaterId)
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
                            var stagnant = locs.splice(indexedData.length);
                            stagnant.forEach(function (loc, idx) {
                                // This is identical code to above, need to refactor.
                                var repeaterId = thisRef.__internalScopedObj + " repeater"; // refactor this into a function that creates a repeater comment value
                                if (loc != undefined) {
                                    var removeList = [], curr;
                                    curr = loc.previousSibling;
                                    while (curr != null) {
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

                        // If an "After Render Function" is supplied, execute it now.
                        if (afterRenderFn instanceof Function)
                            afterRenderFn(thisRef.__targetSelector instanceof HTMLElement ? thisRef.__targetSelector : document.querySelector(thisRef.__targetSelector));
                    }
                };

                // Bootstrap the template appliance by binding it to the scope objects
                var bindresult = compiler.bind(options.scopedName, options.templateSelector, options.targetSelector);
                // Prepares and indexes the scope objects with internal tracking variables
                compiler.index();

                // Attach template appliance to the controller / scope ($$Scope) so that its instance may be referenced
                if (share['TemplateAppliance'] === undefined) {
                    // Empty object to use as a container
                    Object.defineProperty(share, 'TemplateAppliance', {
                        enumerable: true,
                        value: {}
                    });
                    // Special function to manually force a digest of the template (stop-gap that will most likely stay)
                    Object.defineProperty(share['TemplateAppliance'], '$recycle', {
                        enumerable: false,
                        get: function () {
                            /// @template - Template Appliance Name, if undefined, recycles all appliances
                            /// @fn - After render function, only applied when a named template is specified
                            return function (template, fn) {
                                if (template === undefined) {
                                    for (var eng in share.TemplateAppliance) {
                                        if (share.TemplateAppliance.hasOwnProperty(eng)
                                            && eng !== '$recycle'
                                            && share.TemplateAppliance[eng].apply instanceof Function) {
                                            share.TemplateAppliance[eng].apply.call(share.TemplateAppliance[eng]);
                                        }
                                    }
                                } else {
                                    if (share.TemplateAppliance.hasOwnProperty(template)
                                            && template !== '$recycle'
                                            && share.TemplateAppliance[template].apply instanceof Function) {
                                        share.TemplateAppliance[template].apply.call(share.TemplateAppliance[template], fn);
                                    }
                                }
                            }
                        }
                    });
                }
                // Attached this instance to the existing container object (indexed by template name)
                // Will overwrite existing names, including $recycle, so be attentive.
                if (share.TemplateAppliance[templateName] === undefined)
                    Object.defineProperty(share['TemplateAppliance'], templateName, {
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