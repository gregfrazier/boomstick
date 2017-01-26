(function () {
    'use strict';
    // WIP
    $boomStick.$register("$Model", function () {
        return {
            // In place array binding - allows an array to be mutable
            attachArray: function(dest, name, src) {
                Object.defineProperty(dest, name, {
                    get: function () {
                        return src;
                    },
                    set: function (value) {
                        src.splice(0);
                        Array.prototype.push.apply(src, value);
                    },
                    enumerable: true
                });
            }
        };
    });
})();