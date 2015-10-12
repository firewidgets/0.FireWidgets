
exports.main = function () {

	console.log("Hello world from client!!!!!!!!!....");

}


/*


const SECURE = require("pinf-loader-secure");

const UI = require("dp.ui");

console.log("UI", UI);

exports.main = function () {

	console.log("Hello World from DP server JS!");

	UI.say("Hello World from DP server JS!");


	var uri = "/bundles/main.js";

	return SECURE.sandbox(uri, {
		secure: {
			bundles: [
				"sha256:*"
			]
		}
	}, function(sandbox) {

	UI.say("Run SANDBOX MAIN");

		return sandbox.main(UI);

	}, function (err) {
		console.error("Error while loading bundle '" + uri + "':", err.stack);
	});

}


*/
