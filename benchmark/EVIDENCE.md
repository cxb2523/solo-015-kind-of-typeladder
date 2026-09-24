# kindOf 验收证据

- 生成命令：`node benchmark/evidence.js`
- Node：`v20.19.5`
- 源码：`index.js`
- 规则：本文件由脚本写入；所有“实测”单元格都在脚本内调用 `kindOf` 得到，发现期望不符会断言失败。

## 源码顺序判定链

| 源码位置 | 判定条件 | 真实值例子 | 命中字符串 | 现场命中阶段 | 实测 | 为什么不会走到后面 |
| --- | --- | --- | --- | --- | --- | --- |
| index.js:4 | val === void 0 | undefined | undefined | 空值判定 index.js:4-5 | undefined | 第一个出口；undefined 在 typeof 之前被精确拦截。 |
| index.js:5 | val === null | null | null | 空值判定 index.js:4-5 | null | 必须早于 typeof；否则 null 的 typeof 会是 object。 |
| index.js:8 | typeof val === 'boolean' | true | boolean | typeof index.js:8-11 | boolean | 只接原始布尔值；new Boolean(true) 是 object，最后走兜底。 |
| index.js:9 | typeof val === 'string' | 'foo bar baz' | string | typeof index.js:8-11 | string | 普通字符串和模板字符串在此结束；字符串包装对象不在这里。 |
| index.js:10 | typeof val === 'number' | 42 | number | typeof index.js:8-11 | number | NaN、Infinity 也在此；数字包装对象不在此。 |
| index.js:11 | typeof val === 'symbol' | Symbol(foo) | symbol | typeof index.js:8-11 | symbol | 原始 symbol 在此结束；包装 symbol 后面由构造器名接住。 |
| index.js:12-14 | 函数且构造器名为 GeneratorFunction | function* namedGenerator() {} | generatorfunction | typeof/函数 index.js:12-14 | generatorfunction | 生成器函数仍属于 typeof function；先做生成器函数细分。 |
| index.js:12-14 | 函数且非 GeneratorFunction | [Function: noop] | function | typeof/函数 index.js:12-14 | function | 普通函数、async 函数、class 构造器都归 function。 |
| index.js:16 | Array.isArray 或 instanceof Array | [] | array | 鸭子类型探针 index.js:16-21 | array | 数组是对象链第一探针；数组子类也在这里提前命中。 |
| index.js:17 | constructor.isBuffer(val) | <Buffer 66 6f 6f> | buffer | 鸭子类型探针 index.js:16-21 | buffer | Buffer 虽继承 Uint8Array，但 Buffer 探针早于构造器名 switch。 |
| index.js:18 | arguments.length/callee，或 strict callee 抛错 | [Arguments] { '0': 1 } | arguments | 鸭子类型探针 index.js:16-21 | arguments | 真实 arguments 早于 date、error、regexp 探针。 |
| index.js:19 | instanceof Date，或 Date 鸭子三方法 | 2026-09-24T06:38:57.008Z | date | 鸭子类型探针 index.js:16-21 | date | 跨 realm Date 与伪装 Date 可在这里结束，到不了构造器名。 |
| index.js:20 | instanceof Error，或 V8 风格错误鸭子 | Error: foo | error | 鸭子类型探针 index.js:16-21 | error | 位于 regexp 探针之前；跨 realm Error 可由 stackTraceLimit 条件接住。 |
| index.js:21 | instanceof RegExp，或正则四属性鸭子 | /foo/ | regexp | 鸭子类型探针 index.js:16-21 | regexp | 位于构造器名 switch 之前；满足 flags/ignoreCase/multiline/global 的对象会提前命中。 |
| index.js:24 | ctorName === 'Symbol' | [Symbol: Symbol(boxed)] | symbol | 构造器名 index.js:23-47 | symbol | 这里接 Object(Symbol(...)) 和 Symbol.prototype；原始 symbol 已被 typeof 拦下。 |
| index.js:25 | ctorName === 'Promise' | Promise { 1 } | promise | 构造器名 index.js:23-47 | promise | Promise 未命中前面的任何对象探针，按构造器名返回。 |
| index.js:28 | ctorName === 'WeakMap' | WeakMap { <items unknown> } | weakmap | 构造器名 index.js:23-47 | weakmap | WeakMap 无专属鸭子探针，进入构造器名 switch。 |
| index.js:29 | ctorName === 'WeakSet' | WeakSet { <items unknown> } | weakset | 构造器名 index.js:23-47 | weakset | WeakSet 无专属鸭子探针，进入构造器名 switch。 |
| index.js:30 | ctorName === 'Map' | Map(0) {} | map | 构造器名 index.js:23-47 | map | Map 和同名子类按构造器名命中。 |
| index.js:31 | ctorName === 'Set' | Set(0) {} | set | 构造器名 index.js:23-47 | set | Set 和同名子类按构造器名命中。 |
| index.js:34 | ctorName === 'Int8Array' | Int8Array(1) [ 0 ] | int8array | 构造器名 index.js:23-47 | int8array | 8 位有符号类型数组在 switch 中显式小写化。 |
| index.js:35 | ctorName === 'Uint8Array' | Uint8Array(1) [ 0 ] | uint8array | 构造器名 index.js:23-47 | uint8array | 普通 Uint8Array 在此；Buffer 已在前一探针被拦截。 |
| index.js:36 | ctorName === 'Uint8ClampedArray' | Uint8ClampedArray(1) [ 0 ] | uint8clampedarray | 构造器名 index.js:23-47 | uint8clampedarray | 构造器名精确命中，不依赖 toString。 |
| index.js:39 | ctorName === 'Int16Array' | Int16Array(1) [ 0 ] | int16array | 构造器名 index.js:23-47 | int16array | 16 位有符号类型数组在 switch 中命中。 |
| index.js:40 | ctorName === 'Uint16Array' | Uint16Array(1) [ 0 ] | uint16array | 构造器名 index.js:23-47 | uint16array | 16 位无符号类型数组在 switch 中命中。 |
| index.js:43 | ctorName === 'Int32Array' | Int32Array(1) [ 0 ] | int32array | 构造器名 index.js:23-47 | int32array | 32 位有符号类型数组在 switch 中命中。 |
| index.js:44 | ctorName === 'Uint32Array' | Uint32Array(1) [ 0 ] | uint32array | 构造器名 index.js:23-47 | uint32array | 32 位无符号类型数组在 switch 中命中。 |
| index.js:45 | ctorName === 'Float32Array' | Float32Array(1) [ 0 ] | float32array | 构造器名 index.js:23-47 | float32array | 32 位浮点类型数组在 switch 中命中。 |
| index.js:46 | ctorName === 'Float64Array' | Float64Array(1) [ 0 ] | float64array | 构造器名 index.js:23-47 | float64array | 64 位浮点类型数组在 switch 中命中。 |
| index.js:49-51 | throw/return/next 均为 function | Object [Generator] {} | generator | 生成器对象探针 index.js:49-51 | generator | 生成器对象的 typeof 是 object，构造器也不是函数，故由三方法探针命中。 |
| index.js:56 | toString 标签为 [object Object] | CustomClass {} | object | toString 精确标签 index.js:54-62 | object | 普通对象、null 原型对象、普通类实例都在这里结束。 |
| index.js:58 | [object Map Iterator] | [Map Iterator] {  } | mapiterator | toString 精确标签 index.js:54-62 | mapiterator | Map 迭代器未命中构造器名和生成器探针，进入 toString 精确分支。 |
| index.js:59 | [object Set Iterator] | [Set Iterator] {  } | setiterator | toString 精确标签 index.js:54-62 | setiterator | Set 迭代器由 toString 精确分支返回。 |
| index.js:60 | [object String Iterator] | Object [String Iterator] {} | stringiterator | toString 精确标签 index.js:54-62 | stringiterator | 字符串本身已在 typeof 命中；这里只接字符串迭代器。 |
| index.js:61 | [object Array Iterator] | Object [Array Iterator] {} | arrayiterator | toString 精确标签 index.js:54-62 | arrayiterator | 数组本身已在数组探针命中；这里只接数组迭代器。 |
| index.js:65 | 上述分支均未命中，切片并规范化 toString 标签 | ArrayBuffer { [Uint8Contents]: <00>, byteLength: 1 } | arraybuffer | toString 兜底 index.js:65 | arraybuffer | 去掉 [object 与 ]，转小写，再删除空格；其他标签同一路径。 |

