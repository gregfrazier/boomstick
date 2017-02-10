// jshint esversion: 6
(function () {
    'use strict';

    $boomStick.$register("$dom",
        $boomStick.$inject('$delimiters', '$clone', '$utils', '$baselineDirectives', '$mustache', function ($delimiters, $clone, $utils, $baselineDirectives, $mustache) {

            var __dom = function(selector, element) {
                const select = function(s, element){ return element['querySelectorAll'](s); };
                let rootElement = element || document;                
                if(selector === undefined || selector === null)
                    return null;
                if(selector instanceof HTMLElement || selector instanceof Text)
                    rootElement = selector;
                // Expects a collection
                return __dom.extend.call(__dom, selector instanceof HTMLElement || selector instanceof Text ? [selector] : select(selector, element));
            };
            __dom.self = function(){ return this; };
            __dom.extend = function(element) {
                let prototype = new this.self();
                function __domInstance() {
                    this.init.apply(this, arguments);
                }
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
                    this.__defaultDirectives();
                },
                register: function(scope, templateAppliance) {
                    this.$$template = templateAppliance;
                    this.$$localScope = scope;
                    return this;
                },
                 __defaultDirectives: function () {
                    $baselineDirectives.forEach((directive) => {
                        this.__addStandardDirective(directive);
                    });
                },
                __addStandardDirective: function (directiveDefinition) {
                    if (!this.$$directives.some((value) => { return value.name === directiveDefinition.name; })){
                        Object.defineProperty(this.directives, directiveDefinition.name, {
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
                    const thisRef = this, 
                          repeaterNodes = [];

                    $utils.forEachElement(this.$$target, this.$$template.$$Scope, function (htmlElement) {
                        const __templateScope = this;
                        let repeaterElement = false, 
                            repeaterScope = {};


                        if(htmlElement.attributes !== undefined && htmlElement.attributes !== null) {
                            const activeDirectives = thisRef.identifyDirectives(htmlElement.attributes);
                            activeDirectives.forEach(function (directive, idx){
                                if(directive.attributeObject !== undefined || directive.attributeObject !== null ) {
                                    const qualifiers = directive.attributeObject.value.split(':'),
                                          qualifiersMap = qualifiers.map((modifier) => { return modifier; }),
                                          dirFunctionName = $utils.snakeToCamel(directive.directive.name),
                                          dirNamespace = directive.directive.namespace == 'std' ? thisRef.directives : __templateScope.directives;
                                    let dirParamArray = [];

                                    // Directives have four types: (currently)
                                    // shared    - split off to another controller with a shared scope
                                    // immediate - immediate evaluation of the directive, useful for rendering contextual values
                                    // repeater  - directive will be applied over an array, generating elements for each array using a single element template.
                                    //             Repeater directives can contain elements with other directives, so the elements are drilled down. Nestable. Each item has it's own scope.
                                    // deferred  - triggered by an event (dom events such as: click, change, etc.) Not evaluated until it's triggered.

                                    dirParamArray = [__templateScope, directive.directive.type == 'shared' ? $clone(htmlElement.attributes, false) : null, qualifiersMap, thisRef, htmlElement];
                                    if(directive.directive.type == 'deferred'){
                                        htmlElement.addEventListener(directive.directive.deferredEvent, function (ev) {
                                            dirParamArray.unshift(ev);
                                            dirNamespace[dirFunctionName].apply(thisRef.$$template, dirParamArray);
                                        });
                                    } else {
                                        dirNamespace[dirFunctionName].apply(thisRef.$$template, dirParamArray);
                                    }

                                    // Repeater Type - value of the repeater must match to an array within the "Local Row Scope"
                                    if(directive.directive.type == 'repeater' && thisRef.$$localScope.hasOwnProperty(qualifiers[0])) {
                                        
                                        repeaterElement = true;
                                        
                                        // List of objects that will be decomposed
                                        const repeaterItemList = thisRef.$$localScope[qualifiers[0]];
                                        
                                        // Allow shared access to the parent scope
                                        const parentScope = thisRef.$$localScope;

                                        // Need to clone the elements below this element n-times
                                        let repeaterContainer = htmlElement,
                                            repeaterTemplate = htmlElement.innerHTML; //cloneNode(true).children;
                                        
                                        // Remove the container's default template
                                        while (repeaterContainer.firstChild)
                                            repeaterContainer.removeChild(repeaterContainer.firstChild);

                                        repeaterItemList.forEach(function (listItem, idx) {
                                            
                                            let fragment = document.createDocumentFragment();

                                            // Keep track of items by using a repeater comment element
                                            let c = document.createComment("repeat " + qualifiers[0]);

                                            fragment.appendChild(c);
                                            
                                            //for (let childElement in repeaterTemplate)
                                            //    if (repeaterTemplate.hasOwnProperty(childElement)) {                                                    
                                            //        let repeatedElement = repeaterTemplate[childElement].cloneNode(true);
                                                    
                                                    // TODO: change this to use the TemplateAppliance instead of doing a "micro" version of it here.

                                                    // Bind to the shared template appliance
                                                    //thisRef.$$template.iterateTextNodes(
                                                    //    repeatedElement, 
                                                    //    $mustache(listItem, )
                                                    //    //thisRef.$$template.decomposeMustache(listItem), 
                                                    //    thisRef
                                                    //);

                                                    listItem.$$dirty = true;
                                                    listItem.$$deleted = false;

                                                    var frag = thisRef.$$template.compileSingleScope(listItem, repeaterTemplate, fragment, c, qualifiers[0], idx);
                                                    
                                                    fragment.appendChild(frag.compiledFragment);
                                                    
                                                    if(listItem.$$watcher === undefined || listItem.$$watcher === null)
                                                        listItem.$$watcher = thisRef.$$template.$$NameSpace.$new();
                                                    if(listItem.$$parentScope === undefined || listItem.$$parentScope === null)
                                                        listItem.$$parentScope = parentScope;
                                                    
                                                    repeaterNodes.push({
                                                        childElement: frag.compiledFragment, 
                                                        childScope: listItem 
                                                    });
                                                //}
                                            
                                            //fragment.appendChild(c);
                                            
                                            // Append fragment to the container to be visible
                                            repeaterContainer.appendChild(fragment);

                                        });
                                    }                                

                                }
                            });
                        }

                        // Process children / repeater elements
                        if (!!htmlElement && !!htmlElement.parentNode)
                            if(!repeaterElement) {
                                // replace abuse of array slice.
                                if(htmlElement.children !== undefined)
                                    Array.prototype.slice.call(htmlElement.children).forEach(function (childElement) {
                                        __dom(childElement)
                                            .register(thisRef.$$localScope, thisRef.$$template)
                                            .decompose();
                                    });
                            } //else {
                            //     repeaterNodes.forEach(function (node) {
                            //         __dom(node.childElement)
                            //             .register(node.childScope, thisRef.$$template)
                            //             .decompose();
                            //     });                                
                            // }
                    });
                }
            };

            return __dom;
        })
    );
})();