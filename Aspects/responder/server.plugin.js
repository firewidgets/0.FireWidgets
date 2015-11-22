
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

                var context = config.context();

                self.AspectInstance = function (aspectConfig) {

	                var config = {};
	                LIB._.merge(config, defaultConfig)
	                LIB._.merge(config, instanceConfig)
	                LIB._.merge(config, aspectConfig)
	                config = ccjson.attachDetachedFunctions(config);


	            	var lib = Object.create(LIB);
                    require("../lib/server.plugin").forLib(lib);


                    var bundleProgram_implementations = {};

					function getPageImplementation (pagePath, componentId, programGroup, programGroupPath, programAlias, programModule) {
						if (!getPageImplementation._implementations) {
							getPageImplementation._implementations = {};
						}
						var programKey = pagePath + ":" + componentId + ":" + programGroupPath + ":" + programAlias + ":" + programModule;

					    if (LIB.VERBOSE) console.log("getPageImplementation()", programKey);

						if (
							!getPageImplementation._implementations[programKey] ||
							config.alwaysRebuild !== false
						) {

	                        var componentContext = {};

							return getPageImplementation._implementations[programKey] = getCommonImplementation(programKey, componentContext, programGroup, programGroupPath, programAlias, programModule).then(function (impl) {

        					    if (LIB.VERBOSE) console.log("loadTemplateForPage", pagePath);

								return config.loadTemplateForPage(pagePath).then(function (template) {

            					    if (LIB.VERBOSE) console.log("loadTemplateForPage done", pagePath, template);

                                    if (template) {
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
                                    }

									return impl;
								});
							});
						} else {
						    console.log("Use cached page impl from key '" + programKey + "' while servicing:", pagePath, componentId, programGroup, programGroupPath, programAlias);
						}
						return getPageImplementation._implementations[programKey];
					}

					function getCommonImplementation (programKey, componentContext, programGroup, programGroupPath, programAlias, programModule) {

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

					    if (LIB.VERBOSE) console.log("getCommonImplementation()", programKey);

						if (
						    !getCommonImplementation._implementations[programKey] ||
						    config.alwaysRebuild !== false
						) {

						    function runPrebuilt () {
						        
						        return LIB.Promise.try(function() {
        							if (config.alwaysRebuild !== false) {
        							    // We are not configured to use the cached version.
                                        if (LIB.VERBOSE) console.log("Build bundle for '" + bundleDistPath + "' due to 'config.alwaysRebuild !== false'");
        							    return;
        							}
        							// We should try and use the cached version.

        						    // First we see if we can have a pre-built version
                                    var programDistBasePath = LIB.path.join(config.distPath, programGroup, programAlias);

                                    // TODO: Do not assume 'main.js' as root bundle and check program descriptor for main module.
                                    var bundleDistPath = programDistBasePath + "/" + (programModule || "main.js");
                                    return LIB.fs.existsAsync(bundleDistPath).then(function (exists) {
                                        if (!exists) {
                                            // No pre-built bundle found.
                                            if (LIB.VERBOSE) console.log("No pre-built bundle found at:", bundleDistPath);
                                            return;
                                        }

                                        // Load pre-built bundle using minimal PINF runtime loader.

                                        if (LIB.VERBOSE) console.log("Load pre-built bundle:", bundleDistPath);

                            			const PINF_LOADER = require("pinf-for-nodejs/lib/loader");

                                        return LIB.Promise.promisify(function (callback) {

                                            return PINF_LOADER.sandbox(bundleDistPath, {
                            					verbose: LIB.VERBOSE || false,
                            					debug: LIB.VERBOSE || false,
                            					ttl: 0,     // Cache indefinite
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
                            					resolveDynamicSync: function (moduleObj, pkg, sandbox, canonicalId, options) {
                            						if (/^\//.test(canonicalId)) {
                            							return LIB.path.join(moduleObj.bundle.replace(/\.js$/, ""), canonicalId);
                            						} else {
                            							// TODO: Deal with package alias prefixes.
                            						}
                            						console.log("canonicalId", canonicalId);
                            		            	throw new Error("`resolveDynamicSync` should not be called here! Make sure all dynamic links are declared in the package descriptor!");
                            		            },
                            					ensureAsync: function(moduleObj, pkg, sandbox, canonicalId, options, callback) {
                            						// We assume dynamic link points to a generated bundle.
                            						return callback(null);
                            		            }
                            				}, function(sandbox) {
                            					return callback(null, sandbox);
                            				}, callback);

                                        })().then(function (sandbox) {

                                            var impl = sandbox.main(lib, context);

                                            if (LIB.VERBOSE) console.log("Using pre-built bundle from:", bundleDistPath);

                                            // We successfully loaded the pre-built bundle and now set it for use.
                                            getCommonImplementation._implementations[programKey] = impl.newImplementationInstance(componentContext);
                                        });
                                    });
						        });
						    }

						    return runPrebuilt().then(function () {

    						    if (
    						        getCommonImplementation._implementations[programKey] &&
    						        config.alwaysRebuild === false
    						    ) {
    						        return getCommonImplementation._implementations[programKey];
    						    }


                                // Build bundle ...


                    			const PINF_CONTEXT = require("pinf-for-nodejs/lib/context");
                    			const VM = require("pinf-for-nodejs/lib/vm").VM;

    				    		var path = LIB.path.join(programGroupPath, programAlias);
    
    				    		console.log("Mount program '" + programAlias + "' from path '" + path + "'");
    
    				    		var programDescriptorPath = LIB.path.join(path, "server.program.json");


    							// TODO: Use program descriptor for owning/parent/container application instead of
    							//       the program descriptor of the component.
    							return getCommonImplementation._implementations[programKey] = LIB.fs.existsAsync(programDescriptorPath).then(function (exists) {
    
									if (!exists) {
										// No server program exists so we return an empty widget stub and
										// assume the page scripts declare some methods for the widget.
										return lib.firewidgets.Widget(function (context) {
											return {}
										}).newImplementationInstance(componentContext);
									}
    
        							return (new LIB.Promise(function (resolve, reject) {
        
        								return PINF_CONTEXT.contextForModule(module, {
        					                "PINF_PROGRAM": programDescriptorPath,
        					                "PINF_RUNTIME": ""
        					            }, function(err, context) {
        					            	if (err) return reject(err);
        									return resolve(context);
        					            });
        							})).then(function (pinfContext) {

        							    return LIB.Promise.promisify(function (callback) {
        							        
                            		        var vm = new VM(pinfContext);
                            		        return vm.loadProgram(programDescriptorPath, {
//                            		        return vm.loadProgram(LIB.path.basename(programDescriptorPath), {
//                            		            rootPath: LIB.path.dirname(programDescriptorPath),
                            					distPath: LIB.path.join(config.distPath, programGroup, programAlias),
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
        								        rootModule: programModule,
        								        rootModuleBundleOnly: true,
        								        omitMtimeMeta: true,
        										debug: LIB.VERBOSE,
        										verbose: LIB.VERBOSE,
                            					ttl: -1     // Always re-build
                            		        }, function (err, sandbox) {
                            		        	if (err) return callback(err);
    
    								            try {
    
                                                    var impl = sandbox.main(lib, context);
    
                                                    impl = impl.newImplementationInstance(componentContext);
    
    								            	return callback(null, impl);
    
    								            } catch (err) {
    								                return callback(err);
    								            }
                            		        });
        							    })();
        							});
    							});


/*    						        
                    			const PINF_CONTEXT = require("pinf-for-nodejs/lib/context");
                    			const VM = require("pinf-for-nodejs/lib/vm").VM;
    
    				    		var path = LIB.path.join(programGroupPath, programAlias);
    
    				    		console.log("Mount program '" + programAlias + "' from path '" + path + "'");
    
    				    		var programDescriptorPath = LIB.path.join(path, "server.program.json");
    
    							function bundleProgram (pinfContext) {
    
                                    var programCachePath = LIB.path.join(config.distPath, programGroup, programAlias);
    
            						if (bundleProgram_implementations[programCachePath]) {
        					    		console.log("Use existing loaded bundle for program '" + programAlias + "' from path '" + programCachePath + "'");
            						    return bundleProgram_implementations[programCachePath];
            						}
    
    					    		console.log("Bundle program '" + programAlias + "' from path '" + path + "'");
    
                                    // TODO: Check specific file being requested instead of whole directory.
                                    //       This will be needed when dynamic sub-bundles get loaded.
    								return (bundleProgram_implementations[programCachePath] = LIB.fs.existsAsync(programCachePath).then(function (exists) {
    							        if (
    							        	exists &&
    						        		config.alwaysRebuild === false
    							        ) {
    							            // We do not re-build the bundle
    							            console.log("Use cached bundle from: ", programCachePath);
    							            return;
    							        }
    
    							        // We re-build the bundle
    
    								    return new LIB.Promise(function (resolve, reject) {
    
    console.log(" ** BUNDLING (getCommonImplementation):", programKey);
    
    							            return pinfContext.bundleProgram({
    							                distPath: LIB.path.join(config.distPath, programGroup, programAlias),
        								        rootModule: programModule,
        								        rootModuleBundleOnly: true,
        								        omitMtimeMeta: true,
    											debug: true,
    											verbose: true
    							            }, function(err, summary) {
    							                if (err) return reject(err);
    
                                                return resolve();
    							            });
    						            });
    								}));
    							}
    
    							// TODO: Use program descriptor for owning/parent/container application instead of
    							//       the program descriptor of the component.
    							return getCommonImplementation._implementations[programKey] = (new LIB.Promise(function (resolve, reject) {
    
    								return PINF_CONTEXT.contextForModule(module, {
    					                "PINF_PROGRAM": programDescriptorPath,
    					                "PINF_RUNTIME": ""
    					            }, function(err, context) {
    					            	if (err) return reject(err);
    									return resolve(context);
    					            });
    							})).then(function (pinfContext) {
    
    								return LIB.fs.existsAsync(programDescriptorPath).then(function (exists) {
    
    									if (!exists) {
    										// No server program exists so we return an empty widget stub and
    										// assume the page scripts declare some methods for the widget.
    										return lib.firewidgets.Widget(function (context) {
    											return {}
    										}).newImplementationInstance(componentContext);
    									}
    
    									return bundleProgram(pinfContext).then(function () {
    
    									    return new LIB.Promise(function (resolve, reject) {
    
    								    		console.log("Load program '" + programAlias + "' from path '" + path + "'");
    
    											// Handle the "main" case.
    console.log(" ** LOADING IN VM (getCommonImplementation):", programKey);
    
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
            								        rootModule: programModule,
            								        rootModuleBundleOnly: true,
            								        omitMtimeMeta: true,
    									            debug: true,
    												verbose: true,
    												ttl: -1
    									        }, function(err, sandbox) {
    									            if (err) return reject(err);
    
    									            try {
    
                                                        var impl = sandbox.main(lib, context);
    
                                                        impl = impl.newImplementationInstance(componentContext);
    
    									            	resolve(impl);
    
    									            } catch(err) {
    									                return reject(err);
    									            }
    									        });
    									    });
    									});
    								});
    							});
*/    							
						    });
						} else {
						    if (LIB.VERBOSE) console.log("Use cached component impl from key '" + programKey + "' while servicing:", programGroup, programGroupPath, programAlias);
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

                                        var pagePath = m[1].replace(/~/g, "/");
                                        var componentId = m[2].replace(/~/g, "/");
                                        var componentImpl = m[3];
                                        var type = m[4];
                                        var pointer = m[5] || "";
/*
console.log("pagePath", pagePath);
console.log("componentId", componentId);
console.log("componentImpl", componentImpl);
console.log("type", type);
console.log("pointer", pointer);
*/
                                        var uriParts = componentImpl.split(":");
                                        var componentPointerParts = uriParts.shift().split("~");
                                        if (uriParts.length > 0) {
	                                        uriParts = uriParts[0].split("~");
                                        }

//console.log("componentPointerParts", componentPointerParts);
//console.log("config.basePaths", config.basePaths);

                                        // Determine the longest matching program group
                                        var programGroup = "";
                                        var programAlias = "";
                                        for (var i=componentPointerParts.length ; i>0 ; i--) {
                                        	if (config.basePaths[componentPointerParts.slice(0, i).join("/")]) {
                                        		programGroup = componentPointerParts.splice(0, i).join("/");
                                        		programAlias = componentPointerParts.join("/");
                                        		break;
                                        	}
                                        }

//console.log("programGroup", programGroup);
//console.log("programAlias", programAlias);

                            	    	var programModule = uriParts.join("/");
                            	    	if (programModule) {
                            	    	    programModule += ".js";
                            	    	}

                                        var programGroupPath = "";
                                        if (
                                            programGroup &&
                                            config.basePaths[programGroup]
                            	        ) {
                            	            programGroupPath = config.basePaths[programGroup];
                            	        }

                                        return getPageImplementation(pagePath, componentId, programGroup, programGroupPath, programAlias, programModule).then(function (impl) {

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
				                                }).timeout(15 * 1000, "'getDataForPointer' took too long").then(function (result) {
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