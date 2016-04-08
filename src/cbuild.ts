// This file is part of cbuild, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as Builder from 'systemjs-builder';
import * as resolve from 'browser-resolve';

export interface BuildOptions {
	sourcePath?: string;
	outConfigPath?: string;
}

function writeConfig(configPath: string, pathTbl: { [name: string]: string }) {
	var output = (
		'System.config({\n' +
		'\tmap: {\n' +
		Object.keys(pathTbl).map((name: string) =>
			'\t\t"' + name + '": "' + pathTbl[name] + '"'
		).join(',\n') + '\n' +
		'\t}\n' +
		'});\n'
	);

	console.log(output);

	return(fs.writeFileSync(configPath, output, { encoding: 'utf-8' }));
}

/** Bundle file in sourcePath inside package in basePath,
  * writing all required code to file in targetPath. */

export function build(basePath: string, targetPath: string, options?: BuildOptions) {
	var builder = new Builder(basePath, 'config.js');
	var pathTbl: { [name: string]: string } = {};

	options = options || {};

	var sourcePath = options.sourcePath;

	if(!sourcePath) {
		var packageJson = require(path.resolve(basePath, 'package.json'));
		var browser = packageJson.browser;

		if(typeof(browser) == 'string') sourcePath = browser;
		else sourcePath = packageJson.main;
	}

	var oldNormalize = builder.loader.normalize;

	builder.loader.normalize = function(name, parentName, parentAddress) {
		var pathName: string;

		return(oldNormalize.call(this, name, parentName, parentAddress).then((result: string) => {
			pathName = result;

			return(Promise.promisify(fs.stat)(pathName.replace(/^file:\/\//, '')));
		}).then(function() {
			return(pathName);
		}).catch((err: NodeJS.ErrnoException) => {
			return(Promise.promisify(resolve)(name, { filename: parentName }).then((pathName: string) => {
				pathTbl[name] = pathName;
				return(path.relative(basePath, pathName));
			}));
		}));
	}

	return(builder.bundle(sourcePath, targetPath, {}).then(() => {
		if(options.outConfigPath) {
			writeConfig(options.outConfigPath, pathTbl);
		}
	}));
}
