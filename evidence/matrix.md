# 证据矩阵(脚本实测生成,勿手改)

- 生成命令: `node evidence/matrix.js`
- 生成时间: 2026-09-24T07:10:30.156Z
- Node: v20.19.5
- 用例总数: 53,通过: 53,失败: 0

| # | 分组 | 用例 | 判定步骤 | 期望(说明文档) | 实测 kindOf | 结果 |
|---|------|------|----------|----------------|-------------|------|
| 1 | fixture | arguments.js | S7 isArguments | `arguments` | `arguments` | PASS |
| 2 | fixture | array.js | S5 isArray | `array` | `array` | PASS |
| 3 | fixture | boolean.js | S3 typeof | `boolean` | `boolean` | PASS |
| 4 | fixture | buffer.js | S6 isBuffer | `buffer` | `buffer` | PASS |
| 5 | fixture | date.js | S8 isDate | `date` | `date` | PASS |
| 6 | fixture | error.js | S9 isError | `error` | `error` | PASS |
| 7 | fixture | function.js | S4 typeof function | `function` | `function` | PASS |
| 8 | fixture | generator.js | S4 typeof function | `generatorfunction` | `generatorfunction` | PASS |
| 9 | fixture | map.js | S11 ctorName | `map` | `map` | PASS |
| 10 | fixture | null.js | S2 === null | `null` | `null` | PASS |
| 11 | fixture | number.js | S3 typeof | `number` | `number` | PASS |
| 12 | fixture | object-instance.js | S13 toString | `object` | `object` | PASS |
| 13 | fixture | object-plain.js | S13 toString | `object` | `object` | PASS |
| 14 | fixture | regex.js | S10 isRegexp | `regexp` | `regexp` | PASS |
| 15 | fixture | set.js | S11 ctorName | `set` | `set` | PASS |
| 16 | fixture | string.js | S3 typeof | `string` | `string` | PASS |
| 17 | fixture | symbol.js | S3 typeof | `symbol` | `symbol` | PASS |
| 18 | fixture | template-strings.js | S3 typeof | `string` | `string` | PASS |
| 19 | fixture | undefined.js | S1 === void 0 | `undefined` | `undefined` | PASS |
| 20 | fixture | weakmap.js | S11 ctorName | `weakmap` | `weakmap` | PASS |
| 21 | fixture | weakset.js | S11 ctorName | `weakset` | `weakset` | PASS |
| 22 | edge | NaN | S3 typeof | `number` | `number` | PASS |
| 23 | edge | Infinity | S3 typeof | `number` | `number` | PASS |
| 24 | edge | arrow function | S4 typeof function | `function` | `function` | PASS |
| 25 | edge | async function | S4 typeof function | `function` | `function` | PASS |
| 26 | edge | class | S4 typeof function | `function` | `function` | PASS |
| 27 | edge | generator object | S12 isGeneratorObj | `generator` | `generator` | PASS |
| 28 | edge | boxed symbol Object(Symbol()) | S11 ctorName | `symbol` | `symbol` | PASS |
| 29 | edge | Promise | S11 ctorName | `promise` | `promise` | PASS |
| 30 | edge | Int8Array | S11 ctorName | `int8array` | `int8array` | PASS |
| 31 | edge | Uint8Array | S11 ctorName | `uint8array` | `uint8array` | PASS |
| 32 | edge | Uint8ClampedArray | S11 ctorName | `uint8clampedarray` | `uint8clampedarray` | PASS |
| 33 | edge | Int16Array | S11 ctorName | `int16array` | `int16array` | PASS |
| 34 | edge | Uint16Array | S11 ctorName | `uint16array` | `uint16array` | PASS |
| 35 | edge | Int32Array | S11 ctorName | `int32array` | `int32array` | PASS |
| 36 | edge | Uint32Array | S11 ctorName | `uint32array` | `uint32array` | PASS |
| 37 | edge | Float32Array | S11 ctorName | `float32array` | `float32array` | PASS |
| 38 | edge | Float64Array | S11 ctorName | `float64array` | `float64array` | PASS |
| 39 | edge | Map iterator | S13 toString | `mapiterator` | `mapiterator` | PASS |
| 40 | edge | Set iterator | S13 toString | `setiterator` | `setiterator` | PASS |
| 41 | edge | String iterator | S13 toString | `stringiterator` | `stringiterator` | PASS |
| 42 | edge | Array iterator | S13 toString | `arrayiterator` | `arrayiterator` | PASS |
| 43 | edge | DataView | S14 fallback | `dataview` | `dataview` | PASS |
| 44 | edge | ArrayBuffer | S14 fallback | `arraybuffer` | `arraybuffer` | PASS |
| 45 | edge | bigint 1n | S14 fallback | `bigint` | `bigint` | PASS |
| 46 | edge | boxed boolean | S14 fallback | `boolean` | `boolean` | PASS |
| 47 | edge | Math | S14 fallback | `math` | `math` | PASS |
| 48 | edge | Object.create(null) | S13 toString | `object` | `object` | PASS |
| 49 | edge | strict-mode arguments | S7 isArguments(catch) | `arguments` | `arguments` | PASS |
| 50 | edge | duck-typed date | S8 isDate(duck) | `date` | `date` | PASS |
| 51 | edge | duck-typed regexp | S10 isRegexp(duck) | `regexp` | `regexp` | PASS |
| 52 | edge | duck-typed error | S9 isError(duck) | `error` | `error` | PASS |
| 53 | edge | TypeError subclass | S9 isError | `error` | `error` | PASS |
