# kind-of 判定链验收说明

本文档是 kind-of(`index.js`)类型判定链的验收标准。所有结论以实测为准:
运行 `node evidence/matrix.js` 会把 `benchmark/fixtures` 的 21 个类型和 32 个边界值
现场喂给 `kindOf`,实测结果逐格写入 `evidence/matrix.md`;任何一格与本文档声明的
期望值不一致,脚本以非零码退出,即视为验收不通过。

判定链按 `index.js` 源码顺序编号 S1–S14。每一步说明:判什么、命中返回什么、
为什么轮到它(前面的步骤为什么没拦住)、以及一个真实值例子。

## 判定链(源码顺序)

### S1 `val === void 0` → `'undefined'`(index.js:4)
- 判什么:严格等于 `void 0`,只命中 `undefined` 本身。
- 例子:`undefined` → `'undefined'`。
- 位置理由:必须最先判,因为后续所有探针(`val.constructor`、`val.length` 等)
  都会在 `undefined` 上抛 TypeError。

### S2 `val === null` → `'null'`(index.js:5)
- 判什么:严格等于 `null`。
- 例子:`null` → `'null'`。
- 为什么 S1 没拦住:`null !== void 0`(严格相等不做类型转换)。
- 位置理由:同 S1,`null` 上任何属性访问都会抛错,必须在探针之前短路;
  也因为 `typeof null === 'object'`,若不在这里拦,S3 的 typeof 分支会放它过去。

### S3 `typeof` 原始类型 → `'boolean'` / `'string'` / `'number'` / `'symbol'`(index.js:7-11)
- 判什么:`typeof val` 依次为四种原始类型时直接返回同名字符串。
- 例子:`true` → `'boolean'`;`'foo bar baz'` → `'string'`;`42`、`NaN`、`Infinity`
  → `'number'`;`Symbol('foo')` → `'symbol'`。
- 为什么 S1/S2 没拦住:这些都是有值的原始类型,不等于 `void 0` 或 `null`。
- 注意:`typeof` 对原始 symbol 返回 `'symbol'`,所以原始 symbol 在这里就被拦下,
  永远走不到 S11 的 `case 'Symbol'`(见"不可达分支"一节)。模板字符串
  `` `welcome buddy` `` 本质就是 string,同样在此返回。

### S4 `typeof val === 'function'` → `'generatorfunction'` / `'function'`(index.js:12-14)
- 判什么:所有可调用对象。再用 `isGeneratorFn`(构造器名是否为
  `'GeneratorFunction'`)区分生成器函数。
- 例子:`function () {}`、箭头函数、async 函数、`class A {}` → `'function'`;
  `function* gen() {}` → `'generatorfunction'`。
- 为什么 S3 没拦住:函数的 `typeof` 是 `'function'`,不在前四个分支里。
- 注意:async 函数的构造器名是 `'AsyncFunction'`,不等于 `'GeneratorFunction'`,
  所以返回 `'function'`;class 同理(`typeof class A {} === 'function'`)。

### S5 `isArray(val)` → `'array'`(index.js:16)
- 判什么:`Array.isArray(val)`(存在时);否则回退 `val instanceof Array`。
- 例子:`[]` → `'array'`。
- 为什么 S4 没拦住:数组的 `typeof` 是 `'object'`,不是 `'function'`。
- 位置理由:数组也有数字 `length`,若排在 `isArguments` 之后,虽然不会因
  `callee` 误判,但顺序上数组是最高频对象,先判成本最低。

### S6 `isBuffer(val)` → `'buffer'`(index.js:17)
- 判什么:`val.constructor.isBuffer` 存在且调用返回真。这是 Node Buffer 的
  官方探针,不依赖 `instanceof`(跨 realm 也有效)。
- 例子:`Buffer.from('foo')` → `'buffer'`。
- 为什么 S5 没拦住:Buffer 是 `Uint8Array` 的子类,不是 Array,
  `Array.isArray` 返回 false。
- 位置理由:必须在 S11 之前,否则 Buffer 会被构造器名判成 `'uint8array'`。

