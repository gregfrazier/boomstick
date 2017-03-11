// jshint esversion: 6
(function () {
    'use strict';

    // Base URL can be specified in the title by using a BASE tag with an HREF. Otherwise defaults to /
    const base = document.querySelector('base'), 
        baseURL = (base !== null && base !== undefined) ? base.href : '/';

    // Global Dependencies
    $boomStick
    	.$register("$delimiters", { attrPrefix: 'bs-' })      // Modify this to change the prefix on the app tags
        .$register('$fetch', window.fetch)
    	.$register('$window', window)
    	.$register('$document', document)
    	.$register('$baseURL', baseURL)
        .$register('$clone', function(originalObject, circular) {
            // http://blog.soulserv.net/understanding-object-cloning-in-javascript-part-ii/
            // First create an empty object with
            // same prototype of our original source
            if (originalObject === undefined || originalObject === null)
                return originalObject;
            var propertyIndex,
                descriptor,
                keys,
                current,
                nextSource,
                indexOf,
                copies = [{
                    source: originalObject,
                    target: Object.create(Object.getPrototypeOf(originalObject))
                }],
                cloneObject = copies[0].target,
                sourceReferences = [originalObject],
                targetReferences = [cloneObject];
            // First in, first out
            while (current = copies.shift()) {
                keys = Object.getOwnPropertyNames(current.source);
                for (propertyIndex = 0 ; propertyIndex < keys.length ; propertyIndex++) {
                    // Save the source's descriptor
                    descriptor = Object.getOwnPropertyDescriptor(current.source, keys[propertyIndex]);
                    if (!descriptor.value || typeof descriptor.value !== 'object') {
                        Object.defineProperty(current.target, keys[propertyIndex], descriptor);
                        continue;
                    }
                    nextSource = descriptor.value;
                    descriptor.value = Array.isArray(nextSource) ?
                        [] :
                        Object.create(Object.getPrototypeOf(nextSource));
                    if (circular) {
                        indexOf = sourceReferences.indexOf(nextSource);
                        if (indexOf !== -1) {
                            // The source is already referenced, just assign reference
                            descriptor.value = targetReferences[indexOf];
                            Object.defineProperty(current.target, keys[propertyIndex], descriptor);
                            continue;
                        }
                        sourceReferences.push(nextSource);
                        targetReferences.push(descriptor.value);
                    }
                    Object.defineProperty(current.target, keys[propertyIndex], descriptor);
                    copies.push({ source: nextSource, target: descriptor.value });
                }
            }
            return cloneObject;
        })
        .$register("$Expressions", {
            evalBlock: function (str, scope) {
                scope = scope || {};
                const valueStack = [], operStack = [],
                      e = { 
                        '+': function (y, x) { return x + y; }, 
                        '-': function (y, x) { return x - y; }, 
                        '*': function (y, x) { return x * y; }, 
                        '/': function (y, x) { return x / y; } 
                      },
                      prec = function (op1, op2) { 
                        return (op2 == '(' || op2 == ')') || ((op1 == '*' || op1 == '/') && (op2 == '+' || op2 == '-')) ? false : true; 
                      },
                      validOps = ['+', '-', '*', '/', '!', '(', ')'];
                Array.from(str).map(function (curr) {
                    return validOps.indexOf(curr) > -1 ? { type: 'o', val: curr } : curr.trim().length === 0 ? { type: 'w', val: curr } : { type: 'l', val: curr };
                }).reduce(function (prev, curr, idx, arr) {
                    const proc = {
                        l: function (p) {
                            if (p.type == 'l') p.literalValue += String(curr.val);
                            else prev.push({ type: curr.type, literalValue: String(curr.val) });
                        },
                        o: function (p) { prev.push({ type: curr.type, operatorValue: String(curr.val), equality: false }); },
                        w: function () { return; }
                    }; proc[curr.type](prev[prev.length - 1]);
                    return prev;
                }, [{ type: 's' }]).forEach(function (o) { 
                    const proc = {
                        s: function () { },
                        l: function () {
                            const complexTypeEval = (s, v, i) => {
                                if (s === undefined)
                                    return undefined;
                                if (v.length - 1 == i)
                                    return s[v[i]];
                                return complexTypeEval(s[v[i]], v, ++i);
                            };
                            let v = /(true|false)/.test(o.literalValue) ? (o.literalValue === 'false' ? false : true) :
                                    /[0-9]/i.test(o.literalValue.charAt(0)) ? parseFloat(o.literalValue) : complexTypeEval(scope, o.literalValue.split('.'), 0); // scope[o.literalValue];
                            if (operStack[operStack.length - 1] == '!') { v = !v; operStack.pop(); }
                            valueStack.push(v);
                        },
                        o: function () {
                            const operate = () => {
                                if (operStack[operStack.length - 1] in e && valueStack.length > 1) valueStack.push(e[operStack.pop()](valueStack.pop(), valueStack.pop()));
                                else operStack.pop();
                            };
                            switch (o.operatorValue) {
                                case '!': case '(': operStack.push(o.operatorValue); break;
                                case '+': case '-': case '*': case '/':
                                    while (operStack.length > 0 && prec(o.operatorValue, operStack[operStack.length - 1])) operate();
                                    operStack.push(o.operatorValue);
                                    break;
                                case ')':
                                    while (operStack.length > 0 && operStack[operStack.length - 1] != '(') operate();
                                    operStack.pop();
                                    break;
                            }
                        }
                    }; proc[o.type]();
                });
                while (operStack.length > 0)
                    if (operStack[operStack.length - 1] in e && valueStack.length > 1) valueStack.push(e[operStack.pop()](valueStack.pop(), valueStack.pop()));
                    else operStack.pop();
                return valueStack.pop();
            },
            equality: function (str, scope) {
                const ltr = str.split('==');
                if (ltr.length == 2) {
                    const l = this.evalBlock(ltr[0].trim(), scope);
                    const r = this.evalBlock(ltr[1].trim(), scope);
                    return l == r;
                } else {
                    return this.evalBlock(str, scope);
                }
            }
        })
        .$register('$mustache', $boomStick.$inject('$Expressions', function ($exp) {
            return function (str, scope, formatterScope) {
                const mustacheTrigger = /\{\{([^\}]+)\}\}/g, varFormatter = /([^\}]*)\:([^\}]+)/g, bindvar = str;
                let markdown = mustacheTrigger.exec(bindvar), bindOut = bindvar;
                while (markdown !== null) {
                    // test if this has a formatter attached to it (formatter is where a property is followed by a colon and then a function nane: Property:FormatterFunction)
                    varFormatter.compile(varFormatter);
                    let formatFn = varFormatter.exec(markdown[1]);
                    if (formatFn !== null) {
                        if (formatterScope[formatFn[2]] !== undefined)
                            bindOut = bindOut.replace(markdown[0], formatterScope[formatFn[2]].call(formatterScope, $exp.equality(formatFn[1], scope), scope));
                    } else {
                        if ($exp.equality(markdown[1], scope) !== undefined && $exp.equality(markdown[1], scope) !== null)
                            bindOut = bindOut.replace(markdown[0], $exp.equality(markdown[1], scope));
                    }
                    markdown = mustacheTrigger.exec(bindvar);
                }
                return bindOut;
            };
        }));

})();