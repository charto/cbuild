// This file is part of cbuild, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

declare module 'systemjs-builder' {
	import * as Promise from 'bluebird';

	class Loader {
		normalize(name: string, parentName: string, parentAddress: string): Promise<string>;
	}

	class Builder {
		constructor(basePath: string, configPath: string);

		loadConfig(configPath: string): Promise<void>;
		bundle(sourcePath: string, targetPath: string, options: {}): Promise<void>;

		loader: Loader;
	}

	module Builder {}

    export = Builder;
}

declare module 'browser-resolve' {
	var resolve: (name: string, options: {
		filename: string
	}) => string;

	export = resolve;
}
