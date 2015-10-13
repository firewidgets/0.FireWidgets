
exports.main = function (LIB, context) {

	return LIB.firewidgets.Widget(function (context) {

		return {

			"#chscript:redraw": {

				template: require("chscript!./template.htm"),

				getTemplateData: function (data) {
	                return {
	                    "$views": {
	                        "default": true
	                    },
	                    "message": "Loaded! Click count: " + (context.get("count") || 0)
	                };
	            },
	            afterRender: function (domNode, data) {
	            	domNode.on("click", function () {
	            		context.set("count", (context.get("count") || 0) + 1);
	            	});
	            }
			}
		};

	}, context);
}
