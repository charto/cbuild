// This file is part of cbuild, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as cmd from 'commander';

import {build} from './cbuild';

type _ICommand = typeof cmd;
interface ICommand extends _ICommand {
	arguments(spec: string): ICommand;
}

((cmd.version(require('../package.json').version) as ICommand)
	.arguments('<output-bundle-path>')
	.description('SystemJS node module bundling tool')
	.option('-s, --source <path>', 'main JavaScript source to bundle')
	.option('-p, --package <path>', 'directory with package.json and config.js', process.cwd())
	.option('-C, --out-config <path>', 'new config.js to overwrite with path mappings')
	.action(handleBundle)
	.parse(process.argv)
);

if(process.argv.length < 3) cmd.help();

function handleBundle(targetPath: string, opts: { [key: string]: any }) {
	var basePath = path.resolve('.', opts['package']);
	var sourcePath: string = opts['source'];

	if(sourcePath) sourcePath = path.resolve('.', sourcePath);

	build(basePath, targetPath, {
		sourcePath: sourcePath,
		outConfigPath: opts['outConfig']
	}).then(() => {
		console.log('Build complete!');
	}).catch((err) => {
		console.log('Build error:');
		console.log(err);
	});
}
