'use strict';

/**
 * 证据矩阵生成器：把 benchmark/fixtures 的全部类型 + 边界值喂给 kindOf，
 * 实测结果与 DECISION-CHAIN.md 中声明的期望值逐格比对。
 * 有任何一格对不上，进程以非零码退出。
 *
 * 用法: node evidence/matrix.js
 * 输出: evidence/matrix.md (覆盖生成) + 控制台摘要
 */

var fs = require('fs');
var path = require('path');
var kindOf = require('..');

function realArguments() {
  return arguments;
}
function strictArguments() {
  'use strict';
  return arguments;
}
function Foo() {}
function* genFn() {}

var cases = [];

function add(group, name, value, expected, step) {
  cases.push({ group: group, name: name, value: value, expected: expected, step: step });
}

/* ---------- 1. benchmark/fixtures 全量(21 个) ---------- */
/* 与 benchmark/code/kind-of.js 一致:字符串 'arguments' 代表真实 arguments 对象 */
add('fixture', 'arguments.js', realArguments('arguments'), 'arguments', 'S7 isArguments');
add('fixture', 'array.js', [], 'array', 'S5 isArray');
add('fixture', 'boolean.js', true, 'boolean', 'S3 typeof');
add('fixture', 'buffer.js', Buffer.from('foo'), 'buffer', 'S6 isBuffer');
add('fixture', 'date.js', new Date(), 'date', 'S8 isDate');
add('fixture', 'error.js', new Error('foo'), 'error', 'S9 isError');
add('fixture', 'function.js', function () {}, 'function', 'S4 typeof function');
add('fixture', 'generator.js', genFn, 'generatorfunction', 'S4 typeof function');
add('fixture', 'map.js', new Map(), 'map', 'S11 ctorName');
add('fixture', 'null.js', null, 'null', 'S2 === null');
add('fixture', 'number.js', 42, 'number', 'S3 typeof');
add('fixture', 'object-instance.js', new Foo(), 'object', 'S13 toString');
add('fixture', 'object-plain.js', {}, 'object', 'S13 toString');
add('fixture', 'regex.js', /foo/, 'regexp', 'S10 isRegexp');
add('fixture', 'set.js', new Set(), 'set', 'S11 ctorName');
add('fixture', 'string.js', 'foo bar baz', 'string', 'S3 typeof');
add('fixture', 'symbol.js', Symbol('foo'), 'symbol', 'S3 typeof');
add('fixture', 'template-strings.js', `welcome buddy`, 'string', 'S3 typeof');
add('fixture', 'undefined.js', undefined, 'undefined', 'S1 === void 0');
add('fixture', 'weakmap.js', new WeakMap(), 'weakmap', 'S11 ctorName');
add('fixture', 'weakset.js', new WeakSet(), 'weakset', 'S11 ctorName');

