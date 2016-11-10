// This file is part of cbuild, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import * as path from 'path';
import * as cmd from 'commander';

import {build, BuildResult, makeTree, Branch} from './cbuild';

type _ICommand = typeof cmd;
interface Command extends _ICommand {
	arguments(spec: string): Command;
}

function parseBool(flag: string) {
	const falseTbl: { [key: string]: boolean } = {
		'0': true,
		'no': true,
		'false': true
	};

	return(!flag || !falseTbl[flag.toLowerCase()]);
}

function parseList(item: string, list: string[]) {
	return(list.concat([item]));
}

/** Wrap output in ANSI escape sequences to show it in given color. */

function paint(text: string, color: number, bold?: boolean) {
	if(!process.stdout || !(process.stdout as any).isTTY) return(text);

	return(
		'\u001b[' + (bold ? '1;' : '') + color + 'm' +
		text +
		'\u001b[' + (bold ? '22;' : '') + '39m'
	);
}

/** Print dependency tree of bundled files. */

// tslint:disable-next-line:typedef
function printTree(root: Branch, indent = '') {
	const output: string[] = [];
	let index = 0;

	if(root[0]) output.push(indent + paint(root[0], 36));

	for(let child of root) {
		if(index++ > 0) {
			output.push.apply(output, printTree(child as Branch, indent + '  '));
		}
	}

	return(output);
}

((cmd.version(require('../package.json').version) as Command)
	.description('SystemJS node module bundling tool')
	.option('-d, --debug [flag]', 'use development environment', parseBool)
	.option('-m, --map <package>', 'add package to mappings',
		parseList, [])
	.option('-s, --source <file>', 'main JavaScript source to bundle')
	.option('-p, --package <path>', 'directory with package.json and config.js',
		process.cwd())
	.option('-o, --out <file>', 'write output bundle to file')
	.option('-C, --out-config <file>', 'write path mappings to new config file')
	.option('-I, --include-config <file>', 'merge another file into new config file',
		parseList, [])
	.option('-q, --quiet [flag]', 'suppress terminal output', parseBool)
	.option('-v, --verbose [flag]', 'print dependency tree of bundled files', parseBool)
	.option('-x, --static [flag]', 'create static (sfx) bundle', parseBool)
	.parse(process.argv)
);

if(process.argv.length < 3) cmd.help();

handleBundle(cmd.opts());

/* tslint:disable:no-console */

function handleBundle(opts: { [key: string]: any }) {
	const basePath = path.resolve('.', opts['package']);
	let sourcePath: string = opts['source'];
	const env = process.env['NODE_ENV'];
	let debug: boolean = opts['debug'];
	const quiet: boolean = opts['quiet'];
	const verbose: boolean = opts['verbose'];
	const sfx: boolean = opts['static'];

	if(sourcePath) sourcePath = path.resolve('.', sourcePath);
	if(env == 'development') debug = true;

	if(!quiet) {
		console.log(
			'Bundling for ' + (debug ? 'development' : 'production') +
			' (NODE_ENV = ' + env +
			' and --debug ' + (opts['debug'] ? 'set' : 'not set') + ')'
		);
	}

	let bundlePath = opts['out'];
	let outConfigPath = opts['outConfig'];

	if(bundlePath) bundlePath = path.resolve('.', bundlePath);
	if(outConfigPath) outConfigPath = path.resolve('.', outConfigPath);

	process.chdir(basePath);

	build(basePath, {
		bundlePath: bundlePath,
		debug: debug,
		includeConfigList: opts['includeConfig'],
		mapPackages: opts['map'],
		outConfigPath: outConfigPath,
		sfx: sfx,
		sourcePath: sourcePath
	}).then((result: BuildResult) => {
		if(!quiet) {
			if(verbose) {
				console.log('\n' + printTree(makeTree(result)).join('\n'));
			}
			console.log('\nBuild complete!');
		}
	}).catch((err: any) => {
		if(!quiet) {
			console.error('\nBuild error:');
			console.error(err.stack);
		}

		process.exit(1);
	});
}