## benchmark/fixtures 证据矩阵

| 输入来源/表达式 | 真实值 | typeof | ctorName | toString 标签 | 现场命中阶段 | 说明期望 | kindOf 实测 | 核对 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| arguments.js | 'arguments' sentinel -> [Arguments] { '0': 'arguments' } | object | Object | [object Arguments] | 鸭子类型探针 index.js:16-21 | arguments | arguments | PASS |
| array.js | [] | object | Array | [object Array] | 鸭子类型探针 index.js:16-21 | array | array | PASS |
| boolean.js | true | boolean | Boolean | [object Boolean] | typeof index.js:8-11 | boolean | boolean | PASS |
| buffer.js | <Buffer 66 6f 6f> | object | Buffer | [object Uint8Array] | 鸭子类型探针 index.js:16-21 | buffer | buffer | PASS |
| date.js | 2026-09-24T06:38:57.011Z | object | Date | [object Date] | 鸭子类型探针 index.js:16-21 | date | date | PASS |
| error.js | Error: foo | object | Error | [object Error] | 鸭子类型探针 index.js:16-21 | error | error | PASS |
| function.js | [Function (anonymous)] | function | Function | [object Function] | typeof/函数 index.js:12-14 | function | function | PASS |
| generator.js | function* namedGenerator() {} | function | GeneratorFunction | [object GeneratorFunction] | typeof/函数 index.js:12-14 | generatorfunction | generatorfunction | PASS |
| map.js | Map(0) {} | object | Map | [object Map] | 构造器名 index.js:23-47 | map | map | PASS |
| null.js | null | object | null | [object Null] | 空值判定 index.js:4-5 | null | null | PASS |
| number.js | 42 | number | Number | [object Number] | typeof index.js:8-11 | number | number | PASS |
| object-instance.js | {} | object | Object | [object Object] | toString 精确标签 index.js:54-62 | object | object | PASS |
| object-plain.js | Foo {} | object | Foo | [object Object] | toString 精确标签 index.js:54-62 | object | object | PASS |
| regex.js | /foo/ | object | RegExp | [object RegExp] | 鸭子类型探针 index.js:16-21 | regexp | regexp | PASS |
| set.js | Set(0) {} | object | Set | [object Set] | 构造器名 index.js:23-47 | set | set | PASS |
| string.js | 'foo bar baz' | string | String | [object String] | typeof index.js:8-11 | string | string | PASS |
| symbol.js | Symbol(foo) | symbol | Symbol | [object Symbol] | typeof index.js:8-11 | symbol | symbol | PASS |
| template-strings.js | 'welcome buddy' | string | String | [object String] | typeof index.js:8-11 | string | string | PASS |
| undefined.js | undefined | undefined | null | [object Undefined] | 空值判定 index.js:4-5 | undefined | undefined | PASS |
| weakmap.js | WeakMap { <items unknown> } | object | WeakMap | [object WeakMap] | 构造器名 index.js:23-47 | weakmap | weakmap | PASS |
| weakset.js | WeakSet { <items unknown> } | object | WeakSet | [object WeakSet] | 构造器名 index.js:23-47 | weakset | weakset | PASS |

