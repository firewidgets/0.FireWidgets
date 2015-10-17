

exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

			const PINF = require("pinf-for-nodejs");
			const SECURE_MIDDLEWARE = require("pinf-loader-secure-js/server/middleware");
			const ECC = require("pinf-loader-secure-js/client/ecc");

			function getPINFContext (programDescriptorPath) {
				if (!getPINFContext._context) {
					getPINFContext._context = new LIB.Promise(function (resolve, reject) {
						return PINF.contextForModule(module, {
			                "PINF_PROGRAM": programDescriptorPath,
			                "PINF_RUNTIME": ""
			            }, function(err, context) {
			            	if (err) return reject(err);
							return resolve(context);
			            });
					});
				}
				return getPINFContext._context;
			}

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig)
                LIB._.merge(config, instanceConfig)
                config = ccjson.attachDetachedFunctions(config);

                self.AspectInstance = function (aspectConfig) {

	                var config = {};
	                LIB._.merge(config, defaultConfig)
	                LIB._.merge(config, instanceConfig)
	                LIB._.merge(config, aspectConfig)
	                config = ccjson.attachDetachedFunctions(config);

// TODO: Get these from config
					var KEYS = ECC.generate(ECC.SIG_VER);

					function getBrowserBundlerApp (programGroupPath, programAlias) {
						if (!getBrowserBundlerApp._app) {
							getBrowserBundlerApp._app = {};
						}
						var programKey = programGroupPath + ":" + programAlias;
						if (!getBrowserBundlerApp._app[programKey]) {

				    		var path = LIB.path.join(programGroupPath, programAlias);

				    		console.log("Mount program '" + programAlias + "' from path '" + path + "'");

				    		var programDescriptorPath = LIB.path.join(path, "window.program.json");

							// TODO: Use program descriptor for owning/parent/container application instead of
							//       the program descriptor of the component.
							getBrowserBundlerApp._app[programKey] = getPINFContext(programDescriptorPath).then(function (pinfContext) {

								return SECURE_MIDDLEWARE.Bundles(
									PINF.hoist(programDescriptorPath, pinfContext.makeOptions({
										debug: true,
										verbose: true,
										PINF_RUNTIME: "",
								        $pinf: pinfContext,
								        waitForBuild: true,
								        autoloadSourceChanges: true,
								        plugins: {
								        	"require": {
								        		"chscript": {
								        			"#pinf-it-bundler": {
								        				process: function (descriptor, callback) {

								        					function preprocess (code) {
								        						// TODO: Support multiple pre-processors
								        						return config.formatter['chscript.preprocess'](code);
								        					}

								        					return preprocess(descriptor.code).then(function (code) {

																return config.formatter['chscript'](code).then(function (code) {

																	descriptor.code = code;
	
																	descriptor.syntax = "javascript";
																	descriptor.format = "commonjs";
	
																	return callback(null);
																}).catch(callback);
								        					});
								        				}
								        			}
								        		}
								        	}
								        }
								    })),
									{
										keys: KEYS
									}
								);
							});
						}

						return getBrowserBundlerApp._app[programKey];
					}


                    return LIB.Promise.resolve({
                    	// TODO: Use '#responder.app' or equivalent API contract
                        app: function () {
                            return LIB.Promise.resolve(
                                ccjson.makeDetachedFunction(
                            	    function (req, res, next) {

                                        // TODO: Relocate into generic helper.
                                        var expression = new RegExp(config.match.replace(/\//g, "\\/"));
                                        var m = expression.exec(req.params[0]);
                                        if (!m) return next();
                                        var uri = m[1];

                                        if (/^loader\.js$/.test(uri)) {
											return LIB.send(req, uri, {
												root: LIB.path.join(__dirname, "../../node_modules/pinf-loader-js")
											}).on("error", next).pipe(res);
                                        }
//console.log("uri", uri);

                                        var uriParts = uri.split("/");
                                        var componentPointerParts = uriParts.shift().split("~");
//console.log("componentPointerParts", componentPointerParts);

                                        // Determine the longest matching program group
                                        var programGroup = null;
                                        var programAlias = null;
                                        for (var i=componentPointerParts.length ; i>0 ; i--) {
                                        	if (config.basePaths[componentPointerParts.slice(0, i).join("/")]) {
                                        		programGroup = componentPointerParts.splice(0, i).join("/");
                                        		programAlias = componentPointerParts.join("/");
                                        		break;
                                        	}
                                        }
                                        if (!programGroup) {
											console.error("No programs found while servicing uri '/" + req.params[0] + "'");
											res.writeHead(404);
											res.end("Not Found");
											return;
                                        }

                                        req.url = "/" + uriParts.join("/");
                                        req.params = [
                                        	uriParts.join("/")
                            	    	];
/*
console.log("config.basePaths[programGroup]", config.basePaths[programGroup]);
console.log("programGroup", programGroup);
console.log("programAlias", programAlias);
console.log("req.url", req.url);
console.log("req.params", req.params);
*/

                                        var programGroupPath = config.basePaths[programGroup];
                                        
                                        return LIB.fs.existsAsync(programGroupPath).then(function (exists) {
                                        	if (!exists) {
												console.error("No programs found while servicing uri '/" + req.params[0] + "'");
												res.writeHead(204);
												res.end("");
												return;
                                        	}

	                                        return getBrowserBundlerApp(programGroupPath, programAlias).then(function (app) {
	                                        	return app(req, res, next);
	                                        }).catch(next);
                                        });
                            	    }
                                )
                            );
                        }
                    });
                }
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
