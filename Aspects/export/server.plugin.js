

exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

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

					function getBrowserBundlerApp (programGroupPath, programAlias) {
						if (!getBrowserBundlerApp._app) {
							getBrowserBundlerApp._app = {};
						}
						var programKey = programGroupPath + ":" + programAlias;
						if (!getBrowserBundlerApp._app[programKey]) {
				
							const PINF = require("pinf-for-nodejs");
							const SECURE_MIDDLEWARE = require("pinf-loader-secure-js/server/middleware");
//							const ECC = require("pinf-loader-secure-js/client/ecc");

// TODO: Get these from config
							//var KEYS = ECC.generate(ECC.SIG_VER);

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

				    		var path = LIB.path.join(programGroupPath, programAlias);

				    		console.log("Mount program '" + programAlias + "' from path '" + path + "'");

				    		var programDescriptorPath = LIB.path.join(path, "window.program.json");

							// TODO: Use program descriptor for owning/parent/container application instead of
							//       the program descriptor of the component.
							getBrowserBundlerApp._app[programKey] = getPINFContext(programDescriptorPath).then(function (pinfContext) {

								return SECURE_MIDDLEWARE.Bundles(
									PINF.hoist(programDescriptorPath, pinfContext.makeOptions({
								        distPath: LIB.path.join(config.distPath, programAlias),
										debug: true,
										verbose: true,
										PINF_RUNTIME: "",
								        $pinf: pinfContext,
								        waitForBuild: true,
								        autoloadSourceChanges: true,
								        plugins: {
								        	"require": {
								        		"remount": {
								        			"#pinf-it-bundler": {
								        				process: function (descriptor, callback) {
								        					
								        					if (config.subUri) {
									        					var html = descriptor.code;
	
							                                    // Re-base all links, style and script paths.
									        					// TODO: Use 'chscript' commonjs module parser to open chscript file, traverse the dom trees and write them back out to file.
							                                    var re = /(h\("a.+?href":"|h\("img.+?src":"|h\("script.+?src":"|h\("link.+?href":")(\/[^"]*)/g;
							                                    var m = null;
							                                    var replace = {};
							                                    while ( (m = re.exec(html)) ) {
							                                        if (m[2].substring(0, config.subUri.length + 1) === config.subUri + "/") {
							                                            // Path is already adjusted.
							                                        } else {
							                                            replace[m[0]] = m;
							                                        }
							                                    }
							                                    Object.keys(replace).forEach(function (key) {
							                                        html = html.replace(
							                                            new RegExp(LIB.RegExp_Escape(replace[key][0]), "g"),
							                                            replace[key][1] + config.subUri + replace[key][2]
							                                        );
							                                    });

									        					descriptor.code = html;
															}

															return callback(null);
								        				}
								        			}
								        		},
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
										keys: null//KEYS
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

										// Return already built file if we can
								        var path = LIB.path.join(config.distPath, programAlias, req.params[0]);

										return LIB.fs.existsAsync(path).then(function (exists) {
									        if (
									        	exists &&
									        	(
									        		/\.dist\./.test(path) ||
									        		config.alwaysRebuild === false
									        	)
									        ) {
									           	// We return a pre-built file if it exists and are being asked for it
												return LIB.send(req, LIB.path.basename(path), {
                                    				root: LIB.path.dirname(path)
                                    			}).on("error", next).pipe(res);
									        }


											// Build file from sources

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
	                            	    }).catch(next);
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
