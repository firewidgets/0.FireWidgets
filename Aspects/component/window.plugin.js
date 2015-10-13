
exports.forLib = function (LIB) {

    // This should be injected into the lib already.    
    const PINF = window.PINF;

    var exports = {};

    exports.forContext = function (context) {

        var implementations = {};

        return {
            loadImplementationForPointer: function (pointer) {

                // TODO: Use namespace from config
                if (!/^#0.FireWidgets\//.test(pointer)) {
                    return null;
                }

                pointer = pointer.replace(/^#0.FireWidgets\//, "");

                // TODO: This URI must be resolved via the 'context' so the URI pattern may be declared
                // TODO: Convert '~' in 'pointer' to '/'
    	        var uri = context.contexts.page.resolveUri("/cores/export/0.FireWidgets/" + pointer + "/main.js");

                if (!implementations[pointer]) {
                    implementations[pointer] = new LIB.Promise(function (resolve, reject) {

                        // Use the PINF Loader to load the widget
                        // @see https://github.com/pinf/pinf-loader-js
                    	PINF.sandbox(uri, resolve, reject);

                    }).catch(function (err) {
                        console.error("Error loading firewidget implementation from '" + uri + "':", err.stack);
                        throw err;
                    }).then(function (sandbox) {

                        // TODO: Only map a subset of the LIB API into the widget context
                        //       based on what the widget declares it needs and based on what
                        //       our context is allowed to provide.

                        var lib = Object.create(LIB);
                        require("../lib/window.plugin").forLib(lib);

                        return sandbox.main(lib, context);
                    }).catch(function (err) {
                        console.error("Error initializing firewidget implementation from '" + uri + "':", err.stack);
                        throw err;
                    }).then(function (impl) {

                        impl.impl.resolveActionUri = function (pageUri, componentId, componentImplId) {
                            return "/cores/responder/0.FireWidgets/" + pageUri.replace(/^\//, "").replace(/\//g, "~") + "/" + componentImplId.replace(/^#0.FireWidgets\//, "").replace(/\//g, "~") + "/action";
                        }

                        impl.impl.resolveDataUri = function (pageUri, componentId, componentImplId) {
                            return "/cores/responder/0.FireWidgets/" + pageUri.replace(/^\//, "").replace(/\//g, "~") + "/" + componentImplId.replace(/^#0.FireWidgets\//, "").replace(/\//g, "~") + "/data";
                        }

                        return (implementations[pointer] = impl);
                    });
                }

                return implementations[pointer];
            },
            getImplementationForPointer: function (pointer) {
                return implementations[pointer.replace(/^#0.FireWidgets\//, "")];
            }
        };
    }

    return exports;
}
