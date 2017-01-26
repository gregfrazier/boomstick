(function () {
    'use strict';

    $boomStick.$register("$dom",
        $boomStick.$inject('$delimiters', '$clone', '$utils', function ($delimiters, $clone, $utils) {

            var __dom = function(selector, element) {
                var rootElement = element || document;
                var select = function(s, element){ return element['querySelectorAll'](s); };
                if(selector === undefined || selector === null)
                    return null;
                if(selector instanceof HTMLElement)
                    rootElement = selector;
                // Expects a collection
                return __dom.extend.call(__dom, selector instanceof HTMLElement ? [selector] : select(selector, element));
            };
            __dom.self = function(){ return this; };
            __dom.extend = function(element) {
                var prototype = new this.self();
                function __domInstance() {
                    this.init.apply(this, arguments);
                };
                __domInstance.prototype = prototype;
                __domInstance.prototype.constructor = __domInstance;
                __domInstance.extend = __dom.extend;
                return new __domInstance(element);
            };
            __dom.self.fn = __dom.self.prototype = {
                init: function(element) {
                    this.$$target = element;
                    this.$$wrapped = true;
                    this.$$directives = [];
                    this.$$localScope = null;
                    this.$$template = null;
                    this.directives = {}; // implementation
                    // this.__defaultDirectives();
                },
                register: function(scope, templateAppliance) {
                    this.$$template = templateAppliance;
                    this.$$localScope = scope;
                    return this;
                },
                // __defaultDirectives: function () {
                //     var that = this, 
                //     eventTypes = [ // refactor into directive manager
                //         { name: 'if', type: 'immediate', namespace: 'std' },
                //         { name: 'repeater', type: 'repeater', namespace: 'std' },
                //         { name: 'observe', type: 'immediate', namespace: 'std' },
                //         { name: 'click', type: 'deferred', eventType: 'click', namespace: 'std' },
                //         { name: 'disabled', type: 'immediate', namespace: 'std' },
                //         { name: 'checked', type: 'immediate', namespace: 'std' },
                //         { name: 'id', type: 'immediate', namespace: 'std' },
                //         { name: 'value', type: 'immediate', namespace: 'std' },
                //         { name: 'view', type: 'immediate', namespace: 'std' },
                //         { name: 'directive', type: 'shared', namespace: 'std' },
                //         { name: 'model', type: 'immediate', namespace: 'std' },
                //         { name: 'href', type: 'immediate', namespace: 'std' },
                //         { name: 'change', type: 'deferred', eventType: 'change', namespace: 'std' }
                //     ];
                //     eventTypes.forEach(function (directive) { that.registerDirective(directive); });
                // },
                __addStandardDirective: function (directiveDefinition) {
                    if (!this.$$directives.some(function (value) { return value.name === directiveDefinition.name; })){
                        Object.defineProperty(this.directive, directiveDefinition.name, {
                            writable: false,
                            enumerable: true,
                            value: directiveDefinition.implementation
                        });
                        this.registerDirective(directiveDefinition);
                    }
                    return this;
                },
                registerDirective: function (directiveDefinition, scope) {
                    if (!this.$$directives.some(function (value) { return value.name === directiveDefinition.name; }))
                        this.$$directives.push({ name: directiveDefinition.name, scope: scope, type: directiveDefinition.type, 
                            deferredEvent: directiveDefinition.hasOwnProperty('eventType') ? directiveDefinition.eventType : null,  
                            namespace: directiveDefinition.namespace });
                    return this;
                },
                identifyDirectives: function(attributeArray) {
                    return this.$$directives.filter(function(directive) {
                        return attributeArray.hasOwnProperty($delimiters.attrPrefix + directive.name);
                    }).map(function(directive) {
                        return {
                            directive: directive,
                            attributeObject: attributeArray[$delimiters.attrPrefix + directive.name]
                        };
                    });
                },
                decompose: function () {
                    // search each node in targetElement for a match to the attribute
                    var thisRef = this, 
                        repeaterNodes = [], 
                        attrList = this.attributeList;

                    $utils.forEachElement(this.$$target, this.$$template.$$Scope, function (htmlElement) {
                        var __templateScope = this, // this.$$template.$$Scope
                            repeaterElement = false, 
                            repeaterScope = {};


                        var activeDirectives = identifyDirectives(htmlElement.attributes);
                        activeDirectives.forEach(function (directive, idx){
                            if(directive.attributeObject !== undefined || directive.attributeObject !== null ) {
                                var qualifiers = directive.attributeObject.value.split(':'),
                                    qualifiersMap = qualifiers.map(function (modifier) { return modifier; }),
                                    dirFunctionName = $utils.snakeToCamel(directive.name),
                                    dirNamespace = directive.namespace == 'std' ? thisRef.directives : __templateScope.directives,
                                    dirParamArray = [];

                                // Directives have four types: (currently)
                                // shared    - split off to another controller with a shared scope
                                // immediate - immediate evaluation of the directive, useful for rendering contextual values
                                // repeater  - directive will be applied over an array, generating elements for each array using a single element template.
                                //             Repeater directives can contain elements with other directives, so the elements are drilled down. Nestable. Each item has it's own scope.
                                // deferred  - triggered by an event (dom events such as: click, change, etc.) Not evaluated until it's triggered.

                                dirParamArray = [scope, directive.type == 'shared' ? $clone(htmlElement.attributes, false) : null, qualifiersMap, thisRef, htmlElement];
                                if(directive.type == 'deferred'){
                                    htmlElement.addEventListener(directive.deferredEvent, function (ev) {
                                        dirParamArray.unshift(ev);
                                        directiveNamespace[implFn].apply(thisRef.templateEngine, dirParamArray);
                                    });
                                } else {
                                    directiveNamespace[implFn].apply(thisRef.templateEngine, dirParamArray);
                                }

                                // Repeater Type - value of the repeater must match to an array within the "Local Row Scope"
                                if(directive.type == 'repeater' && thisRef.$$localScope.hasOwnProperty(parts[0])) {
                                    
                                    repeaterElement = true;
                                    
                                    // List of objects that will be decomposed
                                    repeaterItemList = thisRef.localScope[parts[0]];
                                    
                                    // Allow shared access to the parent scope
                                    var parentScope = thisRef.localScope;

                                    // Need to clone the elements below this element n-times
                                    var repeaterContainer = htmlElement,
                                        repeaterTemplate = htmlElement.cloneNode(true).children;
                                    
                                    // Remove the container's default template
                                    while (repeaterContainer.firstChild)
                                        repeaterContainer.removeChild(repeaterContainer.firstChild);

                                    repeaterItemList.forEach(function (listItem, idx) {
                                        
                                        var fragment = document.createDocumentFragment();

                                        // Keep track of items by using a repeater comment element
                                        var c = document.createComment("repeat " + parts[0]);
                                        
                                        for (var childElement in repeaterTemplate)
                                            if (repeaterTemplate.hasOwnProperty(childElement)) {
                                                var repeatedElement = repeaterTemplate[childElement].cloneNode(true);
                                                
                                                // Bind to the shared template appliance
                                                thisRef.$$template.iterateTextNodes(
                                                    repeatedElement, 
                                                    thisRef.$$template.decomposeMustache(listItem), 
                                                    thisRef
                                                );
                                                
                                                fragment.appendChild(repeatedElement);
                                                
                                                listItem.$$watcher = thisRef.$$template.$$NameSpace.$new();
                                                listItem.$$parentScope = parentScope;
                                                
                                                repeaterNodes.push({
                                                    childElement: repeatedElement, 
                                                    childScope: listItem 
                                                });
                                            }
                                        
                                        fragment.appendChild(c);
                                        
                                        // Append fragment to the container to be visible
                                        repeaterContainer.appendChild(fragment);

                                    });
                                }                                

                            }
                        });

                        // Process children / repeater elements
                        if (!!htmlElement && !!htmlElement.parentNode)
                            if(!repeaterElement) {
                                // replace abuse of array slice.
                                Array.prototype.slice.call(htmlElement.children).forEach(function (childElement) {
                                    __dom(null, childElement)
                                        .register(thisRef.$$localScope, thisRef.$$template)
                                        .decompose();
                                });
                            } else {
                                repeaterNodes.forEach(function (node) {
                                    __dom(null, node.childElement)
                                        .register(node.childScope, thisRef.$$template)
                                        .decompose();
                                });                                
                            }
                    });
                }
            };

            return __dom;
        })
    );
})();