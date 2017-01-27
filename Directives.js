(function () {
    'use strict';
    // Standard Built-In Directives.
    // This is not how to create new directives!
    // Executed immediately, dependencies must be loaded first
    
    //[scope, directive.type == 'shared' ? $clone(htmlElement.attributes, false) : null, qualifiersMap, thisRef, htmlElement]
    $boomStick.$register('$baselineDirectives',
        $boomStick.$inject('$delimiters', '$baseURL', '$Expressions', function (delimiters, baseURL, $exp) {
        	return [
                { 
                	name: 'if', type: 'immediate', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        // Evaluates the first qualifier (ignore all others), if false, hides the element
                        if (qualifiers[0].length > 0 && !$exp.equality(qualifiers[0], rootScope.$$localScope))
                            if (htmlElement.parentNode) {
                                var c = document.createComment("if " + qualifiers[0])
                                htmlElement.parentNode.insertBefore(c, htmlElement);
                                htmlElement.parentNode.removeChild(htmlElement);
                            }
                    }
            	},
                { 
                	name: 'repeater', type: 'repeater', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        // This is a placeholder directive that's built into $dom, no implementation required.
                        console.log('Repeater directive called');
                        console.log(arguments);
                    }
            	},
                { 
                	name: 'observe', type: 'immediate', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        rootScope.$$localScope.$$watcher.$watch(arguments, function (src, value, watch) {
                            var qualifiers = value.exp[2];
                            if (qualifiers.length == 2) {
                                var fn = $exp.equality(qualifiers[0], rootScope.$$localScope) || $exp.equality(qualifiers[0], rootScope.$$template.$$Scope);
                                if (fn instanceof Function) {
                                    fn($exp.encodeEntities($exp.equality(qualifiers[1], rootScope.$$localScope)), htmlElement, src, value, watch);
                                }
                            }
                        });
                    }
            	},
                { 
                	name: 'click', type: 'deferred', eventType: 'click', namespace: 'std',
                	implementation: function (event, scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        
                        // Execute the function that is specified as the first qualifier
                        var defer = scope[args.shift()].apply(
                        	scope, 
                        	args.map(function (o) { 
                        		return rootScope.$$localScope[o]; 
                        	}).concat([scope, event, rootScope, htmlElement, qualifiers]));

                        // If the function returns true, tell dom (which is rootScope) to reprocess
                        if (defer)
                        	rootScope.decompose.call(rootScope);
                    }
            	},
                { 
                	name: 'disabled', type: 'immediate', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        if (qualifiers[0].length > 0 && $exp.equality(qualifiers[0], rootScope.$$localScope))
                            htmlElement['disabled'] = true;
                    }
            	},
                { 
                	name: 'checked', type: 'immediate', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        if (qualifiers[0].length > 0 && $exp.equality(qualifiers[0], rootScope.$$localScope))
                            htmlElement['checked'] = true;
                    }
            	},
                { 
                	name: 'id', type: 'immediate', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        htmlElement.id = $exp.equality(qualifiers[0], rootScope.$$localScope);
                    }
            	},
                { 
                	name: 'value', type: 'immediate', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        if (htmlElement instanceof HTMLInputElement)
                            htmlElement.value = $exp.equality(qualifiers[0], rootScope.$$localScope);
                        else
                            htmlElement.setAttribute("value", $exp.equality(qualifiers[0], rootScope.$$localScope));
                    }
            	},
                { 
                	name: 'view', type: 'immediate', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        if (qualifiers.length == 1) {
                            var evaluatedValue = $exp.encodeEntities($exp.equality(qualifiers[0], rootScope.$$localScope));
                            htmlElement.innerHTML = evaluatedValue.length == 0 ? '&nbsp;' : evaluatedValue;
                        } else if (qualifiers.length == 2) {
                            var fn = $exp.equality(qualifiers[0], rootScope.$$localScope) || $exp.equality(qualifiers[0], rootScope.$$template.$$Scope);
                            if (fn instanceof Function) {
                                fn($exp.encodeEntities($exp.equality(qualifiers[1], rootScope.$$localScope)), htmlElement);
                            }
                        }

                        rootScope.$$localScope.$$watcher.$watch(arguments, function (src, value, watch) {
                            if (qualifiers.length == 1) {
                                var evaluatedValue = $exp.encodeEntities($exp.equality(qualifiers[0], rootScope.$$localScope));
                                htmlElement.innerHTML = evaluatedValue.length == 0 ? '&nbsp;' : evaluatedValue;
                            } else if (qualifiers.length == 2) {
                                var fn = $exp.equality(qualifiers[0], rootScope.$$localScope) || $exp.equality(qualifiers[0], rootScope.$$template.$$Scope);
                                if (fn instanceof Function) {
                                    fn($exp.encodeEntities($exp.equality(qualifiers[1], rootScope.$$localScope)), htmlElement);
                                }
                            }
                        });

                    }
            	},
                { 
                	name: 'directive', type: 'shared', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        // grabs the namespace watch service, which controls the application
                        var ns = rootScope.$$template.$$NameSpace;
                        if (qualifiers.length > 0) {
                            // One off function that instantiates a new controller from a special embedded factory
                            ns.$inject(qualifiers[0], function (directive) {
                                if (!!directive.share)
                                    directive.share(elementAttributes, rootScope.$$localScope);
                                if (!!directive.compileTemplate)
                                    directive.compileTemplate(directive.config(htmlElement, elementAttributes));
                                return directive;
                            });
                        }
                    }
            	},
                { 
                	name: 'model', type: 'immediate', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        var a = arguments;

                        if (htmlElement instanceof HTMLInputElement && htmlElement.getAttribute('type').toLowerCase() == 'checkbox') {
                            var changed = function (ev) {
                                rootScope.$$localScope[qualifiers[0]] = htmlElement.checked;
                                rootScope.$$localScope.$$watcher.$digest(ev.currentTarget);
                            };

                            ['click'].forEach(function (o, i) {
                                htmlElement.addEventListener(o, changed, true);
                            });

                            var currentModelValue = $exp.equality(qualifiers[0], rootScope.$$localScope);
                            if (htmlElement instanceof HTMLInputElement) {
                                if (currentModelValue === undefined) {
                                    currentModelValue = htmlElement.checked;
                                    rootScope.$$localScope[qualifiers[0]] = currentModelValue;
                                }
                            }
                        } else {
                            var changed = function (ev) {
                                rootScope.$$localScope[qualifiers[0]] = htmlElement.value;
                                rootScope.$$localScope.$$watcher.$digest(ev.currentTarget);
                            };

                            ['change', /*'compositionend', 'compositionstart', 'blur',*/ 'input'].forEach(function (o, i) {
                                htmlElement.addEventListener(o, changed, true);
                            });

                            var currentModelValue = $exp.equality(qualifiers[0], rootScope.$$localScope);
                            if (htmlElement instanceof HTMLInputElement) {
                                if (currentModelValue === undefined) {
                                    currentModelValue = htmlElement.value;
                                    rootScope.$$localScope[qualifiers[0]] = currentModelValue;
                                }
                            } else {
                                if (currentModelValue === undefined) {
                                    currentModelValue = htmlElement.getAttribute('value');
                                    rootScope.$$localScope[qualifiers[0]] = currentModelValue;
                                }
                            }
                        }
                        var model = rootScope.$$localScope.$$watcher.$bind(htmlElement, qualifiers[0], rootScope.$$localScope);
                        model.$$Model = currentModelValue;
                        // send digest signal
                        rootScope.$$localScope.$$watcher.$digest(htmlElement);
                    }
            	},
                { 
                	name: 'href', type: 'immediate', namespace: 'std',
                	implementation: function (scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        if (qualifiers.length > 0) {
                            var value = qualifiers[0].replace(/^\~\//, baseURL);
                            value = $mustache(value, rootScope.$$localScope, rootScope);
                            htmlElement.setAttribute('href', value);
                        }
                    } 
            	},
                { 
                	name: 'change', type: 'deferred', eventType: 'change', namespace: 'std',
                	implementation: function (event, scope, elementAttributes, qualifiers, rootScope, htmlElement) {
                        console.log('Change called.');
                    }
            	},
        	];
        }));
})();