(function () {
    'use strict';

    // TODO: expand functionality
    $boomStick.$register("$Expressions",
        $boomStick.$inject('$delimiters', '$baseURL', '$fetch', function (delimiters, baseURL, $fetch) {
            return {
                evalBlock: function (str, scope) {
                    scope = scope || {};
                    var valueStack = [], operStack = [],
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
                        var proc = {
                            l: function (p) {
                                if (p.type == 'l') p.literalValue += String(curr.val);
                                else prev.push({ type: curr.type, literalValue: String(curr.val) });
                            },
                            o: function (p) { prev.push({ type: curr.type, operatorValue: String(curr.val), equality: false }); },
                            w: function () { return; }
                        }; proc[curr.type](prev[prev.length - 1]);
                        return prev;
                    }, [{ type: 's' }]).forEach(function (o) { 
                        var proc = {
                            s: function () { },
                            l: function () {
                                const complexTypeEval = (s, v, i) => {
                                    if (s === undefined)
                                        return undefined;
                                    if (v.length - 1 == i)
                                        return s[v[i]];
                                    return complexTypeEval(s[v[i]], v, ++i);
                                }
                                var v = /(true|false)/.test(o.literalValue) ? (o.literalValue === 'false' ? false : true) :
                                        /[0-9]/i.test(o.literalValue.charAt(0)) ? parseFloat(o.literalValue) : complexTypeEval(scope, o.literalValue.split('.'), 0);
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
                equality: function(str, scope) {
                    var ltr = str.split('==');
                    if (ltr.length == 2) {
                        var l = this.evalExpression(ltr[0].trim(), scope);
                        var r = this.evalExpression(ltr[1].trim(), scope);
                        return l == r;
                    } else {
                        return this.evalExpression(str, scope);
                    }
                }
            };
        }));
})();