var vm = require('vm');
var kindOf = require('./index.js');
var slice = function (v) {
  var t = Object.prototype.toString.call(v);
  return t.slice(8, -1).toLowerCase().replace(/\s/g, '');
};

var ctx = vm.createContext({});
var cases = [
  ['vm array', vm.runInContext('[]', ctx)],
  ['vm date', vm.runInContext('new Date()', ctx)],
  ['vm error', vm.runInContext('new Error("x")', ctx)],
  ['vm args sloppy', vm.runInContext('(function(){return arguments})(1)', ctx)],
  ['vm args strict', vm.runInContext('(function(){"use strict";return arguments})(1)', ctx)],
  ['vm map', vm.runInContext('new Map()', ctx)],
  ['subclass array', new (class A extends Array {})()],
  ['subclass date', new (class D extends Date {})()],
  ['subclass error', new (class E extends Error {})()],
  ['subclass map', new (class M extends Map {})()],
  ['fake ctor Array', { constructor: Array }],
  ['fake ctor Promise', { constructor: Promise }],
  ['fake ctor Map', { constructor: Map }],
  ['fake ctor Symbol', { constructor: Symbol }],
  ['fake ctor Uint8Array', { constructor: Uint8Array }],
  ['ctor plain obj', { constructor: {} }],
];

cases.forEach(function (c) {
  console.log(c[0].padEnd(20), '=>', JSON.stringify(kindOf(c[1])), '| fallback candidate:', slice(c[1]));
});

// proxy: constructor -> undefined (skip isBuffer), length throws non-callee
var p1 = new Proxy({}, {
  get: function (t, k) {
    if (k === 'constructor') return undefined;
    if (k === 'length') throw new Error('nope no keyword');
    return undefined;
  }
});
console.log('proxy non-callee throw =>', kindOf(p1));

// proxy: constructor throws
var p2 = new Proxy({}, { get: function () { throw new Error('boom'); } });
try { kindOf(p2); console.log('proxy ctor throw => no throw'); }
catch (e) { console.log('proxy ctor throw => THROW at isBuffer:', e.message); }

// vm Error stackTraceLimit
console.log('vm Error.stackTraceLimit =', vm.runInContext('Error.stackTraceLimit', ctx));
