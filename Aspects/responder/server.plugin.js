
exports.forLib = function (LIB) {
    var ccjson = this;

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

			const PINF = require("pinf-for-nodejs");
			const VM = require("pinf-for-nodejs/lib/vm").VM;

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


	            	var lib = Object.create(LIB);
                    require("../lib/server.plugin").forLib(lib);


					function getPageImplementation (pagePath, componentId, programGroup, programGroupPath, programAlias) {
						if (!getPageImplementation._implementations) {
							getPageImplementation._implementations = {};
						}
						var programKey = pagePath + ":" + componentId + ":" + programGroupPath + ":" + programAlias;
						if (
							!getPageImplementation._implementations[programKey] ||
							config.alwaysRebuild === false
						) {

	                        var componentContext = {};

							return getPageImplementation._implementations[programKey] = getCommonImplementation(programKey, componentContext, programGroup, programGroupPath, programAlias).then(function (impl) {
								return config.loadTemplateForPage(pagePath).then(function (template) {

									var scripts = template.getScripts();

									if (
										scripts[componentId] &&
										scripts[componentId].server
									) {

										var componentExports = {};
										scripts[componentId].server(componentExports);
                                        var implAPI = componentExports.main(lib, context).newImplementationInstance(componentContext);
										LIB.traverse(implAPI).forEach(function () {
											if (typeof this.node === "function") {
												LIB.traverse(impl).set(this.path, this.node);
											}
										});
									}

									return impl;
								});
							});
						} else {
						    console.log("Use cached page impl from key '" + programKey + "' while servicing:", pagePath, componentId, programGroup, programGroupPath, programAlias);
						}
						return getPageImplementation._implementations[programKey];
					}

					function getCommonImplementation (programKey, componentContext, programGroup, programGroupPath, programAlias) {

                        if (!programGroup) {
//							console.error("No programs found while servicing uri '" + req.params[0] + "'");
//							res.writeHead(404);
//							res.end("Not Found");
							return LIB.Promise.resolve({});
                        }

						if (!getCommonImplementation._implementations) {
							getCommonImplementation._implementations = {};
						}
						programKey = programKey + ":" + "component";
						if (
							!getCommonImplementation._implementations[programKey] ||
							config.alwaysRebuild === false
						) {

				    		var path = LIB.path.join(programGroupPath, programAlias);

				    		console.log("Mount program '" + programAlias + "' from path '" + path + "'");

				    		var programDescriptorPath = LIB.path.join(path, "server.program.json");

							// TODO: Use program descriptor for owning/parent/container application instead of
							//       the program descriptor of the component.
							getCommonImplementation._implementations[programKey] = (new LIB.Promise(function (resolve, reject) {
								return PINF.contextForModule(module, {
					                "PINF_PROGRAM": programDescriptorPath,
					                "PINF_RUNTIME": ""
					            }, function(err, context) {
					            	if (err) return reject(err);
									return resolve(context);
					            });
							})).then(function (pinfContext) {

								return new LIB.Promise(function (resolve, reject) {

									return LIB.fs.exists(programDescriptorPath, function (exists) {

										if (!exists) {
											// No server program exists so we return an empty widget stub and
											// assume the page scripts declare some methods for the widget.
											return resolve(lib.firewidgets.Widget(function (context) {
												return {}
											}).newImplementationInstance(componentContext));
										}

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
												verbose: true,
												ttl: -1
									        }, function(err, sandbox) {
									            if (err) return reject(err);
	
									            try {

                                                    var impl = sandbox.main(lib, context).newImplementationInstance(componentContext);

									            	resolve(impl);
	
									            } catch(err) {
									                return reject(err);
									            }
									        });
										});
									});
					            });
							});
						} else {
						    console.log("Use cached component impl from key '" + programKey + "' while servicing:", programGroup, programGroupPath, programAlias);
						}

						return getCommonImplementation._implementations[programKey];
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
//console.log("m", m);
                                        var pagePath = m[1].replace(/~/g, "/");
                                        var componentId = m[2].replace(/~/g, "/");
                                        var componentImpl = m[3].replace(/~/g, "/");
                                        var type = m[4];
                                        var pointer = m[5] || "";
