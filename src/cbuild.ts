// This file is part of cbuild, copyright (c) 2016-2018 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as Builder from 'systemjs-builder';
import * as resolve from 'browser-resolve';
export { BuildResult, BuildItem } from 'systemjs-builder';

const resolveAsync = Promise.promisify(resolve);

/** Options object for the build function. */

export interface BuildOptions {
	/** If true, set NODE_ENV to development. */
	debug?: boolean;

	/** If true, create static (sfx) bundle. */
	sfx?: boolean;

	/** Main source file to bundle. */
	builderPath?: string;

	/** Bundled file to output. */
	bundlePath?: string;

	/** Main source file to bundle. */
	sourcePath?: string;

	/** Output config mapping other package names to their main source files. */
	outConfigPath?: string;

	/** Merge other config files into output config. */
	includeConfigList?: string[];

	/** Map additional packages in output config. */
	mapPackages?: string[];
}

export interface PackageSpec {
	entryPath?: string;
	rootPath: string;
	fullRootPath: string;
	fixTbl?: { [ path: string ]: string };
}

function writeConfig(
	options: BuildOptions,
	repoTbl: { [path: string]: { [name: string]: PackageSpec } },
	fixTbl: { [path: string]: string },
	basePath: string,
	shimPath: string
) {
	const sectionList: string[] = [];
	const fixList = Object.keys(fixTbl);

	const packageTbl: { [name: string]: PackageSpec } = {};

	/** Virtual directory tree for finding which package contains which file. */
	const packageTree = {};
	let node: any;

	for(let repoPath of Object.keys(repoTbl)) {
		const repo = repoTbl[repoPath];

		for(let packageName of Object.keys(repo)) {
			const spec = repo[packageName];
			packageTbl[packageName] = spec;

			// Add package path to virtual directory tree.

			node = packageTree;

			for(let part of spec.rootPath.split('/')) {
				if(!node[part]) node[part] = {};
				node = node[part];
			}

			node['/name'] = packageName;
		}
	}

	// Find a containing package for each path that needed fixing,
	// to add mappings into config for that package.

	for(let fix of fixList) {
		node = packageTree;

		for(let part of path2url(path.relative(basePath, fix)).split('/')) {
			if(!node[part]) break;
			node = node[part];
		}

		let packageName = node['/name'];

		if(!packageName) {
			packageName = path2url(path.dirname(path.relative(basePath, fix)));
			const spec = packageTbl[packageName] || (packageTbl[packageName] = {
				fullRootPath: path.dirname(fix),
				rootPath: ''
			});
		}

		if(packageName) {
			const spec = packageTbl[packageName];
			if(!spec.fixTbl) spec.fixTbl = {};

			const before = './' + path2url(path.relative(spec.fullRootPath, fix));
			const after = './' + path2url(path.relative(spec.fullRootPath, fixTbl[fix]));

			spec.fixTbl[before] = after;
		}
	}

	// Output table mapping npm package names to their main entry points.

	sectionList.push(
		'\tmap: {\n' +
		Object.keys(packageTbl).sort().map((name: string) =>
			packageTbl[name].rootPath && '\t\t"' + name + '": "' + packageTbl[name].rootPath + '"'
		).filter((name: string) => name).join(',\n') + '\n' +
		'\t}'
	);

	// Output meta command to inject a global process variable to all files
	// under all encountered node_modules trees.
	sectionList.push([
		'\tmeta: {',
		Object.keys(repoTbl).sort().map((repoPath: string) =>
			'\t\t"' + repoPath + '/' + '*": { ' +
			'globals: { process: "' + path2url(path.relative(basePath, shimPath)) + '" } ' +
			'}'
		).join(',\n'),
		'\t}'
	].join('\n'));

	sectionList.push([
		'\tpackages: {',
			Object.keys(packageTbl).sort().map((name: string) => {
				const entryPath = packageTbl[name].entryPath;
				const packageFixTbl = packageTbl[name].fixTbl;

				if(!entryPath && !packageFixTbl) return(null);

				const result = [];

				if(entryPath) result.push('\t\t\tmain: "' + entryPath + '"');
				if(packageFixTbl) {
					// Output a list of fixes to file paths, mainly to append index.js
					// where a directory is being imported.

					result.push([
						'\t\t\tmap: {',
						Object.keys(packageFixTbl).map(
							(fix: string) => '\t\t\t\t"' + fix + '": "' + packageFixTbl[fix] + '"'
						).join(',\n'),
						'\t\t\t}'
					].join('\n'));
				}

				return([
					'\t\t"' + name + '": {',
					result.join(',\n'),
					'\t\t}'
				].join('\n'));
			}).filter((row: string | null) => row)
		/* ) */.join(',\n'),

		'\t}'
	].join('\n'));

	const output = [
		'// Autogenerated using cbuild' +

		(options.includeConfigList || []).map((configPath: string) =>
			fs.readFileSync(configPath, { encoding: 'utf-8' })
		).join('\n'),

		'System.config({',
		sectionList.join(',\n'),
		'});',
		''
	].join('\n');

	return(fs.writeFileSync(options.outConfigPath!, output, { encoding: 'utf-8' }));
}