## 边界证据矩阵

| 输入来源/表达式 | 真实值 | typeof | ctorName | toString 标签 | 现场命中阶段 | 说明期望 | kindOf 实测 | 核对 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| new Boolean(true) | [Boolean: true] | object | Boolean | [object Boolean] | toString 兜底 index.js:65 | boolean | boolean | PASS |
| new Number(42) | [Number: 42] | object | Number | [object Number] | toString 兜底 index.js:65 | number | number | PASS |
| new String("boxed") | [String: 'boxed'] | object | String | [object String] | toString 兜底 index.js:65 | string | string | PASS |
| Object(Symbol("boxed")) | [Symbol: Symbol(boxed)] | object | Symbol | [object Symbol] | 构造器名 index.js:23-47 | symbol | symbol | PASS |
| Symbol.prototype | Object [Symbol] {} | object | Symbol | [object Symbol] | 构造器名 index.js:23-47 | symbol | symbol | PASS |
| NaN | NaN | number | Number | [object Number] | typeof index.js:8-11 | number | number | PASS |
| Infinity | Infinity | number | Number | [object Number] | typeof index.js:8-11 | number | number | PASS |
| 1n | 1n | bigint | BigInt | [object BigInt] | toString 兜底 index.js:65 | bigint | bigint | PASS |
| async function () {} | [AsyncFunction (anonymous)] | function | AsyncFunction | [object AsyncFunction] | typeof/函数 index.js:12-14 | function | function | PASS |
| function* namedGenerator() {} | function* namedGenerator() {} | function | GeneratorFunction | [object GeneratorFunction] | typeof/函数 index.js:12-14 | generatorfunction | generatorfunction | PASS |
| namedGenerator() | Object [Generator] {} | object | null | [object Generator] | 生成器对象探针 index.js:49-51 | generator | generator | PASS |
| argsSloppy(1, 2) | [Arguments] { '0': 1, '1': 2 } | object | Object | [object Arguments] | 鸭子类型探针 index.js:16-21 | arguments | arguments | PASS |
| argsStrict(1, 2) | [Arguments] { '0': 1, '1': 2 } | object | Object | [object Arguments] | 鸭子类型探针 index.js:16-21 | arguments | arguments | PASS |
| Buffer.from("foo") | <Buffer 66 6f 6f> | object | Buffer | [object Uint8Array] | 鸭子类型探针 index.js:16-21 | buffer | buffer | PASS |
| new Uint8Array(1) | Uint8Array(1) [ 0 ] | object | Uint8Array | [object Uint8Array] | 构造器名 index.js:23-47 | uint8array | uint8array | PASS |
| new Uint8ClampedArray(1) | Uint8ClampedArray(1) [ 0 ] | object | Uint8ClampedArray | [object Uint8ClampedArray] | 构造器名 index.js:23-47 | uint8clampedarray | uint8clampedarray | PASS |
| new Int8Array(1) | Int8Array(1) [ 0 ] | object | Int8Array | [object Int8Array] | 构造器名 index.js:23-47 | int8array | int8array | PASS |
| new Int16Array(1) | Int16Array(1) [ 0 ] | object | Int16Array | [object Int16Array] | 构造器名 index.js:23-47 | int16array | int16array | PASS |
| new Uint16Array(1) | Uint16Array(1) [ 0 ] | object | Uint16Array | [object Uint16Array] | 构造器名 index.js:23-47 | uint16array | uint16array | PASS |
| new Int32Array(1) | Int32Array(1) [ 0 ] | object | Int32Array | [object Int32Array] | 构造器名 index.js:23-47 | int32array | int32array | PASS |
| new Uint32Array(1) | Uint32Array(1) [ 0 ] | object | Uint32Array | [object Uint32Array] | 构造器名 index.js:23-47 | uint32array | uint32array | PASS |
| new Float32Array(1) | Float32Array(1) [ 0 ] | object | Float32Array | [object Float32Array] | 构造器名 index.js:23-47 | float32array | float32array | PASS |
| new Float64Array(1) | Float64Array(1) [ 0 ] | object | Float64Array | [object Float64Array] | 构造器名 index.js:23-47 | float64array | float64array | PASS |
| new BigInt64Array(1) | BigInt64Array(1) [ 0n ] | object | BigInt64Array | [object BigInt64Array] | toString 兜底 index.js:65 | bigint64array | bigint64array | PASS |
| new BigUint64Array(1) | BigUint64Array(1) [ 0n ] | object | BigUint64Array | [object BigUint64Array] | toString 兜底 index.js:65 | biguint64array | biguint64array | PASS |
| new ArrayBuffer(1) | ArrayBuffer { [Uint8Contents]: <00>, byteLength: 1 } | object | ArrayBuffer | [object ArrayBuffer] | toString 兜底 index.js:65 | arraybuffer | arraybuffer | PASS |
| new DataView(new ArrayBuffer(1)) | DataView { byteLength: 1, byteOffset: 0, buffer: [ArrayBuffer] } | object | DataView | [object DataView] | toString 兜底 index.js:65 | dataview | dataview | PASS |
| Promise.resolve(1) | Promise { 1 } | object | Promise | [object Promise] | 构造器名 index.js:23-47 | promise | promise | PASS |
| new WeakMap() | WeakMap { <items unknown> } | object | WeakMap | [object WeakMap] | 构造器名 index.js:23-47 | weakmap | weakmap | PASS |
| new WeakSet() | WeakSet { <items unknown> } | object | WeakSet | [object WeakSet] | 构造器名 index.js:23-47 | weakset | weakset | PASS |
| new Map().values() | [Map Iterator] {  } | object | Object | [object Map Iterator] | toString 精确标签 index.js:54-62 | mapiterator | mapiterator | PASS |
| new Set().values() | [Set Iterator] {  } | object | Object | [object Set Iterator] | toString 精确标签 index.js:54-62 | setiterator | setiterator | PASS |
| [].entries() | Object [Array Iterator] {} | object | Object | [object Array Iterator] | toString 精确标签 index.js:54-62 | arrayiterator | arrayiterator | PASS |
| ""[Symbol.iterator]() | Object [String Iterator] {} | object | Object | [object String Iterator] | toString 精确标签 index.js:54-62 | stringiterator | stringiterator | PASS |
| new CustomClass() | CustomClass {} | object | CustomClass | [object Object] | toString 精确标签 index.js:54-62 | object | object | PASS |
| Object.create(null) | [Object: null prototype] {} | object | null | [object Object] | toString 精确标签 index.js:54-62 | object | object | PASS |
| Object.create({}) | {} | object | Object | [object Object] | toString 精确标签 index.js:54-62 | object | object | PASS |
| class M extends Map {}; new M() | M(0) [Map] {} | object | M | [object Map] | toString 兜底 index.js:65 | map | map | PASS |
| class A extends Array {}; new A() | A(0) [] | object | A | [object Array] | 鸭子类型探针 index.js:16-21 | array | array | PASS |
| vm new Date() | 2026-09-24T06:38:57.016Z | object | Date | [object Date] | 鸭子类型探针 index.js:16-21 | date | date | PASS |
| vm new Error("x") | Error: x | object | Error | [object Error] | 鸭子类型探针 index.js:16-21 | error | error | PASS |
| vm /x/ | /x/ | object | RegExp | [object RegExp] | 鸭子类型探针 index.js:16-21 | regexp | regexp | PASS |
| vm arguments | [Arguments] {} | object | Object | [object Arguments] | 鸭子类型探针 index.js:16-21 | arguments | arguments | PASS |
| duck Date | { toDateString: [Function: noop], getDate: [Function: noop], setDate: [Function: noop] } | object | Object | [object Object] | 鸭子类型探针 index.js:16-21 | date | date | PASS |
| duck RegExp | { flags: '', ignoreCase: false, multiline: false, global: false } | object | Object | [object Object] | 鸭子类型探针 index.js:16-21 | regexp | regexp | PASS |
| duck Error | { message: 'boom', constructor: [Object] } | object | null | [object Object] | 鸭子类型探针 index.js:16-21 | error | error | PASS |
| duck generator object | { next: [Function: noop], return: [Function: noop], throw: [Function: noop] } | object | Object | [object Object] | 生成器对象探针 index.js:49-51 | generator | generator | PASS |
| { constructor: Promise } | { constructor: [Function: Promise] } | object | Promise | [object Object] | 构造器名 index.js:23-47 | promise | promise | PASS |
| { constructor: Map } | { constructor: [Function: Map] } | object | Map | [object Object] | 构造器名 index.js:23-47 | map | map | PASS |
| { constructor: Symbol } | { constructor: [Function: Symbol] } | object | Symbol | [object Object] | 构造器名 index.js:23-47 | symbol | symbol | PASS |
| Symbol.toStringTag = "My Thing" | { [Symbol(Symbol.toStringTag)]: [Getter] } | object | Object | [object My Thing] | toString 兜底 index.js:65 | mything | mything | PASS |
| new URL("http://example/") | URL { href: 'http://example/', origin: 'http://example', protocol: 'http:', username: '', password: '', host: 'example', hostname: 'example', port: '', pathname: '/', search: '', searchParams: [Object], hash: '' } | object | URL | [object URL] | toString 兜底 index.js:65 | url | url | PASS |
| new WeakRef({}) | WeakRef {} | object | WeakRef | [object WeakRef] | toString 兜底 index.js:65 | weakref | weakref | PASS |

