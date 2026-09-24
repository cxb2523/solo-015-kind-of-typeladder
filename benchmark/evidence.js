'use strict';

process.noDeprecation = true;

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var util = require('util');
var vm = require('vm');

var root = path.join(__dirname, '..');
var indexPath = path.join(root, 'index.js');
var fixtureDir = path.join(__dirname, 'fixtures');
var reportPath = path.join(__dirname, 'EVIDENCE.md');

var kindOf = require(indexPath);
var source = fs.readFileSync(indexPath, 'utf8');

function createTracedKindOf() {
  var lines = source.split(/\r?\n/);
  var lastStage = null;

  global.__kindReturn__ = function(stage, value) {
    lastStage = stage;
    return value;
  };

  function replaceReturn(lineNumber, stage) {
    var index = lineNumber - 1;
    var match = /^(\s*)if \((.*)\) return (.*?);\s*\r?$/.exec(lines[index]);
    if (match) {
      lines[index] = match[1] +
        'if (__kindReturn__(' + JSON.stringify(stage) + ', ' + match[2] + ')) return ' + match[3] + ';';
      return;
    }

    match = /^(\s*)case (.*): return (.*?);\s*\r?$/.exec(lines[index]);
    if (match) {
      lines[index] = match[1] +
        'case ' + match[2] + ': return __kindReturn__(' + JSON.stringify(stage) + ', ' + match[3] + ');';
      return;
    }

    match = /^(\s*)return (.*?);\s*\r?$/.exec(lines[index]);
    assert(match, 'expected a return statement on line ' + lineNumber);
    lines[index] = match[1] +
      'return __kindReturn__(' + JSON.stringify(stage) + ', ' + match[2] + ');';
  }

  replaceReturn(4, '空值判定 index.js:4-5');
  replaceReturn(5, '空值判定 index.js:4-5');
  replaceReturn(8, 'typeof index.js:8-11');
  replaceReturn(9, 'typeof index.js:8-11');
  replaceReturn(10, 'typeof index.js:8-11');
  replaceReturn(11, 'typeof index.js:8-11');

  assert.strictEqual(
    lines[12].trim(),
    "return isGeneratorFn(val) ? 'generatorfunction' : 'function';"
  );
  lines[12] =
    "  return __kindReturn__('typeof/函数 index.js:12-14', " +
    "isGeneratorFn(val) ? 'generatorfunction' : 'function');";

  [16, 17, 18, 19, 20, 21].forEach(function(lineNumber) {
    var index = lineNumber - 1;
    var match = /^(\s*)if \((.*)\) return (.*?);\s*\r?$/.exec(lines[index]);
    assert(match, 'expected guard return on line ' + lineNumber);
    lines[index] = match[1] +
      'if (__kindReturn__(' + JSON.stringify('鸭子类型探针 index.js:16-21') +
      ', ' + match[2] + ')) return ' + match[3] + ';';
  });

  [24, 25, 28, 29, 30, 31, 34, 35, 36, 39, 40, 43, 44, 45, 46]
    .forEach(function(lineNumber) {
      replaceReturn(lineNumber, '构造器名 index.js:23-47');
    });

  replaceReturn(50, '生成器对象探针 index.js:49-51');
  replaceReturn(56, 'toString 精确标签 index.js:54-62');
  replaceReturn(58, 'toString 精确标签 index.js:54-62');
  replaceReturn(59, 'toString 精确标签 index.js:54-62');
  replaceReturn(60, 'toString 精确标签 index.js:54-62');
  replaceReturn(61, 'toString 精确标签 index.js:54-62');
  replaceReturn(65, 'toString 兜底 index.js:65');

  var moduleObject = { exports: {} };
  var wrappedSource = '(function(module, exports, require, __filename, __dirname, global, __kindReturn__) {\n' +
    lines.join('\n') +
    '\n})';
  var compiled = vm.runInThisContext(wrappedSource, {
    filename: 'index.instrumented.js'
  });
  compiled.call(
    global,
    moduleObject,
    moduleObject.exports,
    require,
    indexPath,
    root,
    global,
    global.__kindReturn__
  );

  return function(value) {
    lastStage = null;
    return { result: moduleObject.exports(value), stage: lastStage };
  };
}