export function url2path(urlPath: string) {
	let nativePath = urlPath.replace(/^file:\/\//, '');

	if(path.sep != '/') {
		if(nativePath.match(/^\/[0-9A-Za-z]+:\//)) nativePath = nativePath.substr(1);
		nativePath = nativePath.replace(/\//g, path.sep);
	}

	return(nativePath);
}

export function path2url(nativePath: string) {
	let urlPath = nativePath;

	if(path.sep != '/') {
		const re = new RegExp(path.sep.replace(/\\/g, '\\\\'), 'g');

		urlPath = urlPath.replace(re, '/');
		if(urlPath.match(/^[0-9A-Za-z]+:\//)) urlPath = '/' + urlPath;
	}

	return(urlPath.replace(/^\//, 'file:///'));
}

/** Find the main entry point to an npm package (considering package.json
  * browser fields of the required and requiring packages). */

export function findPackage(
	name: string,
	parentName: string,
	basePath: string,
	fixTbl?: { [path: string]: string },
	repoTbl?: { [path: string]: { [name: string]: PackageSpec } }
) {
	let rootName: string;
	let rootPath: string;
	const parentPath = url2path(parentName);

	const resolveOptions = {
		filename: parentPath,
		packageFilter: (json: any, jsonPath: string) => {
			rootName = json.name;
			rootPath = path.dirname(jsonPath);
			return(json);
		}
	};

	return(resolveAsync(name, resolveOptions).then((pathName: string) => {
		// Handle Node.js internal modules.
		if(pathName == name) return('@empty');

		let spec: PackageSpec;

		if(rootName == name) {
			spec = {
				entryPath: path2url(path.relative(rootPath, pathName)),
				fullRootPath: rootPath,
				rootPath: path2url(path.relative(basePath, rootPath))
			};
		} else {
			spec = {
				fullRootPath: rootPath,
				rootPath: path2url(path.relative(basePath, pathName))
			};
		}

		if(fixTbl && repoTbl) {
			const repoPath = spec.rootPath.replace(/((\/|^)node_modules)\/.*/i, '$1');

			// Store in repository corresponding to top node_modules directory.
			const specTbl = repoTbl[repoPath] || (repoTbl[repoPath] = {});

			if(name.charAt(0) == '.') {
				fixTbl[path.resolve(path.dirname(parentPath), name)] = pathName;
			} else {
				// Store path and entry point for this package name.
				specTbl[name] = spec;
			}
		}

		return(path2url(path.relative(basePath, pathName)));
	}));
}

/** Bundle files from package in basePath according to options. */

export function build(basePath: string, options: BuildOptions = {}) {
	// Avoid using the imported Builder. Otherwise it gets executed when this
	// file loads and the caller won't have time to use process.chdir()
	// before builder gets its (unchangeable) base path from process.cwd().
	const BuilderClass = require('systemjs-builder') as typeof Builder;
	const testBuilder = new BuilderClass(path2url(basePath), path.resolve(basePath, 'config.js'));
	const builder = new BuilderClass(path2url(basePath), path.resolve(basePath, 'config.js'));
	const fixTbl: { [path: string]: string } = {};
	const repoTbl: { [path: string]: { [name: string]: PackageSpec } } = {};

	function newNormalize(
		name: string,
		parentName: string,
		parentAddress: string,
		pathName: string
	) {
		const indexName = pathName.replace(/.js$/, '/index.js');

		if(builder.loader.map) {
			const other = builder.loader.map[name];
			if(other && other != name) {
				return(builder.loader.normalize(other, parentName, parentAddress));
			}
		}

		return(
			Promise.promisify(fs.stat)(
				url2path(indexName)
			).then((stats: fs.Stats) => {
				const oldPath = url2path(pathName);
				const newPath = url2path(indexName);

				// TODO: test on Windows
				fixTbl[oldPath] = newPath;

				return(indexName);
			}).catch((err: NodeJS.ErrnoException) =>
				findPackage(name, parentName, basePath, fixTbl, repoTbl)
			).catch((err: any) =>
				pathName
			)
		);
	}

	const builderPath = options.builderPath;
	const bundlePath = options.bundlePath;
	let sourcePath = options.sourcePath;

	// If no entry point for bundling was given, use the browser or main field
	// in package.json under the base directory.

	if(!sourcePath) {
		const packageJson = require(path.resolve(basePath, 'package.json'));
		const browser = packageJson.browser;

		sourcePath = path.resolve(
			basePath,
			typeof(browser) == 'string' ? browser : packageJson.main
		);
	}

	// Prepare a test builder simply to fetch a normalized path
	// and check if any content was found.

	const testFetch = testBuilder.loader.fetch;
	const fetchResult: { [address: string]: boolean } = {};

	testBuilder.loader.fetch = function(load: any) {
		return(testFetch.call(this, load).then((content: string) => {
			fetchResult[load.address] = true;
			throw(new Error());
		}));
	};

	/** Old systemjs-builder normalize function which doesn't look for npm packages.
	  * See https://github.com/ModuleLoader/es6-module-loader/wiki/Extending-the-ES6-Loader */
	const oldNormalize = builder.loader.normalize;

	// Replace systemjs-builder normalize function adding support for
	// npm packages and gathering information about paths needed for
	// generating a SystemJS configuration file.

	builder.loader.normalize = function(
		name: string,
		parentName: string,
		parentAddress: string
	) {
		let pathName: string;

		return(
			// Call SystemJS normalizer.
			// tslint:disable-next-line:no-invalid-this
			oldNormalize.call(this, name, parentName, parentAddress).then((result: string) =>
				// Test if the file actually exists.
				Promise.promisify(fs.stat)(url2path(pathName = result))
			).then((stats: fs.Stats) =>
				pathName
			).catch((err: NodeJS.ErrnoException) =>
				// Try to build the file to ensure all loader plugins are executed.
				testBuilder.bundle(pathName, {})
			).then(() =>
				pathName
			).catch((err: any) => {
				if(fetchResult.hasOwnProperty(pathName)) return(pathName);
				// If file doesn't exist, look for a matching npm package.
				return(newNormalize(name, parentName, parentAddress, pathName));
			})
		);
	};

	let built: Promise<Builder.BuildResult>;
	const sourceUrl = path2url(sourcePath);

	// Run systemjs-builder.

	let makeBundle = options.sfx ? builder.buildStatic : builder.bundle;

	const buildArguments: any[] = [ sourceUrl ];

	if(bundlePath) buildArguments.push(bundlePath);
	if(builderPath) buildArguments.push(require(builderPath));

	// Call systemjs-builder.
	built = makeBundle.apply(builder, buildArguments);

	return(built.then(() =>

		// Add mappings to any extra packages listed in command line options.

		Promise.map(options.mapPackages || [], (name: string) =>
			findPackage(name, path.resolve(basePath, 'package.json'), basePath, fixTbl, repoTbl)
		)
	).then(() => {

		// Restore original systemjs-builder normalize function.

		builder.loader.normalize = oldNormalize;

		if(options.outConfigPath) {
			const shimName = options.debug ? 'process-dev.js' : 'process.js';

			// Output SystemJS configuration file.

			return(
				writeConfig(
					options,
					repoTbl,
					fixTbl,
					basePath,
					path.resolve(__dirname, '../' + shimName)
				)
			);
		}
	}).then(() => built.value()));
}

/** Dependency tree branch, used for makeTree() output. */

export interface Branch extends Array<string | Branch> {
	/** File name. */
	0: string;
}

/** Extract a dependency tree from the build function result object.
  * Returns a nameless root item.
  * Each item is a list of a file name and its child items.
  * Uses Breadth-First Search to print shortest import chain to each file. */

export function makeTree(result: Builder.BuildResult) {
	const output: Branch = [''];
	const queue: string[] = [];
	const found: { [name: string]: Branch } = {};

	function report(name: string, branch: Branch) {
		if(!found[name]) {
			const leaf: Branch = [name];
			found[name] = leaf;

			branch.push(leaf);
			queue.push(name);
		}
	}

	let entryPoints = result.entryPoints;

	if(!entryPoints) {
		// Bundling reported no entry points (maybe it's an sfx bundle).
		// Create a table of all modules that were imported somehow.

		const importedTbl: { [name: string]: boolean } = {};

		for(let name of Object.keys(result.tree)) {
			const item = result.tree[name];

			if(typeof(item) == 'object') {
				for(let dep of item.deps) {
					importedTbl[item.depMap[dep]] = true;
				}
			}
		}

		// Assume modules not imported by others are entry points.

		entryPoints = Object.keys(result.tree).filter((name: string) => !importedTbl[name]);
	}

	for(let name of entryPoints) report(name, output);

	while(queue.length) {
		const name = queue.shift()!;
		const branch = found[name];
		const item = result.tree[name];

		if(typeof(item) == 'object') {
			for(let dep of item.deps) {
				report(item.depMap[dep], branch);
			}
		}
	}

	return(output);
}