## 看似走不到的分支

| 分支 | 结论 | 现场证据 | 原因 |
| --- | --- | --- | --- |
| index.js:74 的 `val instanceof Array` 回退 | 标准运行时不可达；删除 `Array.isArray` 后可走 | 本脚本运行时 `typeof Array.isArray` 为 function，并在临时删除后实测 `kindOf([])` 仍为 array：true | index.js:73 的 truthy 判断在 Node 及现代浏览器恒为 true，因此同一函数内的 index.js:74 不会执行。 |
| index.js:96 的 `isGeneratorFn(name, val)` 第二参数 `val` | 形参存在但调用点从不传入，也不在函数体使用 | 唯一调用点是 index.js:13，只传 `val`；函数体 index.js:97 只读取第一个参数。 | 这是无效形参，不是可命中的判定分支；行为仍正确，因为函数只需要被检测的函数对象。 |
| index.js:111-114 strict arguments catch 分支 | 可达，不是死分支 | 边界矩阵中的 `argsStrict(1, 2)` 实测为 arguments；strict 模式读取 `arguments.callee` 抛包含 callee 的 TypeError。 | 该 catch 正是现代 strict 模式识别真实 arguments 的路径。 |
| index.js:58-61 四个 iterator 精确 case | 可达，不是死分支；删除它们结果仍与兜底相同 | 边界矩阵现场喂入 Map/Set/String/Array iterator，实测四个 mapiterator/setiterator/stringiterator/arrayiterator。 | 这些 case 会真实命中；它们显式固定迭代器名称，虽然最终字符串与 index.js:65 兜底算法相同。 |
| index.js:82-85、index.js:89-93、index.js:78 的鸭子回退 | 可达，不是死分支 | 边界矩阵包含 vm 跨 realm Date/Error/RegExp/arguments 以及四组伪装对象，全部实测命中对应探针。 | 跨 realm 会让 `instanceof` 失败，鸭子条件负责兼容；普通伪装对象也会被这些探针提前分类。 |

## 统一核对

- 判定链用例：36
- fixture 用例：21
- 边界用例：53
- 总用例：110
- 结果：全部 PASS
