
exports.forLib = function (LIB) {

    var Widget = function (descriptor, impl, globalContext) {
        if (!(this instanceof Widget)) {
            return new Widget(descriptor, impl, globalContext);
        }
        if (typeof descriptor === "function") {
            impl = descriptor;
            globalContext = impl;
            descriptor = {};
        }
        var self = this;
        self.impl = impl;
        self.descriptor = descriptor;
        self.globalContext = globalContext;
    }
    Widget.prototype.newImplementationInstance = function (context) {
        var self = this;
        var impl = {};
        function mergeImpl (parentImplementation) {
    		LIB.traverse(
    		    parentImplementation
    		).forEach(function () {
    			if (typeof this.node === "function") {
    				LIB.traverse(impl).set(this.path, this.node);
    			} else
    			if (this.key === "forceCompleteRerender") {
    				LIB.traverse(impl).set(this.path, this.node);
    			}
    		});
        }
        if (
            self.descriptor &&
            self.descriptor["@extends"]
        ) {
            self.descriptor["@extends"].forEach(function (widget) {
                mergeImpl(widget.newImplementationInstance(context));
            });
        }
        if (self.impl) {
            if (typeof self.impl === "function") {
                mergeImpl(self.impl(context));
            }
        }

        return impl;
    }

    LIB.firewidgets = {
        Widget: Widget
    };

}