### S7 `isArguments(val)` → `'arguments'`(index.js:18)
- 判什么:鸭子类型 —— `length` 是数字且 `callee` 是函数。严格模式 arguments
  访问 `callee` 会抛 TypeError,catch 里检查错误消息含 `'callee'` 也算命中。
- 例子:非严格函数里的 `arguments` → `'arguments'`;严格模式函数的
  `arguments` → `'arguments'`(走 catch 分支)。
- 为什么 S5/S6 没拦住:arguments 不是数组(`Array.isArray` 为 false),
  构造器是 `Object`,没有 `isBuffer` 静态方法。

### S8 `isDate(val)` → `'date'`(index.js:19)
- 判什么:`instanceof Date`,或鸭子类型 —— 同时有 `toDateString`/`getDate`/
  `setDate` 三个函数。
- 例子:`new Date()` → `'date'`;伪造对象 `{toDateString(){}, getDate(){},
  setDate(){}}` → `'date'`(鸭子分支)。
- 为什么 S7 没拦住:Date 没有数字 `length`(`date.length` 是 `undefined`)。

### S9 `isError(val)` → `'error'`(index.js:20)
- 判什么:`instanceof Error`,或鸭子类型 —— `message` 是字符串且构造器上有
  数字 `stackTraceLimit`(V8 特征)。
- 例子:`new Error('foo')`、`new TypeError('x')` → `'error'`;伪造对象
  `{message:'x', constructor:{stackTraceLimit:10}}` → `'error'`(鸭子分支)。
- 为什么 S8 没拦住:Error 没有 `toDateString` 等方法。

### S10 `isRegexp(val)` → `'regexp'`(index.js:21)
- 判什么:`instanceof RegExp`,或鸭子类型 —— `flags` 是字符串且
  `ignoreCase`/`multiline`/`global` 都是布尔值。
- 例子:`/foo/` → `'regexp'`;伪造对象 `{flags:'', ignoreCase:false,
  multiline:false, global:false}` → `'regexp'`(鸭子分支)。
- 为什么 S9 没拦住:RegExp 的 `message` 是 `undefined`,不是字符串。

### S11 `switch (ctorName(val))` → 构造器名匹配(index.js:23-47)
- 判什么:`val.constructor.name`(`constructor` 不是函数时得 `null`,switch 落空)。
  覆盖 `'Symbol'`→`'symbol'`、`'Promise'`→`'promise'`、`'WeakMap'`/`'WeakSet'`/
  `'Map'`/`'Set'` → 同名小写,以及 9 种 TypedArray → 同名小写。
- 例子:`new Map()` → `'map'`;`new Set()` → `'set'`;`new WeakMap()` → `'weakmap'`;
  `new WeakSet()` → `'weakset'`;`new Promise(function(){})` → `'promise'`;
  `new Float64Array(1)` → `'float64array'`;装箱符号 `Object(Symbol('x'))`
  → `'symbol'`。
- 为什么 S5–S10 没拦住:这些对象不是数组/Buffer/arguments,也没有 Date/
  Error/RegExp 的鸭子特征(Map 没有 `message`,Promise 没有 `flags`)。
- 位置理由:TypedArray 必须在这里按构造器名区分,因为它们彼此不是
  `instanceof` 关系,而 S6 已先把 Buffer(同为 Uint8Array 家族)拦走。

### S12 `isGeneratorObj(val)` → `'generator'`(index.js:49-51)
- 判什么:鸭子类型 —— 同时有 `throw`/`return`/`next` 三个函数(迭代器协议 +
  throw)。
- 例子:`(function* () {})()` → `'generator'`。
- 为什么 S11 没拦住:生成器对象的构造器名是 `'Generator'`,不在 S11 的任何
  case 里,switch 落空。

### S13 `switch (toString.call(val))` → 内部槽标签匹配(index.js:54-62)
- 判什么:`Object.prototype.toString` 的结果。`'[object Object]'` → `'object'`;
  四种迭代器标签 → `'mapiterator'`/`'setiterator'`/`'stringiterator'`/
  `'arrayiterator'`。