/* ---------- 2. 边界值 ---------- */
add('edge', 'NaN', NaN, 'number', 'S3 typeof');
add('edge', 'Infinity', Infinity, 'number', 'S3 typeof');
add('edge', 'arrow function', () => {}, 'function', 'S4 typeof function');
add('edge', 'async function', async function () {}, 'function', 'S4 typeof function');
add('edge', 'class', class A {}, 'function', 'S4 typeof function');
add('edge', 'generator object', (function* () {})(), 'generator', 'S12 isGeneratorObj');
add('edge', 'boxed symbol Object(Symbol())', Object(Symbol('x')), 'symbol', 'S11 ctorName');
add('edge', 'Promise', new Promise(function () {}), 'promise', 'S11 ctorName');
add('edge', 'Int8Array', new Int8Array(1), 'int8array', 'S11 ctorName');
add('edge', 'Uint8Array', new Uint8Array(1), 'uint8array', 'S11 ctorName');
add('edge', 'Uint8ClampedArray', new Uint8ClampedArray(1), 'uint8clampedarray', 'S11 ctorName');
add('edge', 'Int16Array', new Int16Array(1), 'int16array', 'S11 ctorName');
add('edge', 'Uint16Array', new Uint16Array(1), 'uint16array', 'S11 ctorName');
add('edge', 'Int32Array', new Int32Array(1), 'int32array', 'S11 ctorName');
add('edge', 'Uint32Array', new Uint32Array(1), 'uint32array', 'S11 ctorName');
add('edge', 'Float32Array', new Float32Array(1), 'float32array', 'S11 ctorName');
add('edge', 'Float64Array', new Float64Array(1), 'float64array', 'S11 ctorName');
add('edge', 'Map iterator', new Map().keys(), 'mapiterator', 'S13 toString');
add('edge', 'Set iterator', new Set().values(), 'setiterator', 'S13 toString');
add('edge', 'String iterator', ''[Symbol.iterator](), 'stringiterator', 'S13 toString');
add('edge', 'Array iterator', [][Symbol.iterator](), 'arrayiterator', 'S13 toString');
add('edge', 'DataView', new DataView(new ArrayBuffer(8)), 'dataview', 'S14 fallback');
add('edge', 'ArrayBuffer', new ArrayBuffer(8), 'arraybuffer', 'S14 fallback');
add('edge', 'bigint 1n', 1n, 'bigint', 'S14 fallback');
add('edge', 'boxed boolean', new Boolean(true), 'boolean', 'S14 fallback');
add('edge', 'Math', Math, 'math', 'S14 fallback');
add('edge', 'Object.create(null)', Object.create(null), 'object', 'S13 toString');
add('edge', 'strict-mode arguments', strictArguments(), 'arguments', 'S7 isArguments(catch)');
add('edge', 'duck-typed date', {
  toDateString: function () {}, getDate: function () {}, setDate: function () {}
}, 'date', 'S8 isDate(duck)');
add('edge', 'duck-typed regexp', {
  flags: '', ignoreCase: false, multiline: false, global: false
}, 'regexp', 'S10 isRegexp(duck)');
add('edge', 'duck-typed error', {
  message: 'x', constructor: { stackTraceLimit: 10 }
}, 'error', 'S9 isError(duck)');
add('edge', 'TypeError subclass', new TypeError('x'), 'error', 'S9 isError');

/* ---------- 3. 实测 + 比对 ---------- */
var rows = [];
var failures = 0;

cases.forEach(function (c) {
  var actual = kindOf(c.value);
  var pass = actual === c.expected;
  if (!pass) failures++;
  rows.push({ c: c, actual: actual, pass: pass });
});

/* ---------- 4. 生成 markdown 矩阵 ---------- */
var lines = [];
lines.push('# 证据矩阵(脚本实测生成,勿手改)');
lines.push('');
lines.push('- 生成命令: `node evidence/matrix.js`');
lines.push('- 生成时间: ' + new Date().toISOString());
lines.push('- Node: ' + process.version);
lines.push('- 用例总数: ' + rows.length + ',通过: ' + (rows.length - failures) + ',失败: ' + failures);
lines.push('');
lines.push('| # | 分组 | 用例 | 判定步骤 | 期望(说明文档) | 实测 kindOf | 结果 |');
lines.push('|---|------|------|----------|----------------|-------------|------|');
rows.forEach(function (r, i) {
  lines.push('| ' + (i + 1)
    + ' | ' + r.c.group
    + ' | ' + r.c.name
    + ' | ' + r.c.step
    + ' | `' + r.c.expected + '`'
    + ' | `' + r.actual + '`'
    + ' | ' + (r.pass ? 'PASS' : '**FAIL**') + ' |');
});
lines.push('');

var outFile = path.join(__dirname, 'matrix.md');
fs.writeFileSync(outFile, lines.join('\n'), 'utf8');

console.log(lines.join('\n'));
if (failures > 0) {
  console.error(failures + ' case(s) mismatched.');
  process.exit(1);
}
console.log('All ' + rows.length + ' cases matched. Matrix written to ' + outFile);
