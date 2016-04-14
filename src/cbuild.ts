// This file is part of cbuild, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as Builder from 'systemjs-builder';
import * as resolve from 'browser-resolve';

export interface BuildOptions {
	/** Bundled file to output. */
	bundlePath?: string;
	/** Main source file to bundle. */
	sourcePath?: string;
	/** Output config mapping other package names to their main source files. */
	outConfigPath?: string;
	/** Map additional packages in output config. */
	mapPackages?: string[];
}

function writeConfig(
	configPath: string,
	pathTbl: { [name: string]: string },
	fixTbl: { [path: string]: string },
	repoList: string[],
	shimPath: string
) {
	var sectionList: string[] = [];
	var fixList = Object.keys(fixTbl);

	// Output table mapping npm package names to their main entry points.

	sectionList.push(
		'\tmap: {\n' +
		Object.keys(pathTbl).map((name: string) =>
			'\t\t"' + name + '": "' + pathTbl[name] + '"'
		).join(',\n') + '\n' +
		'\t}'
	);

	// Output meta command to inject a global process variable to all files
	// under all encountered node_modules trees.

	sectionList.push(
		'\tmeta: {\n' +
		repoList.map((path: string) =>
			'\t\t"' + path + '/*": { globals: { process: "' + shimPath + '" } }'
		).join(',\n') + '\n' +
		'\t}'
	);

	// Output a list of fixes to file paths, mainly to append index.js
	// where a directory is being imported.

	if(fixList.length) {
		sectionList.push(
			'\tpackages: {\n' +
			'\t\t".": {\n' +
			'\t\t\tmap: {\n' +
			fixList.map((path: string) =>
				'\t\t\t\t"' + path + '": "' + fixTbl[path] + '"'
			).join(',\n') + '\n' +
			'\t\t\t}\n' +
			'\t\t}\n' +
			'\t}'
		);
	}

	var output = (
		'System.config({\n' +
		sectionList.join(',\n') + '\n' +
		'});\n'
	);

	return(fs.writeFileSync(configPath, output, { encoding: 'utf-8' }));
}

function url2path(pathName: string) {
	return(pathName.replace(/^file:\/\//, ''));
}

var resolveAsync = Promise.promisify(resolve);

/** Bundle files from package in basePath according to options. */

export function build(basePath: string, options?: BuildOptions) {
	var builder = new Builder(basePath, 'config.js');
	var pathTbl: { [name: string]: string } = {};
	var fixTbl: { [path: string]: string } = {};
	var repoTbl: { [path: string]: boolean } = {};

	function findPackage(name: string, parentName: string) {
		return(resolveAsync(name, { filename: parentName }).then((pathName: string) => {
			if(pathName == name) throw(new Error('Internal module'));
			pathName = path.relative(basePath, pathName);
			pathTbl[name] = pathName;
			repoTbl[pathName.replace(/((\/|^)node_modules)\/.*/i, '$1')] = true;

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

			return(Promise.promisify(fs.stat)(url2path(pathName)));
		}).then((stats: fs.Stats) =>
			pathName
		).catch((err: NodeJS.ErrnoException) => {
			indexName = pathName.replace(/.js$/, '/index.js');
			return(
				Promise.promisify(fs.stat)(
					url2path(indexName)
				).then((stats: fs.Stats) => {
					fixTbl['./' + path.relative(basePath, url2path(pathName))] = './' + path.relative(basePath, url2path(indexName));
					return(indexName);
				}).catch((err: NodeJS.ErrnoException) =>
					findPackage(name, url2path(parentName))
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
			return(
				resolveAsync(
					'cbuild/process.js',
					{ filename: path.resolve(basePath, 'package.json') }
				).then((shimPath: string) =>
					writeConfig(
						options.outConfigPath,
						pathTbl,
						fixTbl,
						Object.keys(repoTbl),
						path.relative(basePath, shimPath)
					)
				)
			);
		}
	}));
}
