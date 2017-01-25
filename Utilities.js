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
                }
            });
})();