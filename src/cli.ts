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
	.description('SystemJS node module bundling tool')
	.option('-m, --map <package>', 'add package to mappings', (item: string, list: string[]) => list.concat([item]), [])
	.option('-s, --source <file>', 'main JavaScript source to bundle')
	.option('-p, --package <path>', 'directory with package.json and config.js', process.cwd())
	.option('-o, --out <file>', 'write output bundle to file')
	.option('-C, --out-config <file>', 'write path mappings to new config file')
	.parse(process.argv)
);

if(process.argv.length < 3) cmd.help();

handleBundle(cmd.opts());

function handleBundle(opts: { [key: string]: any }) {
	var basePath = path.resolve('.', opts['package']);
	var sourcePath: string = opts['source'];

	if(sourcePath) sourcePath = path.resolve('.', sourcePath);

	build(basePath, {
		bundlePath: opts['out'],
		sourcePath: sourcePath,
		outConfigPath: opts['outConfig'],
		mapPackages: opts['map']
	}).then(() => {
		console.log('Build complete!');
	}).catch((err) => {
		console.log('Build error:');
		console.log(err);
	});
}