var tracedKindOf = createTracedKindOf();
delete global.__kindReturn__;

function noop() {}

function argsSloppy() {
  return arguments;
}

function argsStrict() {
  'use strict';
  return arguments;
}

function* namedGenerator() {
  yield 1;
}

function CustomClass() {}

function crossRealm(expression) {
  var context = vm.createContext({});
  return function() {
    return vm.runInContext(expression, context);
  };
}

function ctorNameOf(value) {
  try {
    if (value !== null && value !== undefined &&
      typeof value.constructor === 'function') {
      return value.constructor.name || '(anonymous)';
    }
    return 'null';
  } catch (err) {
    return 'throws: ' + err.message;
  }
}

function tagOf(value) {
  try {
    return Object.prototype.toString.call(value);
  } catch (err) {
    return 'throws: ' + err.message;
  }
}

function show(value) {
  if (value && typeof value.message === 'string' &&
    typeof value.constructor === 'function' &&
    typeof value.constructor.name === 'string' &&
    value.constructor.name) {
    return value.constructor.name + ': ' + value.message;
  }
  if (typeof value === 'function' && value.constructor &&
    value.constructor.name === 'GeneratorFunction') {
    return 'function* namedGenerator() {}';
  }
  return util
    .inspect(value, { depth: 0, breakLength: 64, maxArrayLength: 4 })
    .replace(/\r?\n\s*/g, ' ');
}

