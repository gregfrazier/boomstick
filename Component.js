// jshint esversion: 6
(function () {
    'use strict';

    $boomStick.$registerFactory("componentFactory", ['$delimiters', '$baseURL', '$utils', '$t', '$$ns', function (delimiters, baseURL, $utils, $t, $$ns) {
    		return function() {
    			this.compileTemplate = function(settings) {
    				for(var setting in settings)
    					if(settings.hasOwnProperty(setting)) {
    						$t(this, settings[setting].scopedName, settings[setting], $$ns)
    							.then(function(templateReference){
    								templateReference.apply();
    								// Post Link Function
    								if(settings.postLinkFn !== undefined && settings.postLinkFn instanceof Function)
    									settings.postLinkFn();
    							});
    					}
    			};
    		};
        }]
    );

})();