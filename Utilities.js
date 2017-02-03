// jshint esversion: 6
(function () {
    'use strict';

    $boomStick.$register("$utils", {
        forEachElement: function (htmlCollection, callbackScope, callback) {
            for (let i = 0; 
            	 i < htmlCollection.length; 
            	 callback.call(callbackScope, htmlCollection[i], i), i++);
        },
        // Fixes ID selectors that start with a number
        cleanSelector: function(sel){
          return sel.replace(/([#])([0-9])/g, "\$1\\3\$2 ");
        },
        // Convert snake-case to camelCase
        snakeToCamel: function (s) {
            return s.replace(/(\-\w)/g, function (m) { return m[1].toUpperCase(); });
        },
        encodeEntities: function (value) {
            // Regular Expressions for parsing tags and attributes
            const SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
                // Match everything outside of normal chars and " (quote character)
                NON_ALPHANUMERIC_REGEXP = /([^\#-~ |!])/g;
            if (value === undefined || value === null)
                return '';
            return value.replace(/&/g, '&amp;').
                   replace(SURROGATE_PAIR_REGEXP, function (value) {
                       const hi = value.charCodeAt(0),
                             low = value.charCodeAt(1);
                       return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';';
                   }).
                   replace(NON_ALPHANUMERIC_REGEXP, function (value) {
                       return '&#' + value.charCodeAt(0) + ';';
                   }).
                   replace(/</g, '&lt;').
                   replace(/>/g, '&gt;');
        },
        wrapMap: function (html) {
            // This is from jQuery, would like to replace with something else.
            // Takes an HTML snippet and converts it into elements
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
        }
    });
})();