function md(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function observe(rawValue) {
  var value = rawValue;
  if (rawValue === 'arguments') {
    value = (function(benchmarkInput) {
      return arguments;
    })(rawValue);
  }

  var traced = tracedKindOf(value);
  var actual = kindOf(value);
  assert.strictEqual(traced.result, actual);

  return {
    display: rawValue === 'arguments' ? "'arguments' sentinel -> " + show(value) : show(value),
    typeofValue: typeof value,
    ctorNameValue: ctorNameOf(value),
    tag: tagOf(value),
    stage: traced.stage,
    actual: actual
  };
}

function row(cells) {
  return '| ' + cells.map(md).join(' | ') + ' |';
}

function table(headers, bodyRows) {
  return [row(headers), row(headers.map(function() { return '---'; }))]
    .concat(bodyRows.map(row))
    .join('\n');
}

function stageForKind(kind) {
  if (kind === 'undefined' || kind === 'null') {
    return '空值判定 index.js:4-5';
  }
  if (kind === 'boolean' || kind === 'number' || kind === 'string' || kind === 'symbol' ||
    kind === 'function' || kind === 'generatorfunction') {
    return kind === 'function' || kind === 'generatorfunction'
      ? 'typeof/函数 index.js:12-14'
      : 'typeof index.js:8-11';
  }
  if (kind === 'array' || kind === 'buffer' || kind === 'arguments' ||
    kind === 'date' || kind === 'error' || kind === 'regexp') {
    return '鸭子类型探针 index.js:16-21';
  }
  if (kind === 'generator') {
    return '生成器对象探针 index.js:49-51';
  }
  if (kind === 'object' || kind === 'mapiterator' || kind === 'setiterator' ||
    kind === 'stringiterator' || kind === 'arrayiterator') {
    return 'toString 精确标签 index.js:54-62';
  }
  return '构造器名 index.js:23-47';
}

function stageForChainLine(sourceLine) {
  if (sourceLine === 'index.js:4' || sourceLine === 'index.js:5') {
    return '空值判定 index.js:4-5';
  }
  if (/^index\.js:(8|9|10|11)$/.test(sourceLine)) {
    return 'typeof index.js:8-11';
  }
  if (sourceLine === 'index.js:12-14') {
    return 'typeof/函数 index.js:12-14';
  }
  if (/^index\.js:(16|17|18|19|20|21)$/.test(sourceLine)) {
    return '鸭子类型探针 index.js:16-21';
  }
  if (/^index\.js:(24|25|28|29|30|31|34|35|36|39|40|43|44|45|46)$/.test(sourceLine)) {
    return '构造器名 index.js:23-47';
  }
  if (sourceLine === 'index.js:49-51') {
    return '生成器对象探针 index.js:49-51';
  }
  if (sourceLine === 'index.js:65') {
    return 'toString 兜底 index.js:65';
  }
  return 'toString 精确标签 index.js:54-62';
}

var chainCases = [
  ['index.js:4', 'val === void 0', 'undefined', '第一个出口；undefined 在 typeof 之前被精确拦截。', function() { return undefined; }],
  ['index.js:5', 'val === null', 'null', '必须早于 typeof；否则 null 的 typeof 会是 object。', function() { return null; }],
  ['index.js:8', "typeof val === 'boolean'", 'boolean', '只接原始布尔值；new Boolean(true) 是 object，最后走兜底。', function() { return true; }],
  ['index.js:9', "typeof val === 'string'", 'string', '普通字符串和模板字符串在此结束；字符串包装对象不在这里。', function() { return 'foo bar baz'; }],
  ['index.js:10', "typeof val === 'number'", 'number', 'NaN、Infinity 也在此；数字包装对象不在此。', function() { return 42; }],
  ['index.js:11', "typeof val === 'symbol'", 'symbol', '原始 symbol 在此结束；包装 symbol 后面由构造器名接住。', function() { return Symbol('foo'); }],
  ['index.js:12-14', '函数且构造器名为 GeneratorFunction', 'generatorfunction', '生成器函数仍属于 typeof function；先做生成器函数细分。', function() { return namedGenerator; }],
  ['index.js:12-14', '函数且非 GeneratorFunction', 'function', '普通函数、async 函数、class 构造器都归 function。', function() { return noop; }],
  ['index.js:16', 'Array.isArray 或 instanceof Array', 'array', '数组是对象链第一探针；数组子类也在这里提前命中。', function() { return []; }],
  ['index.js:17', 'constructor.isBuffer(val)', 'buffer', 'Buffer 虽继承 Uint8Array，但 Buffer 探针早于构造器名 switch。', function() { return Buffer.from('foo'); }],
  ['index.js:18', 'arguments.length/callee，或 strict callee 抛错', 'arguments', '真实 arguments 早于 date、error、regexp 探针。', function() { return argsSloppy(1); }],
  ['index.js:19', 'instanceof Date，或 Date 鸭子三方法', 'date', '跨 realm Date 与伪装 Date 可在这里结束，到不了构造器名。', function() { return new Date(); }],
  ['index.js:20', 'instanceof Error，或 V8 风格错误鸭子', 'error', '位于 regexp 探针之前；跨 realm Error 可由 stackTraceLimit 条件接住。', function() { return new Error('foo'); }],
  ['index.js:21', 'instanceof RegExp，或正则四属性鸭子', 'regexp', '位于构造器名 switch 之前；满足 flags/ignoreCase/multiline/global 的对象会提前命中。', function() { return /foo/; }],
  ['index.js:24', "ctorName === 'Symbol'", 'symbol', '这里接 Object(Symbol(...)) 和 Symbol.prototype；原始 symbol 已被 typeof 拦下。', function() { return Object(Symbol('boxed')); }],
  ['index.js:25', "ctorName === 'Promise'", 'promise', 'Promise 未命中前面的任何对象探针，按构造器名返回。', function() { return Promise.resolve(1); }],
  ['index.js:28', "ctorName === 'WeakMap'", 'weakmap', 'WeakMap 无专属鸭子探针，进入构造器名 switch。', function() { return new WeakMap(); }],
  ['index.js:29', "ctorName === 'WeakSet'", 'weakset', 'WeakSet 无专属鸭子探针，进入构造器名 switch。', function() { return new WeakSet(); }],
  ['index.js:30', "ctorName === 'Map'", 'map', 'Map 和同名子类按构造器名命中。', function() { return new Map(); }],
  ['index.js:31', "ctorName === 'Set'", 'set', 'Set 和同名子类按构造器名命中。', function() { return new Set(); }],
  ['index.js:34', "ctorName === 'Int8Array'", 'int8array', '8 位有符号类型数组在 switch 中显式小写化。', function() { return new Int8Array(1); }],
  ['index.js:35', "ctorName === 'Uint8Array'", 'uint8array', '普通 Uint8Array 在此；Buffer 已在前一探针被拦截。', function() { return new Uint8Array(1); }],
  ['index.js:36', "ctorName === 'Uint8ClampedArray'", 'uint8clampedarray', '构造器名精确命中，不依赖 toString。', function() { return new Uint8ClampedArray(1); }],
  ['index.js:39', "ctorName === 'Int16Array'", 'int16array', '16 位有符号类型数组在 switch 中命中。', function() { return new Int16Array(1); }],
  ['index.js:40', "ctorName === 'Uint16Array'", 'uint16array', '16 位无符号类型数组在 switch 中命中。', function() { return new Uint16Array(1); }],
  ['index.js:43', "ctorName === 'Int32Array'", 'int32array', '32 位有符号类型数组在 switch 中命中。', function() { return new Int32Array(1); }],
  ['index.js:44', "ctorName === 'Uint32Array'", 'uint32array', '32 位无符号类型数组在 switch 中命中。', function() { return new Uint32Array(1); }],
  ['index.js:45', "ctorName === 'Float32Array'", 'float32array', '32 位浮点类型数组在 switch 中命中。', function() { return new Float32Array(1); }],
  ['index.js:46', "ctorName === 'Float64Array'", 'float64array', '64 位浮点类型数组在 switch 中命中。', function() { return new Float64Array(1); }],
  ['index.js:49-51', 'throw/return/next 均为 function', 'generator', '生成器对象的 typeof 是 object，构造器也不是函数，故由三方法探针命中。', function() { return namedGenerator(); }],
  ['index.js:56', "toString 标签为 [object Object]", 'object', '普通对象、null 原型对象、普通类实例都在这里结束。', function() { return new CustomClass(); }],
  ['index.js:58', '[object Map Iterator]', 'mapiterator', 'Map 迭代器未命中构造器名和生成器探针，进入 toString 精确分支。', function() { return new Map().values(); }],
  ['index.js:59', '[object Set Iterator]', 'setiterator', 'Set 迭代器由 toString 精确分支返回。', function() { return new Set().values(); }],
  ['index.js:60', '[object String Iterator]', 'stringiterator', '字符串本身已在 typeof 命中；这里只接字符串迭代器。', function() { return ''[Symbol.iterator](); }],
  ['index.js:61', '[object Array Iterator]', 'arrayiterator', '数组本身已在数组探针命中；这里只接数组迭代器。', function() { return [].entries(); }],
  ['index.js:65', '上述分支均未命中，切片并规范化 toString 标签', 'arraybuffer', '去掉 [object 与 ]，转小写，再删除空格；其他标签同一路径。', function() { return new ArrayBuffer(1); }]
];

var boundaryCases = [
  ['new Boolean(true)', 'boolean', function() { return new Boolean(true); }],
  ['new Number(42)', 'number', function() { return new Number(42); }],
  ['new String("boxed")', 'string', function() { return new String('boxed'); }],
  ['Object(Symbol("boxed"))', 'symbol', function() { return Object(Symbol('boxed')); }],
  ['Symbol.prototype', 'symbol', function() { return Symbol.prototype; }],
  ['NaN', 'number', function() { return NaN; }],
  ['Infinity', 'number', function() { return Infinity; }],
  ['1n', 'bigint', function() { return 1n; }],
  ['async function () {}', 'function', function() { return async function() {}; }],
  ['function* namedGenerator() {}', 'generatorfunction', function() { return namedGenerator; }],
  ['namedGenerator()', 'generator', function() { return namedGenerator(); }],
  ['argsSloppy(1, 2)', 'arguments', function() { return argsSloppy(1, 2); }],
  ['argsStrict(1, 2)', 'arguments', function() { return argsStrict(1, 2); }],
  ['Buffer.from("foo")', 'buffer', function() { return Buffer.from('foo'); }],
  ['new Uint8Array(1)', 'uint8array', function() { return new Uint8Array(1); }],
  ['new Uint8ClampedArray(1)', 'uint8clampedarray', function() { return new Uint8ClampedArray(1); }],
  ['new Int8Array(1)', 'int8array', function() { return new Int8Array(1); }],
  ['new Int16Array(1)', 'int16array', function() { return new Int16Array(1); }],
  ['new Uint16Array(1)', 'uint16array', function() { return new Uint16Array(1); }],
  ['new Int32Array(1)', 'int32array', function() { return new Int32Array(1); }],
  ['new Uint32Array(1)', 'uint32array', function() { return new Uint32Array(1); }],
  ['new Float32Array(1)', 'float32array', function() { return new Float32Array(1); }],
  ['new Float64Array(1)', 'float64array', function() { return new Float64Array(1); }],
  ['new BigInt64Array(1)', 'bigint64array', function() { return new BigInt64Array(1); }],
  ['new BigUint64Array(1)', 'biguint64array', function() { return new BigUint64Array(1); }],
  ['new ArrayBuffer(1)', 'arraybuffer', function() { return new ArrayBuffer(1); }],
  ['new DataView(new ArrayBuffer(1))', 'dataview', function() { return new DataView(new ArrayBuffer(1)); }],
  ['Promise.resolve(1)', 'promise', function() { return Promise.resolve(1); }],
  ['new WeakMap()', 'weakmap', function() { return new WeakMap(); }],
  ['new WeakSet()', 'weakset', function() { return new WeakSet(); }],
  ['new Map().values()', 'mapiterator', function() { return new Map().values(); }],
  ['new Set().values()', 'setiterator', function() { return new Set().values(); }],
  ['[].entries()', 'arrayiterator', function() { return [].entries(); }],
  ['""[Symbol.iterator]()', 'stringiterator', function() { return ''[Symbol.iterator](); }],
  ['new CustomClass()', 'object', function() { return new CustomClass(); }],
  ['Object.create(null)', 'object', function() { return Object.create(null); }],
  ['Object.create({})', 'object', function() { return Object.create({}); }],
  ['class M extends Map {}; new M()', 'map', function() { return new (class M extends Map {})(); }],
  ['class A extends Array {}; new A()', 'array', function() { return new (class A extends Array {})(); }],
  ['vm new Date()', 'date', crossRealm('new Date()')],
  ['vm new Error("x")', 'error', crossRealm('new Error("x")')],
  ['vm /x/', 'regexp', crossRealm('/x/')],
  ['vm arguments', 'arguments', crossRealm('(function(){return arguments})()')],
  ['duck Date', 'date', function() { return { toDateString: noop, getDate: noop, setDate: noop }; }],
  ['duck RegExp', 'regexp', function() { return { flags: '', ignoreCase: false, multiline: false, global: false }; }],
  ['duck Error', 'error', function() { return { message: 'boom', constructor: { stackTraceLimit: 10 } }; }],
  ['duck generator object', 'generator', function() { return { next: noop, return: noop, throw: noop }; }],
  ['{ constructor: Promise }', 'promise', function() { return { constructor: Promise }; }],
  ['{ constructor: Map }', 'map', function() { return { constructor: Map }; }],
  ['{ constructor: Symbol }', 'symbol', function() { return { constructor: Symbol }; }],
  ['Symbol.toStringTag = "My Thing"', 'mything', function() { return { get [Symbol.toStringTag]() { return 'My Thing'; } }; }],
  ['new URL("http://example/")', 'url', function() { return new URL('http://example/'); }],
  ['new WeakRef({})', 'weakref', function() { return new WeakRef({}); }]
];

var boundaryExpectedStages = [
  'toString 兜底 index.js:65',
  'toString 兜底 index.js:65',
  'toString 兜底 index.js:65',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  'typeof index.js:8-11',
  'typeof index.js:8-11',
  'toString 兜底 index.js:65',
  'typeof/函数 index.js:12-14',
  'typeof/函数 index.js:12-14',
  '生成器对象探针 index.js:49-51',
  '鸭子类型探针 index.js:16-21',
  '鸭子类型探针 index.js:16-21',
  '鸭子类型探针 index.js:16-21',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  'toString 兜底 index.js:65',
  'toString 兜底 index.js:65',
  'toString 兜底 index.js:65',
  'toString 兜底 index.js:65',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  'toString 精确标签 index.js:54-62',
  'toString 精确标签 index.js:54-62',
  'toString 精确标签 index.js:54-62',
  'toString 精确标签 index.js:54-62',
  'toString 精确标签 index.js:54-62',
  'toString 精确标签 index.js:54-62',
  'toString 精确标签 index.js:54-62',
  'toString 兜底 index.js:65',
  '鸭子类型探针 index.js:16-21',
  '鸭子类型探针 index.js:16-21',
  '鸭子类型探针 index.js:16-21',
  '鸭子类型探针 index.js:16-21',
  '鸭子类型探针 index.js:16-21',
  '鸭子类型探针 index.js:16-21',
  '鸭子类型探针 index.js:16-21',
  '鸭子类型探针 index.js:16-21',
  '生成器对象探针 index.js:49-51',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  '构造器名 index.js:23-47',
  'toString 兜底 index.js:65',
  'toString 兜底 index.js:65',
  'toString 兜底 index.js:65'
];

var fixtureExpected = {
  'arguments.js': 'arguments',
  'array.js': 'array',
  'boolean.js': 'boolean',
  'buffer.js': 'buffer',
  'date.js': 'date',
  'error.js': 'error',
  'function.js': 'function',
  'generator.js': 'generatorfunction',
  'map.js': 'map',
  'null.js': 'null',
  'number.js': 'number',
  'object-instance.js': 'object',
  'object-plain.js': 'object',
  'regex.js': 'regexp',
  'set.js': 'set',
  'string.js': 'string',
  'symbol.js': 'symbol',
  'template-strings.js': 'string',
  'undefined.js': 'undefined',
  'weakmap.js': 'weakmap',
  'weakset.js': 'weakset'
};

function fixtureRows() {
  return fs.readdirSync(fixtureDir)
    .filter(function(name) { return path.extname(name) === '.js'; })
    .sort()
    .reduce(function(rows, fileName) {
      var values = require(path.join(fixtureDir, fileName));
      return rows.concat(values.map(function(rawValue) {
        var observed = observe(rawValue);
        var expected = fixtureExpected[fileName];
        assert(expected, 'missing expected fixture mapping: ' + fileName);
        assert.strictEqual(observed.actual, expected);
        assert.strictEqual(observed.stage, stageForKind(expected));
        return [
          fileName,
          observed.display,
          observed.typeofValue,
          observed.ctorNameValue,
          observed.tag,
          observed.stage,
          expected,
          observed.actual,
          observed.actual === expected ? 'PASS' : 'FAIL'
        ];
      }));
    }, []);
}

function boundaryRows() {
  assert.strictEqual(boundaryExpectedStages.length, boundaryCases.length);
  return boundaryCases.map(function(testCase, index) {
    var label = testCase[0];
    var expected = testCase[1];
    var value = testCase[2]();
    var observed = observe(value);
    assert.strictEqual(observed.actual, expected);
    assert.strictEqual(observed.stage, boundaryExpectedStages[index]);
    return [
      label,
      observed.display,
      observed.typeofValue,
      observed.ctorNameValue,
      observed.tag,
      observed.stage,
      expected,
      observed.actual,
      observed.actual === expected && observed.stage === boundaryExpectedStages[index] ? 'PASS' : 'FAIL'
    ];
  });
}

function chainRows() {
  return chainCases.map(function(testCase) {
    var sourceLine = testCase[0];
    var predicate = testCase[1];
    var expected = testCase[2];
    var reason = testCase[3];
    var value = testCase[4]();
    var observed = observe(value);
    assert.strictEqual(observed.actual, expected);
    assert.strictEqual(observed.stage, stageForChainLine(sourceLine));
    return [
      sourceLine,
      predicate,
      observed.display,
      expected,
      observed.stage,
      observed.actual,
      reason
    ];
  });
}

function arrayIsArrayFallbackProbe() {
  var original = Array.isArray;
  var sawMissingBranch = false;
  try {
    assert.strictEqual(typeof original, 'function');
    Array.isArray = undefined;
    assert.strictEqual(kindOf([]), 'array');
    sawMissingBranch = true;
  } finally {
    Array.isArray = original;
  }
  return sawMissingBranch;
}

var sourceChecks = [
  {
    branch: 'index.js:74 的 `val instanceof Array` 回退',
    status: '标准运行时不可达；删除 `Array.isArray` 后可走',
    evidence: '本脚本运行时 `typeof Array.isArray` 为 function，并在临时删除后实测 `kindOf([])` 仍为 array：' + arrayIsArrayFallbackProbe(),
    reason: 'index.js:73 的 truthy 判断在 Node 及现代浏览器恒为 true，因此同一函数内的 index.js:74 不会执行。'
  },
  {
    branch: 'index.js:96 的 `isGeneratorFn(name, val)` 第二参数 `val`',
    status: '形参存在但调用点从不传入，也不在函数体使用',
    evidence: '唯一调用点是 index.js:13，只传 `val`；函数体 index.js:97 只读取第一个参数。',
    reason: '这是无效形参，不是可命中的判定分支；行为仍正确，因为函数只需要被检测的函数对象。'
  },
  {
    branch: 'index.js:111-114 strict arguments catch 分支',
    status: '可达，不是死分支',
    evidence: '边界矩阵中的 `argsStrict(1, 2)` 实测为 arguments；strict 模式读取 `arguments.callee` 抛包含 callee 的 TypeError。',
    reason: '该 catch 正是现代 strict 模式识别真实 arguments 的路径。'
  },
  {
    branch: 'index.js:58-61 四个 iterator 精确 case',
    status: '可达，不是死分支；删除它们结果仍与兜底相同',
    evidence: '边界矩阵现场喂入 Map/Set/String/Array iterator，实测四个 mapiterator/setiterator/stringiterator/arrayiterator。',
    reason: '这些 case 会真实命中；它们显式固定迭代器名称，虽然最终字符串与 index.js:65 兜底算法相同。'
  },
  {
    branch: 'index.js:82-85、index.js:89-93、index.js:78 的鸭子回退',
    status: '可达，不是死分支',
    evidence: '边界矩阵包含 vm 跨 realm Date/Error/RegExp/arguments 以及四组伪装对象，全部实测命中对应探针。',
    reason: '跨 realm 会让 `instanceof` 失败，鸭子条件负责兼容；普通伪装对象也会被这些探针提前分类。'
  }
];

var generatedChainRows = chainRows();
var generatedFixtureRows = fixtureRows();
var generatedBoundaryRows = boundaryRows();

[generatedChainRows, generatedFixtureRows, generatedBoundaryRows].forEach(function(rows) {
  rows.forEach(function(cells) {
    assert(cells.indexOf('FAIL') === -1);
  });
});

var matrixHeaders = [
  '输入来源/表达式',
  '真实值',
  'typeof',
  'ctorName',
  'toString 标签',
  '现场命中阶段',
  '说明期望',
  'kindOf 实测',
  '核对'
];

var report = [
  '# kindOf 验收证据',
  '',
  '- 生成命令：`node benchmark/evidence.js`',
  '- Node：`' + process.version + '`',
  '- 源码：`index.js`',
  '- 规则：本文件由脚本写入；所有“实测”单元格都在脚本内调用 `kindOf` 得到，发现期望不符会断言失败。',
  '',
  '## 源码顺序判定链',
  '',
  table(
    ['源码位置', '判定条件', '真实值例子', '命中字符串', '现场命中阶段', '实测', '为什么不会走到后面'],
    generatedChainRows
  ),
  '',
  '## benchmark/fixtures 证据矩阵',
  '',
  table(matrixHeaders, generatedFixtureRows),
  '',
  '## 边界证据矩阵',
  '',
  table(matrixHeaders, generatedBoundaryRows),
  '',
  '## 看似走不到的分支',
  '',
  table(
    ['分支', '结论', '现场证据', '原因'],
    sourceChecks.map(function(check) {
      return [check.branch, check.status, check.evidence, check.reason];
    })
  ),
  '',
  '## 统一核对',
  '',
  '- 判定链用例：' + generatedChainRows.length,
  '- fixture 用例：' + generatedFixtureRows.length,
  '- 边界用例：' + generatedBoundaryRows.length,
  '- 总用例：' + (generatedChainRows.length + generatedFixtureRows.length + generatedBoundaryRows.length),
  '- 结果：全部 PASS'
].join('\n');

fs.writeFileSync(reportPath, report + '\n');
console.log(report);
