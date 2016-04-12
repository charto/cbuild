cbuild
======

[![build status](https://travis-ci.org/charto/cbuild.svg?branch=master)](http://travis-ci.org/charto/cbuild)
[![dependency status](https://david-dm.org/charto/cbuild.svg)](https://david-dm.org/charto/cbuild)
[![npm version](https://img.shields.io/npm/v/cbuild.svg)](https://www.npmjs.com/package/cbuild)

`cbuild` allows publishing leaner [SystemJS](https://github.com/systemjs/systemjs)-based apps and packages
running without build tools.
`npm` itself can pull all required frontend and backend dependencies.

Normally you would use `jspm` which also users of your package must install.
It's very powerful but has some drawbacks if plain `npm` is enough for your use case:

- `jspm` pulls another over 90 packages and 15 megabytes of code with it.
- ... downloads another separate copy of all required Node.js modules into a different directory structure.
- ... involves a large `config.js`, parts of which are manually edited (so belong to version control)
  and other parts autogenerated from `package.json` fields (so preferably omitted from version control).

`cbuild` instead uses Node.js module resolution to find packages installed using `npm` without additional configuration.
Only the manually edited parts are needed in `config.js`.

How does it work?
-----------------

`cbuild` simply passes your SystemJS `config.js` to [`systemjs-builder`](https://github.com/systemjs/builder),
which bundles your main JavaScript file with its dependencies.
`cbuild` adds a hook to look up any missing files using [`browser-resolve`](https://github.com/defunctzombie/node-browser-resolve).

That means you can still use `jspm` as before but you don't have to reinstall all your npm packages with it,
because `cbuild` also automatically looks inside `node_modules`.
Simple package deduplication is natively handled by `npm@3` or the `dedupe` command in `npm@2`.

For more complicated scenarios, the full power of SystemJS is still available for loading and bundling.

`cbuild` supports the `browser` field in `package.json`.
It can also generate a minimal `config.js` for SystemJS to load packages without having to bundle them.

Usage
-----

Make sure your `package.json` has a `browser` and/or `main` field and add in the `scripts` section:

```json
  "scripts": {
    "cbuild": "cbuild"
  }
```

Then run the commands:

```bash
npm install --save-dev cbuild
npm run cbuild -- bundle.js
```

This generates a new file `bundle.js` with all code required to load the file
defined in the `browser` (or `main` if `browser` is missing) field of `package.json`.

Run `npm run cbuild -- --help` to see the command line options:

```
  Usage: cbuild [options] <output-bundle-path>

  SystemJS node module bundling tool

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -p, --package <path>     Path to directory with package.json and config.js
    -C, --out-config <path>  Path to new config.js to overwrite with path mappings
```

API
===
Docs generated using [`docts`](https://github.com/charto/docts)
>
> <a name="api-BuildOptions"></a>
> ### Interface [`BuildOptions`](#api-BuildOptions)
> Source code: [`<>`](http://github.com/charto/cbuild/blob/develop/src/cbuild.ts#L10-L15)  
>  
> Properties:  
> > **.bundlePath**<sub>?</sub> <sup><code>string</code></sup>  
> > **.sourcePath**<sub>?</sub> <sup><code>string</code></sup>  
> > **.outConfigPath**<sub>?</sub> <sup><code>string</code></sup>  
> > **.mapPackages**<sub>?</sub> <sup><code>string[]</code></sup>  
>
> <a name="api-build"></a>
> ### Function [`build`](#api-build)
> <em>Bundle file in sourcePath inside package in basePath,</em>  
> <em>writing all required code to file in targetPath.</em>  
> Source code: [`<>`](http://github.com/charto/cbuild/blob/develop/src/cbuild.ts#L36-L102)  
> > **build( )** <sup>&rArr; <code>Bluebird&lt;void&gt;</code></sup> [`<>`](http://github.com/charto/cbuild/blob/develop/src/cbuild.ts#L36-L102)  
> > &emsp;&#x25aa; basePath <sup><code>string</code></sup>  
> > &emsp;&#x25ab; options<sub>?</sub> <sup><code>[BuildOptions](#api-BuildOptions)</code></sup>  

License
=======

[The MIT License](https://raw.githubusercontent.com/charto/cbuild/master/LICENSE)

Copyright (c) 2016 BusFaster Ltd
