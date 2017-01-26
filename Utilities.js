(function () {
    'use strict';

    $boomStick.$register("$utils", {
        forEachElement: function (htmlCollection, callbackScope, callback) {
            for (var i = 0; 
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
        }
    });
})();