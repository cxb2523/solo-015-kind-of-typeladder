var kindOf = require('./index.js');

var cases = [
  ['boxed Number', new Number(42)],
  ['boxed String', new String('x')],
  ['boxed Boolean', new Boolean(true)],
  ['boxed Symbol', Object(Symbol('s'))],
  ['Symbol.prototype', Symbol.prototype],
  ['Object.create(null)', Object.create(null)],
  ['Object.create({})', Object.create({})],
  ['new Foo()', new (function Foo() {})()],
  ['class instance', new (class C {})()],
  ['async function', async function () {}],
  ['async arrow', async () => {}],
  ['generator object', (function* () { yield 1; })()],
  ['Promise.resolve', Promise.resolve(1)],
  ['array iterator', [].entries()],
  ['set iterator', new Set().values()],
  ['map iterator', new Map().values()],
  ['string iterator', ''[Symbol.iterator]()],
  ['Int8Array', new Int8Array(1)],
  ['Uint8ClampedArray', new Uint8ClampedArray(1)],
  ['Float64Array', new Float64Array(1)],
  ['ArrayBuffer', new ArrayBuffer(8)],
  ['NaN', NaN],
  ['Infinity', Infinity],
  ['WeakRef', new WeakRef({})],
  ['BigInt64Array', new BigInt64Array()],
  ['bigint primitive', 1n],
  ['URL', new URL('http://x/')],
  ['real arguments', (function () { return arguments; })()],
  ['strict arguments', (function () { 'use strict'; return arguments; })()],
  ['duck date', { toDateString() {}, getDate() {}, setDate() {} }],
  ['duck regexp', { flags: '', ignoreCase: false, multiline: false, global: false }],
  ['duck generator', { throw() {}, return() {}, next() {} }],
  ['duck error', { message: 'x', constructor: { stackTraceLimit: 10 } }],
  ['toStringTag object', { get [Symbol.toStringTag]() { return 'My Thing'; } }],
  ['Buffer toString', Buffer.from('abc')],
];

for (var pair of cases) {
  var v = pair[1];
  var ctor = null;
  try { ctor = typeof v.constructor === 'function' ? v.constructor.name : null; } catch (e) { ctor = 'THROW:' + e.message; }
  var tstr = null;
  try { tstr = Object.prototype.toString.call(v); } catch (e) { tstr = 'THROW'; }
  console.log(pair[0].padEnd(22), '=>', JSON.stringify(kindOf(v)),
    '| typeof=' + typeof v, '| ctor=' + ctor, '| toString=' + tstr);
}

// strict arguments.callee message
try {
  (function () { 'use strict'; return typeof arguments.callee; })();
} catch (e) {
  console.log('strict callee throw:', e.constructor.name, '|', e.message, '| has callee word:', e.message.indexOf('callee') !== -1);
}

// proxy throwing on length
var p = new Proxy({}, { get: function () { throw new Error('boom'); } });
console.log('proxy kindOf =>', kindOf(p));

// cross-realm-ish: plain object pretending with constructor null
console.log('ctor:null object =>', kindOf({ constructor: null }));

// Buffer raw toString
console.log('toString(buffer) =', Object.prototype.toString.call(Buffer.from('x')));
