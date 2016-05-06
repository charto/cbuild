// This file is part of cbuild, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as cmd from 'commander';

import {build, BuildResult, makeTree, Branch} from './cbuild';

type _ICommand = typeof cmd;
interface ICommand extends _ICommand {
	arguments(spec: string): ICommand;
}

function parseBool(flag: string) {
	var falseTbl: { [key: string]: boolean } = {
		'0': true,
		'no': true,
		'false': true
	}
	return(!flag || !falseTbl[flag.toLowerCase()]);
}

/** Wrap output in ANSI escape sequences to show it in given color. */

function paint(text: string, color: number, bold?: boolean) {
	if(!process.stdout || !(process.stdout as any).isTTY) return(text);

	return('\u001b[' + (bold ? '1;' : '') + color + 'm' + text + '\u001b[' + (bold ? '22;' : '') + '39m');
}

/** Print dependency tree of bundled files. */

function printTree(root: Branch, indent = '') {
	var output: string[] = [];
	var index = 0;

	if(root[0]) output.push(indent + paint(root[0], 36));

	for(var child of root) {
		if(index++ > 0) {
			output.push.apply(output, printTree(child as Branch, indent + '  '));
		}
	}

	return(output);
}

((cmd.version(require('../package.json').version) as ICommand)
	.description('SystemJS node module bundling tool')
	.option('-d, --debug [flag]', 'use development environment', parseBool)
	.option('-m, --map <package>', 'add package to mappings', (item: string, list: string[]) => list.concat([item]), [])
	.option('-s, --source <file>', 'main JavaScript source to bundle')
	.option('-p, --package <path>', 'directory with package.json and config.js', process.cwd())
	.option('-o, --out <file>', 'write output bundle to file')
	.option('-C, --out-config <file>', 'write path mappings to new config file')
	.option('-q, --quiet [flag]', 'suppress terminal output', parseBool)
	.option('-v, --verbose [flag]', 'print dependency tree of bundled files', parseBool)
	.option('-x, --static [flag]', 'create static (sfx) bundle', parseBool)
	.parse(process.argv)
);

if(process.argv.length < 3) cmd.help();

handleBundle(cmd.opts());

function handleBundle(opts: { [key: string]: any }) {
	var basePath = path.resolve('.', opts['package']);
	var sourcePath: string = opts['source'];
	var env = process.env['NODE_ENV'];
	var debug: boolean = opts['debug'];
	var quiet: boolean = opts['quiet'];
	var verbose: boolean = opts['verbose'];
	var sfx: boolean = opts['static'];

	if(sourcePath) sourcePath = path.resolve('.', sourcePath);
	if(env == 'development') debug = true;

	if(!quiet) {
		console.log(
			'Bundling for ' + (debug ? 'development' : 'production') +
			' (NODE_ENV = ' + env +
			' and --debug ' + (opts['debug'] ? 'set' : 'not set') + ')'
		);
	}

	build(basePath, {
		debug: debug,
		sfx: sfx,
		bundlePath: opts['out'],
		sourcePath: sourcePath,
		outConfigPath: opts['outConfig'],
		mapPackages: opts['map']
	}).then((result: BuildResult) => {
		if(!quiet) {
			if(verbose) {
				console.log('\n' + printTree(makeTree(result)).join('\n'));
			}
			console.log('\nBuild complete!');
		}
	}).catch((err) => {
		if(!quiet) {
			console.log('\nBuild error:');
			console.log(err.stack);
		}

		process.exit(1);
	});
}
