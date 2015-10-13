
exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

			const PINF = require("pinf-for-nodejs");
			const VM = require("pinf-for-nodejs/lib/vm").VM;

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

                var context = config.context();

                self.AspectInstance = function (aspectConfig) {

	                var config = {};
	                LIB._.merge(config, defaultConfig)
	                LIB._.merge(config, instanceConfig)
	                LIB._.merge(config, aspectConfig)
	                config = ccjson.attachDetachedFunctions(config);
	                
					function getImplementation (programGroup, programGroupPath, programAlias) {
						if (!getImplementation._implementations) {
							getImplementation._implementations = {};
						}
						var programKey = programGroupPath + ":" + programAlias;
						if (!getImplementation._implementations[programKey]) {

				    		var path = LIB.path.join(programGroupPath, programAlias);

				    		console.log("Mount program '" + programAlias + "' from path '" + path + "'");

				    		var programDescriptorPath = LIB.path.join(path, "server.program.json");

							// TODO: Use program descriptor for owning/parent/container application instead of
							//       the program descriptor of the component.
							getImplementation._implementations[programKey] = getPINFContext(programDescriptorPath).then(function (pinfContext) {
								
								return new LIB.Promise(function (resolve, reject) {

						    		console.log("Bundle program '" + programAlias + "' from path '" + path + "'");

						            var options = {
						                distPath: LIB.path.join(config.distPath, programGroup, programAlias),
										debug: true,
										verbose: true
						            };
						            return pinfContext.bundleProgram(options, function(err, summary) {
						                if (err) return reject(err);

							    		console.log("Load program '" + programAlias + "' from path '" + path + "'");
						                
										// Handle the "main" case.
	
										// TODO: Make other program bundles available via dynamic include.
								        var vm = new VM(pinfContext);
							//			try { FS.removeSync(PATH.join(__dirname, ".rt")); } catch(err) {}
							//            PINF.reset();

								        return vm.loadProgram(programDescriptorPath, {
								            globals: {
								                console: {
								                    log: function(message) {
								                    	var args = Array.prototype.slice.call(arguments);
								                    	args.unshift("[program:bundle:" + programGroupPath + ":" + programAlias + "]");
								                    	console.log.apply(console, args);
								                    },
								                    error: console.error
								                }
								            },
								            debug: true,
											verbose: true
								        }, function(err, sandbox) {
								            if (err) return reject(err);

								            try {
								            	
								            	var lib = LIB._.clone(LIB);
		            	                        require("../lib/server.plugin").forLib(lib);
		            	                        
		            	                        var componentContext = {};

								            	resolve(sandbox.main(lib, context).impl(componentContext));

								            } catch(err) {
								                return reject(err);
								            }
								        });
									});
					            });
							});
						}

						return getImplementation._implementations[programKey];
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

                                        var pagePath = m[1].replace(/~/g, "/");
                                        var componentUri = m[2].replace(/~/g, "/");
                                        var type = m[3];
                                        var pointer = m[4] || "";

                                        var uriParts = componentUri.split("/");
                                        
                                        // Determine the longest matching program group
                                        var programGroup = null;
                                        var programAlias = null;
                                        for (var i=uriParts.length ; i>0 ; i--) {
                                        	if (config.basePaths[uriParts.slice(0, i).join("/")]) {
                                        		programGroup = uriParts.splice(0, i).join("/");
                                        		programAlias = uriParts.shift().replace(/~/g, "/");
                                        		break;
                                        	}
                                        }
                                        if (!programGroup) {
											console.error("No programs found while servicing uri '/" + req.params[0] + "'");
											res.writeHead(404);
											res.end("Not Found");
											return;
                                        }

                                        return getImplementation(programGroup, config.basePaths[programGroup], programAlias).then(function (impl) {
                                        	
											if (type === "data") {

												return LIB.Promise.try(function () {
                                                    if (typeof impl["#0.FireWidgets"].handleActionForPointer !== "function") {
                                                        throw new Error("'[#0.FireWidgets].getDataForPointer' not declared for server API of component!");
                                                    }
				                                    return impl["#0.FireWidgets"].getDataForPointer(
				                                        pointer,
				                                        req.query || {}
				                                    );
				                                }).then(function (result) {
				                                    res.writeHead(200, {
				                                        "Content-Type": "application/json"
				                                    });
				                                    res.end(JSON.stringify(result, null, 4));
				                                    return;
				                                });
                                            } else
                                            if (type === "action") {

                                                return LIB.Promise.try(function () {
                                                    if (typeof impl["#0.FireWidgets"].handleActionForPointer !== "function") {
                                                        throw new Error("'[#0.FireWidgets].handleActionForPointer' not declared for server API of component!");
                                                    }
                                                    return impl["#0.FireWidgets"].handleActionForPointer(
                                                        req.body.action,
                                                        req.body.payload
                                                    );
                                                }).then(function (response) {
                                                    res.writeHead(200, {
                                                        "Content-Type": "application/json"
                                                    });
                                                    res.end(JSON.stringify(response, null, 4));
                                                    return;
                                                });
                                            } else {
                                                throw new Error("Route type '" + type + "' not supported!");
                                            }

                                        }).catch(function (err) {
                                            console.error(err.stack);
                                            res.writeHead(500);
                                            res.end("Internal Server Error");
                                            return;
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




/*

const PATH = require("path");
const FS = require("fs-extra");
const PINF = require("pinf-for-nodejs");
const VM = require("pinf-for-nodejs/lib/vm").VM;
const EXPRESS = require("express");
const COMPRESSION = require('compression');
const SEND = require("send");
const HTTP = require("http");
const SECURE_MIDDLEWARE = require("pinf-loader-secure-js/server/middleware");
const ECC = require("pinf-loader-secure-js/client/ecc");


const PORT = process.env.PORT || 8080;


exports.FS = FS;
exports.PINF = PINF;

FS.removeSync(PATH.join(__dirname, "client/.rt"));
FS.removeSync(PATH.join(__dirname, "client/bundles"));

exports.main = function(options, callback) {

	var app = EXPRESS();

	app.use(COMPRESSION());

	app.get(/^\/lib\/pinf-loader-js\/(.+)$/, function (req, res, next) {
		return SEND(req, req.params[0], {
			root: PATH.join(__dirname, "node_modules/pinf-loader-js")
		}).on("error", next).pipe(res);
	});

//console.log("options", options);


	var programInfo = options.$pinf.getProgramInfo();



	app.get(/^\/(boot.+)$/, PINF.hoist(PATH.join(__dirname, "./client/program.json"), options.$pinf.makeOptions({
		debug: true,
		verbose: true,
		PINF_RUNTIME: "",
        $pinf: options.$pinf
    })));



	// Watch loaded files for changes and kill process if detected.
	var files = {};
	function monitorChildren (node) {
		if (node.filename) {
			files[node.filename] = true;
		}
		if (!node.children) return;
		node.children.forEach(monitorChildren);
	}
	monitorChildren(module);
	function checkFiles () {
		function checkFile (path) {
			FS.stat(path, function (err, stat) {
				if (err) return;
				if (files[path] === true) {
					files[path] = stat.mtime.getTime();
				}
				if (files[path] !== stat.mtime.getTime()) {
					console.log("Commit suicide as a source file '" + path + "' has changed ('" + stat.mtime + "' !== '" + files[path] + "').");
					process.exit(0);
				}
			});
		}
		for (var path in files) {
			checkFile(path);
		}
	}
	setInterval(checkFiles, 5 * 1000);




	var KEYS = ECC.generate(ECC.SIG_VER);

    if (
    	programInfo.program.descriptor.config["dp.server"] &&
    	programInfo.program.descriptor.config["dp.server"].client &&
    	programInfo.program.descriptor.config["dp.server"].client.programs
    ) {
    	var programs = programInfo.program.descriptor.config["dp.server"].client.programs;
    	for (var id in programs) {
    		var path = PATH.join(programInfo.program.path, programs[id]);
    		var route = "/bundles/" + id;
    		var routeParts = route.split("/");

    		var re = new RegExp("^" + routeParts.slice(0, routeParts.length-1).join("\\/") + "\\/(" + routeParts.pop() + ".+)$");

    		console.log("Mount program '" + id + "' from path '" + path + "' at route '" + re + "'");

			app.get(re, SECURE_MIDDLEWARE.Bundles(
				PINF.hoist(PATH.join(path, "program.json"), options.$pinf.makeOptions({
					debug: true,
					verbose: true,
					PINF_RUNTIME: "",
			        $pinf: options.$pinf
			    })),
				{
					keys: KEYS
				}
			))
    	}
    }


    if (
    	programInfo.program.descriptor.config["dp.server"] &&
    	programInfo.program.descriptor.config["dp.server"].server &&
    	programInfo.program.descriptor.config["dp.server"].server.programs
    ) {
	    var programBundles = {};

    	var programs = programInfo.program.descriptor.config["dp.server"].server.programs;
    	Object.keys(programs).forEach(function (programId) {

    		var path = PATH.join(programInfo.program.path, programs[programId]);

    		console.log("Prepare program '" + programId + "' from path '" + path + "'");

	        return PINF.contextForModule(module, {
	            "PINF_PROGRAM": PATH.join(path, "program.json"),
	            "PINF_RUNTIME": "",
	            verbose: true,
	            debug: true,
	            $pinf: options.$pinf
	        }, function(err, context) {
	            if (err) return callback(err);

	            var options = {
//	                distPath: PATH.join(__dirname, "assets/bundles/" + dirname)
					debug: true,
					verbose: true
	            };
	            return context.bundleProgram(options, function(err, summary) {
	                if (err) return callback(err);

//console.log("PROGRAM summary", summary);

					programBundles[programId] = summary;



					if (programId !== "main") return;

					// Handle the "main" case.

					// TODO: Make other program bundles available via dynamic include.

			        var vm = new VM(context);
			//			try { FS.removeSync(PATH.join(__dirname, ".rt")); } catch(err) {}
			//            PINF.reset();

					var path = PATH.join(programInfo.program.path, programs[programId]);

					console.log("Load program '" + programId + "' from path '" + path + "'");

			        return vm.loadPackage(path, {
			            globals: {
			                console: {
			                    log: function(message) {
			                    	var args = Array.prototype.slice.call(arguments);
			                    	args.unshift("[program:bundle:" + programId + "]");
			                    	console.log.apply(console, args);
			                    },
			                    error: console.error
			                }
			            },
			            debug: true,
						verbose: true
			        }, function(err, sandbox) {
			            if (err) return done(err);

			            try {
			            	sandbox.main();

							console.log("Loaded program '" + programId + "' from path '" + path + "'");

			            } catch(err) {
			                return callback(err);
			            }
			        });

	            });
	    	});
    	});
    }


	app.get(/^(\/.*)$/, function (req, res, next) {
		var path = req.params[0];
		if (path === "/") path = "/index.html";
		return SEND(req, path, {
			root: PATH.join(__dirname, "www")
		}).on("error", next).pipe(res);
	});


	HTTP.createServer(app).listen(PORT)

	// Wait for debug output from `PINF.hoist()` to finish.
	setTimeout(function() {
		console.log("Open browser to: http://localhost:" + PORT + "/");
	}, 2 * 1000);

};


if (require.main === module) {
	PINF.main(exports.main, module);
}

*/
