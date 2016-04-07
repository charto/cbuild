cbuild
======

[![build status](https://travis-ci.org/charto/cbuild.svg?branch=master)](http://travis-ci.org/charto/cbuild)
[![dependency status](https://david-dm.org/charto/cbuild.svg)](https://david-dm.org/charto/cbuild)
[![npm version](https://img.shields.io/npm/v/cbuild.svg)](https://www.npmjs.com/package/cbuild)

`cbuild` is a command line interface for [`systemjs-builder`](https://github.com/systemjs/builder)
with Node.js module resolution to find packages installed using `npm` without additional configuration.
This allows publishing leaner packages running without build tools.
`npm` itself can pull all required frontend and backend dependencies.

`cbuild` supports the `browser` field in `package.json`.
`npm@3` or the `dedupe` command in `npm@2` natively handles package deduplication.
For more complicated scenarios, the full power of SystemJS is still available for loading and bundling.

API
===
Docs generated using [`docts`](https://github.com/charto/docts)
>
> <a name="api-build"></a>
> ### Function [`build`](#api-build)
> <em>Bundle file in sourcePath inside package in basePath,</em>  
> <em>writing all required code to file in targetPath.</em>  
> Source code: [`<>`](http://github.com/charto/cbuild/blob/master/src/cbuild.ts#L13-L43)  
> > **build( )** <sup>&rArr; <code>Bluebird&lt;void&gt;</code></sup> [`<>`](http://github.com/charto/cbuild/blob/master/src/cbuild.ts#L13-L43)  
> > &emsp;&#x25aa; basePath <sup><code>string</code></sup>  
> > &emsp;&#x25aa; targetPath <sup><code>string</code></sup>  
> > &emsp;&#x25ab; sourcePath<sub>?</sub> <sup><code>string</code></sup>  

License
=======

[The MIT License](https://raw.githubusercontent.com/charto/cbuild/master/LICENSE)

Copyright (c) 2016 BusFaster Ltd
