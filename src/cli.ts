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
	.option('-p, --package <path>', 'Path to directory with package.json and config.js', process.cwd())
	.action(handleBundle)
	.parse(process.argv)
);

if(process.argv.length < 3) cmd.help();

function handleBundle(targetPath: string, opts: { [key: string]: any }) {
	var basePath = path.resolve('.', opts['package']);

	build(basePath, targetPath).then(() => {
		console.log('Build complete!');
	}).catch((err) => {
		console.log('Build error:');
		console.log(err);
	});
}
