(function () {
    'use strict';

    $boomStick.$register("$TemplateCache",
        $boomStick.$inject('$q', '$delimiters', '$baseURL', '$fetch', function (Q, delimiters, baseURL, $fetch) {
            var $TemplateCache = function () {
                this.$$templates = [];
            };
            $TemplateCache.prototype.$get = function (templateURL) {
                var defer = Q.defer(), 
                    template = this.$find(templateURL), 
                    templCache = this;

                if (template == null) {
                    $fetch(templateURL, {
                        method: 'GET',
                        credentials: "same-origin"
                    }).then(function(response) {
                        return response.text();
                    }).then(function(data){
                        templCache.$store(templateURL, data);
                        defer.resolve(data);
                    });
                } else {
                    return Q.fcall(function () {
                        return template.code;
                    });
                }
                return defer.promise;
            };
            $TemplateCache.prototype.$find = function (templateURL) {
                return this.$$templates.filter(function (template) {
                    return template.url == templateURL;
                }).reduce(function (p, c) { return p === null ? c : p; }, null);
            };
            $TemplateCache.prototype.$store = function (templateURL, data) {
                this.$$templates.push({ url: templateURL, code: data });
            };
            return new $TemplateCache();
        }));
})();