
exports.forLib = function (LIB) {

    var Widget = function (impl) {
        if (!(this instanceof Widget)) {
            return new Widget(impl);
        }
        var self = this;
        self.impl = impl;
    }

    LIB.firewidgets = {
        Widget: Widget
    };

}