- 例子:`{}`、`new Foo()`、`Object.create(null)` → `'object'`;
  `new Map().keys()` → `'mapiterator'`;`new Set().values()` → `'setiterator'`;
  `''[Symbol.iterator]()` → `'stringiterator'`;`[][Symbol.iterator]()`
  → `'arrayiterator'`。
- 为什么 S11/S12 没拦住:普通对象构造器名 `'Object'`、自定义类实例构造器名
  `'Foo'` 都不在 S11 的 case 里;它们也没有 `throw`/`return`/`next` 三件套
  (迭代器有 `next` 但没有 `throw` 和 `return`,所以 S12 不误判)。

### S14 兜底 `type.slice(8, -1).toLowerCase().replace(/\s/g, '')`(index.js:65)
- 判什么:把 `'[object Xxx]'` 裁出 `Xxx`,转小写、去空白,直接当类型名返回。
  任何前面没认出来的值都落在这里。
- 例子:`new DataView(new ArrayBuffer(8))` → `'dataview'`;`new ArrayBuffer(8)`
  → `'arraybuffer'`;`1n` → `'bigint'`;`new Boolean(true)` → `'boolean'`;
  `Math` → `'math'`。
- 为什么 S13 没拦住:它们的 toString 标签(`'[object DataView]'` 等)不在
  S13 的五个 case 里。
- 注意:`1n` 是原始类型却一路落到兜底 —— `typeof 1n === 'bigint'` 不在 S3/S4
  的任何分支里,而 bigint 原始值上访问 `constructor`/`length` 等属性不会抛错
  (会装箱),所以它能安全走完全程,最后由 `'[object BigInt]'` 裁出 `'bigint'`。

## 不可达 / 半不可达分支

### 1. `isArray` 的 `val instanceof Array` 回退(index.js:74)— 在 Node 中不可达
```js
function isArray(val) {
  if (Array.isArray) return Array.isArray(val);
  return val instanceof Array;   // ← 走不到
}
```
`Array.isArray` 是 ES5 特性,Node 全版本和所有现代浏览器都存在,第一个
`return` 永远先执行,`instanceof` 行只在 IE8 及更早的环境才会被触及。

### 2. `isGeneratorFn(name, val)` 的第二个形参(index.js:96)— 死参数
```js
function isGeneratorFn(name, val) {
  return ctorName(name) === 'GeneratorFunction';
}
```
调用处是 `isGeneratorFn(val)`(index.js:13),只传一个实参,形参 `val` 永远是
`undefined`,且函数体根本没引用它 —— 是重构残留。另外第一形参名叫 `name`,
实际接收的是函数值本身(靠 `ctorName` 再取构造器名),名不副实但结果正确。

### 3. `case 'Symbol': return 'symbol'`(index.js:24)— 对原始 symbol 不可达
原始 symbol 在 S3 就被 `typeof === 'symbol'` 拦走,永远到不了 S11。这个 case
唯一的入口是装箱符号 `Object(Symbol('x'))`:`typeof` 是 `'object'`,前十个步骤
全部落空,构造器名恰为 `'Symbol'`。矩阵第 28 行用该值实测命中 `'symbol'`。

### 4. 对比:难达但可达的回退分支(不算不可达)
以下分支触发条件苛刻,但矩阵里都有实测用例命中,不属于死代码:
- `isDate`/`isRegexp`/`isError` 的鸭子类型回退:伪造对象或跨 realm 值触发
  (矩阵第 50–52 行)。
- `isArguments` 的 catch 分支:仅严格模式 arguments 触发(矩阵第 49 行)。
- `isBuffer` 的 `val.constructor &&` 守卫:仅 `Object.create(null)` 这类无构造器
  对象需要,但函数整体对 Buffer 正常命中(矩阵第 4 行)。

## 证据矩阵

矩阵由 `node evidence/matrix.js` 现场生成,见 [evidence/matrix.md](evidence/matrix.md)。
53 个用例(21 个 fixture + 32 个边界)全部 PASS,与本说明逐步对应:
"判定步骤"列即本文的 S1–S14 编号。
