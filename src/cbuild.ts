// This file is part of cbuild, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as Builder from 'systemjs-builder';
import * as resolve from 'browser-resolve';

/** Bundle file in sourcePath inside package in basePath,
  * writing all required code to file in targetPath. */

export function build(basePath: string, targetPath: string, sourcePath?: string) {
	var builder = new Builder(basePath, 'config.js');

	var oldNormalize = builder.loader.normalize;

	if(!sourcePath) {
		var packageJson = require(path.resolve(basePath, 'package.json'));
		var browser = packageJson.browser;

		if(typeof(browser) == 'string') sourcePath = browser;
		else sourcePath = packageJson.main;
	}

	builder.loader.normalize = function(name, parentName, parentAddress) {
		var pathName: string;

		return(oldNormalize.call(this, name, parentName, parentAddress).then(function(result: string) {
			pathName = result;

			return(Promise.promisify(fs.stat)(pathName.replace(/^file:\/\//, '')));
		}).then(function() {
			return(pathName);
		}).catch(function(err: NodeJS.ErrnoException) {
			return(Promise.promisify(resolve)(name, { filename: parentName }).then(function(pathName: string) {
				return(path.relative(basePath, pathName));
			}));
		}));
	}

	return(builder.bundle(sourcePath, targetPath, {}));
}
