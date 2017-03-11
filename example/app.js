(function () {
    'use strict';

    // Create an application namespace
    var Demo = $boomStick.$namespace("Demo", ['componentFactory']);

    // Single Component Controller
    Demo.$register("NameAgeController", // want to change this to $component so you don't need to do it like this, it will auto inherit
        Demo.$inject('componentFactory', function(component){
            var instance = component; // don't like this. should be a new instance when it's injected.
            instance.values = [{ Name: 'Wilbur', Age: '46', Test:[{Value: '1'}, {Value: '2'}, {Value: '3'}] },
                { Name: "Ted", Age: "98", Test:[{Value: '4'}, {Value: '5'}, {Value: '6'}] }];
            return instance;
        })
    );

    Demo.$register("NameAge2Controller",
        Demo.$inject('componentFactory', function(component){
            var instance = component;
            instance.values = [{ Name: 'Ben', Age: '67', Test:[{Value: '1'}, {Value: '2'}, {Value: '3'}] },
                { Name: "Ryan", Age: "65", Test:[{Value: '4'}, {Value: '5'}, {Value: '6'}] }];
            return instance;
        })
    );

    // Application Controller
    Demo.$inject('NameAgeController', 'NameAge2Controller', function(NameAgeController, NameAge2Controller){
    	function bootstrap(){
    		NameAgeController.compileTemplate({
    			NameAgeDisplay: {
	    			scopedName: 'values',
	    			templateSelector: '#tmpl_name_age',
	    			targetSelector: '.container'
    			}              
    		});
            NameAge2Controller.compileTemplate({
                NameAgeDisplay: {
                    scopedName: 'values',
                    templateSelector: '#tmpl_name_age',
                    targetSelector: '#container2'
                }
            });            
    	}
    	bootstrap();
    });

})();