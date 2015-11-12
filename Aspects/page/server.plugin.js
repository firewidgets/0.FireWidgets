
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

		            return context.getAdapterAPI("page").then(function (page) {

		            	var currentlyLoading = {};

	                    return LIB.Promise.resolve({
	                        loadTemplateForPage: function (pageUri) {
	                            return LIB.Promise.resolve(
	                                ccjson.makeDetachedFunction(
	                            	    function (pageUri) {

				                        	if (currentlyLoading[pageUri]) {
				                        		return currentlyLoading[pageUri];
				                        	}

											var distPath = LIB.path.join(config.distPath, pageUri + ".tpl.js");

											return (currentlyLoading[pageUri] = LIB.fs.existsAsync(distPath).then(function (exists) {

												if (
													exists &&
													config.alwaysRebuild === false
												) {
													return require(distPath);
												}

												// Generate a new copy and cache it
												return page.contextForUri(pageUri).then(function (pageContext) {
													
													return LIB.fs.statAsync(pageContext.page.data.realpath).then(function (stat) {

														
														if (stat.isDirectory()) {
															return null;
														}
	
														return LIB.fs.readFileAsync(pageContext.page.data.realpath, "utf8").then(function (code) {
		
								        					function preprocess (code) {
								        						// TODO: Support multiple pre-processors
								        						return config.formatter['chscript.preprocess'](code);
								        					}
		
								        					return preprocess(code).then(function (code) {
	
																return config.formatter['chscript'](code, {
																	location: config.location
																}).then(function (code) {
																	
																	return LIB.fs.outputFileAsync(distPath, code, "utf8").then(function () {
	
																		console.log("Writing page cache file to:", distPath);
	
																		delete require.cache[distPath];
																		return require(distPath);
																	});
																});
															});
														});
													});
							                    });
											})).then(function (tpl) {
	                           					delete currentlyLoading[pageUri];
				                           		return tpl;
				                           	});
	                            	    }
	                        		)
	                           	);
	                        }
	                    });
                    });
                }
            }
            Entity.prototype.config = defaultConfig;

            return Entity;
        }
    });
}
