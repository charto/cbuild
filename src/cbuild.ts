// This file is part of cbuild, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as Builder from 'systemjs-builder';
import * as resolve from 'browser-resolve';

export interface BuildOptions {
	bundlePath?: string;
	sourcePath?: string;
	outConfigPath?: string;
	mapPackages?: string[];
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

	return(fs.writeFileSync(configPath, output, { encoding: 'utf-8' }));
}

var resolveAsync = Promise.promisify(resolve);

/** Bundle file in sourcePath inside package in basePath,
  * writing all required code to file in targetPath. */

export function build(basePath: string, options?: BuildOptions) {
	var builder = new Builder(basePath, 'config.js');
	var pathTbl: { [name: string]: string } = {};

	function findPackage(name: string, parentName: string) {
		return(resolveAsync(name, { filename: parentName }).then((pathName: string) => {
			if(pathName == name) throw(new Error('Internal module'));
			pathName = path.relative(basePath, pathName);
			pathTbl[name] = pathName;

			return(pathName);
		}));
	}

	options = options || {};

	var bundlePath = options.bundlePath;
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
		var indexName: string;

		return(oldNormalize.call(this, name, parentName, parentAddress).then((result: string) => {
			pathName = result;

			return(Promise.promisify(fs.stat)(pathName.replace(/^file:\/\//, '')));
		}).then((stats: fs.Stats) =>
			pathName
		).catch((err: NodeJS.ErrnoException) => {
			indexName = pathName.replace(/.js$/, '/index.js');
			return(
				Promise.promisify(fs.stat)(
					indexName.replace(/^file:\/\//, '')
				).then((stats: fs.Stats) =>
					indexName
				).catch((err: NodeJS.ErrnoException) =>
					findPackage(name, parentName)
				).catch((err: any) =>
					pathName
				)
			);
		}));
	}

	var built: Promise<void>;

	if(bundlePath) built = builder.bundle(sourcePath, bundlePath, {});
	else built = builder.bundle(sourcePath, bundlePath, {});

	return(built.then(() =>
		Promise.map(options.mapPackages || [], (name: string) =>
			findPackage(name, path.resolve(basePath, 'package.json'))
		)
	).then(() => {
		if(options.outConfigPath) {
			writeConfig(options.outConfigPath, pathTbl);
		}
	}));
}
