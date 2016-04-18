// This file is part of cbuild, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

declare module 'systemjs-builder' {
	import * as Promise from 'bluebird';

	module Builder {
		interface BuildItem {
			name: string;
			path: string;
			metadata: { [key: string]: any };
			/** List of imports. */
			deps: string[];
			/** Table mapping imports to their paths inside the bundle. */
			depMap: { [name: string]: string };
			source: string;
			fresh: boolean;
			timestamp: number;
			configHash: string;
			runtimePlugin: boolean;
			pluginConfig: any;
			packageConfig: any;
			isPackageConfig: any;
			deferredImports: any;
		}

		interface BuildResult {
			/** Bundled output file contents. */
			source: string;
			sourceMap: string;
			/** List if bundled files. */
			modules: string[];
			/** List of files intended to be imported from the bundle(?). */
			entryPoints: string[];
			tree: { [path: string]: BuildItem };
			/** Other non-JavaScript files included in the bundle. */
			assetList: any;
			bundleName: string;
		}
	}

	class Loader {
		normalize(name: string, parentName: string, parentAddress: string): Promise<string>;
	}

	class Builder {
		constructor(basePath: string, configPath: string);

		loadConfig(configPath: string): Promise<void>;
		bundle(sourcePath: string, targetPath: string, options: {}): Promise<Builder.BuildResult>;
		bundle(sourcePath: string, options: {}): Promise<Builder.BuildResult>;

		loader: Loader;
	}

	export = Builder;
}

declare module 'browser-resolve' {
	var resolve: (name: string, options: {
		filename: string
	}) => string;

	export = resolve;
}