/*
console.log("pagePath", pagePath);
console.log("componentId", componentId);
console.log("componentImpl", componentImpl);
console.log("type", type);
console.log("pointer", pointer);
*/
                                        var uriParts = componentImpl.split("/");
                                        
                                        // Determine the longest matching program group
                                        var programGroup = null;
                                        var programAlias = null;
                                        for (var i=uriParts.length ; i>0 ; i--) {
                                        	if (config.basePaths[uriParts.slice(0, i).join("/")]) {
                                        		programGroup = uriParts.splice(0, i).join("/");
                                        		programAlias = uriParts.join("/");
                                        		break;
                                        	}
                                        }

//console.log("programGroup", programGroup);
//console.log("programAlias", programAlias);

                                        return getPageImplementation(pagePath, componentId, programGroup, config.basePaths[programGroup], programAlias).then(function (impl) {

											if (type === "data") {
												return LIB.Promise.try(function () {
													if (!impl["#0.FireWidgets"]) {
                                                        throw new Error("'[#0.FireWidgets]' not declared for server API of component!");
													}
                                                    if (typeof impl["#0.FireWidgets"].getDataForPointer !== "function") {
                                                        throw new Error("'[#0.FireWidgets].getDataForPointer' not declared for server API of component!");
                                                    }
				                                    return impl["#0.FireWidgets"].getDataForPointer(
				                                        pointer,
				                                        req.query || {}
				                                    );
				                                }).timeout(5 * 1000, "'getDataForPointer' took too long").then(function (result) {
				                                    res.writeHead(200, {
				                                        "Content-Type": "application/json"
				                                    });
				                                    res.end(JSON.stringify(result, null, 4));
				                                    return;
				                                });
                                            } else
                                            if (type === "action") {

                                                return LIB.Promise.try(function () {
													if (!impl["#0.FireWidgets"]) {
                                                        throw new Error("'[#0.FireWidgets]' not declared for server API of component!");
													}
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
*/

/*

Load scripts and init them from HTML directly instead of parsing with chscript.

exports.forLib = function (LIB) {
    var ccjson = this;

// DEPRECATED: 0.FireWidgets now does this using pinf loader

    return LIB.Promise.resolve({
        forConfig: function (defaultConfig) {

            var Entity = function (instanceConfig) {
                var self = this;

                var config = {};
                LIB._.merge(config, defaultConfig);
                LIB._.merge(config, instanceConfig);
                config = ccjson.attachDetachedFunctions(config);

                var context = config.context();

                self.AspectInstance = function (aspectConfig) {

                    // TODO: Relocate to external parser.
                    function loadComponentScriptFromFile (path, componentId) {
// DEPRECATED: 0.FireWidgets now does this using pinf loader
// TODO: Port this and add support to 0.FireWidgets to do it without PINF loader.
                        return LIB.Promise.promisify(function (callback) {
                            return LIB.fs.readFile(path, "utf8", function (err, data) {
                                if (err) return callback(null);

                                if (!loadComponentScriptFromFile._cache) {
                                    loadComponentScriptFromFile._cache = {};
                                }
                                var existing = loadComponentScriptFromFile._cache[path] || null;
                                if (
                                    existing &&
                                    existing.data === data &&
                                    existing.componentId === componentId
                                ) {
                                    return callback(null, existing.func);
                                }
                                console.log("Loading source from path:", path);

                                // TODO: Use proper HTML parser.
                                var lines = data.split("\n");
                                var m = null;
                                var scriptInfo = null;
                                var scriptBuffer = null;
                                for (var i=0 ; i<lines.length ; i++) {
                                    if (scriptBuffer) {
                                        if (/<\/script>/.test(lines[i])) {
                                            if (
                                                scriptInfo.location === "server" &&
                                                scriptInfo.id === componentId
                                            ) {
                                                var code = scriptBuffer.join("\n");

                                                const ESPRIMA = require("esprima");

                                                // Ensure JS is valid.
                                                try {
                                                    ESPRIMA.parse(code);
                                                } catch (err) {
                                                    console.log("Syntax error for component '" + componentId + "' in file '" + path + "':", err.toString());
                                                    return callback(err);
                                                }

                                                loadComponentScriptFromFile._cache[path] = {
                                                    data: data,
                                                    componentId: componentId,
                                                    func: new Function(
                                                        "context",
                                                        code
                                                    )
                                                };
                                                return callback(null, loadComponentScriptFromFile._cache[path].func);
                                            }
                                            scriptInfo = null;
                                            scriptBuffer = null;
                                            continue;
                                        }
                                        scriptBuffer.push(lines[i]);
                                        continue;
                                    }
                                    // TODO: Be much more forgiving.
                                    m = lines[i].match(/<script component:id="([^"]+)" component:location="([^"]+)">/);
                                    if (m) {
                                        scriptInfo = {
                                            id: m[1],
                                            location: m[2]
                                        };
                                        scriptBuffer = [];
                                        continue;
                                    }
                                }
                                return callback(null, null);
                            });
                        })();
                    }

                    return LIB.Promise.resolve({
                        app: function () {
                            
                            return LIB.Promise.all([
                                context.getAdapterAPI("page"),
                                context.getAdapterAPI("data.knexjs.mapper")
                            ]).spread(function (page, mapper) {
                                
                                var wiredComponentCache = {};

                                function wireComponent (pagePath, firewidgetId) {

                                    var cacheId = pagePath + ":" + firewidgetId;
                                    if (
                                        wiredComponentCache[cacheId] &&
                                        config.alwaysRebuild === false
                                    ) {
                                        return wiredComponentCache[cacheId];
                                    }

                                    return (wiredComponentCache[cacheId] = loadComponentScriptFromFile(
                                        pagePath,
                                        firewidgetId
                                    ).then(function (script) {
                                        if (!script) {
                                            throw new Error("No server-side 'script' found for component '" + firewidgetId + "' on page '" + pagePath + "'");
                                        }
                                        return new LIB.Promise(function (resolve, reject) {
                                        
    console.log("Calling widget '" + firewidgetId + "' for page '" + pagePath + "'");
    
                                            try {
                                                script({
                                                    wireComponent: function (wiring) {
                        
                                                        var dataProducer = null;
                        
                                                        if (typeof wiring.produceData === "function") {
                                                            // TODO: Make which adapter to use configurable when refactoring to use ccjson
                                                            dataProducer = new mapper.Producer();
    
                                                            dataProducer.setDataProducer(wiring.produceData);
                                                        }
                        
                                                        return resolve({
                                                            dataProducer: dataProducer,
                                                            handleAction: wiring.handleAction || null
                                                        });
                                                    }
                                                });
                                            } catch (err) {
                                                console.error("Error wiring component using script:", err.stack);
                                                return reject(err);
                                            }
                                        });
                                    }));
                                }                                

                                return LIB.Promise.resolve(
                                    ccjson.makeDetachedFunction(
                                        function (req, res, next) {
    
                                            var pagePath = req.params[0];
                                            var firewidgetId = req.params[1];
                                            var type = req.params[2];
                                            var pointer = (req.params[3] || "").replace(/^\//, "");

                                            return page.contextForUri(pagePath).then(function (pageContext) {
                                                if (!pageContext) {
                                                    throw new Error("Could not load page context for uri '" + pagePath + "'");
                                                }

                                                var pagePath = pageContext.page.data.realpath;

                                                return wireComponent(pagePath, firewidgetId).then(function (wiring) {
                                                    
                                                    if (type === "pointer") {
                                                        return wiring.dataProducer.app({
                                                            context: context,
                                                            pointer: pointer
                                                        })(req, res, function (err) {
                                                            throw err;
                                                        });
                                                    } else
                                                    if (type === "action") {
                                                        return LIB.Promise.try(function () {
                                                            if (typeof wiring.handleAction !== "function") {
                                                                throw new Error("'handleAction' not declared for server API of component!");
                                                            }
                                                            return wiring.handleAction(
                                                                context,
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
                                                });
                                            }).catch(function (err) {
                                                console.error(err.stack);
                                                res.writeHead(500);
                                                res.end("Internal Server Error");
                                                return;
                                            });
                                        }
                                    )
                                );
                            });
                        }
                    });
                }

            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}

*/