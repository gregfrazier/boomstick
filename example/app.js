(function () {
    'use strict';

    // Create an application namespace
    var Demo = $boomStick.$namespace("Demo");

    // Single Component Controller
    Demo.$register("NameAgeController",
    	Demo.$inject( '$t', '$$ns', function($t, $$ns){
    		var nameAge = {
    			values: [{ Name: 'Wilbur', Age: '46' },{ Name: "Ted", Age: "98" }],
    			compileTemplate: function(settings) {
    				for(var setting in settings)
    					if(settings.hasOwnProperty(setting)) {
    						$t(this, settings[setting].scopedName, settings[setting], $$ns)
    							.then(function(templateReference){
    								templateReference.apply();
    							});
    					}
    			}
    		};
    		return nameAge;
    	})
	);

    // Application Controller
    Demo.$inject('NameAgeController', function(NameAgeController){
    	function bootstrap(){
    		NameAgeController.compileTemplate({
    			NameAgeDisplay: {
	    			scopedName: 'values',
	    			templateSelector: '#tmpl_name_age',
	    			targetSelector: '.container'
    			}
    		});
    	}
    	bootstrap();
    });

})();