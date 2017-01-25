(function () {
    'use strict';

    // Base URL can be specified in the title by using a BASE tag with an HREF. Otherwise defaults to /
    var base = document.querySelector('base'), 
        baseURL = (base !== null && base !== undefined) ? base.href : '/';

    // Global Dependencies
    $boomStick
    	.$register("$delimiters", { attrPrefix: 'bs-' })      // Modify this to change the prefix on the app tags
    	.$register('$q', Q)                                   // Q library, required for the time being
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
        });

})();