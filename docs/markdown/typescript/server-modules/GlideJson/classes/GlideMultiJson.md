[**@valkey/valkey-glide**](../../../README.md)

***

[@valkey/valkey-glide](../../../modules.md) / [server-modules/GlideJson](../README.md) / GlideMultiJson

# Class: GlideMultiJson

Transaction implementation for JSON module. Transactions allow the execution of a group of
commands in a single step. See [Transaction](../../../Transaction/classes/Transaction.md) and [ClusterTransaction](../../../Transaction/classes/ClusterTransaction.md).

## Example

```typescript
const transaction = new Transaction();
GlideMultiJson.set(transaction, "doc", ".", '{"a": 1.0, "b": 2}');
GlideMultiJson.get(transaction, "doc");
const result = await client.exec(transaction);

console.log(result[0]); // Output: 'OK' - result of GlideMultiJson.set()
console.log(result[1]); // Output: '{"a": 1.0, "b": 2}' - result of GlideMultiJson.get()
```

## Constructors

### new GlideMultiJson()

> **new GlideMultiJson**(): [`GlideMultiJson`](GlideMultiJson.md)

#### Returns

[`GlideMultiJson`](GlideMultiJson.md)

## Methods

### arrappend()

> `static` **arrappend**(`transaction`, `key`, `path`, `values`): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Appends one or more `values` to the JSON array at the specified `path` within the JSON
document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `path` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The path within the JSON document. |
| `values` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md)[] | The JSON values to be appended to the array. JSON string values must be wrapped with quotes. For example, to append `"foo"`, pass `"\"foo\""`. Command Response - - For JSONPath (path starts with `$`): Returns an array with a list of integers for every possible path, indicating the new length of the array, or `null` for JSON values matching the path that are not an array. If `path` does not exist, an empty array will be returned. - For legacy path (path doesn't start with `$`): Returns an integer representing the new length of the array. If multiple paths are matched, returns the length of the first modified array. If `path` doesn't exist or the value at `path` is not an array, an error is raised. - If the index is out of bounds or `key` doesn't exist, an error is raised. |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### arrindex()

> `static` **arrindex**(`transaction`, `key`, `path`, `scalar`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Searches for the first occurrence of a `scalar` JSON value in the arrays at the `path`.
Out of range errors are treated by rounding the index to the array's `start` and `end.
If `start` > `end`, return `-1` (not found).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `path` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The path within the JSON document. |
| `scalar` | `null` \| `number` \| `boolean` \| [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The scalar value to search for. |
| `options`? | \{ `end`: `number`; `start`: `number`; \} | (Optional) Additional parameters: - (Optional) `start`: The start index, inclusive. Default to 0 if not provided. - (Optional) `end`: The end index, exclusive. Default to 0 if not provided. 0 or -1 means the last element is included. Command Response - - For JSONPath (path starts with `$`): Returns an array with a list of integers for every possible path, indicating the index of the matching element. The value is `-1` if not found. If a value is not an array, its corresponding return value is `null`. - For legacy path (path doesn't start with `$`): Returns an integer representing the index of matching element, or `-1` if not found. If the value at the `path` is not an array, an error is raised. |
| `options.end`? | `number` | - |
| `options.start`? | `number` | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### arrinsert()

> `static` **arrinsert**(`transaction`, `key`, `path`, `index`, `values`): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Inserts one or more values into the array at the specified `path` within the JSON
document stored at `key`, before the given `index`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `path` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The path within the JSON document. |
| `index` | `number` | The array index before which values are inserted. |
| `values` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md)[] | The JSON values to be inserted into the array. JSON string values must be wrapped with quotes. For example, to insert `"foo"`, pass `"\"foo\""`. Command Response - - For JSONPath (path starts with `$`): Returns an array with a list of integers for every possible path, indicating the new length of the array, or `null` for JSON values matching the path that are not an array. If `path` does not exist, an empty array will be returned. - For legacy path (path doesn't start with `$`): Returns an integer representing the new length of the array. If multiple paths are matched, returns the length of the first modified array. If `path` doesn't exist or the value at `path` is not an array, an error is raised. - If the index is out of bounds or `key` doesn't exist, an error is raised. |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### arrlen()

> `static` **arrlen**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Retrieves the length of the array at the specified `path` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The path within the JSON document. Defaults to the root (`"."`) if not specified. Command Response - - For JSONPath (path starts with `$`): Returns an array with a list of integers for every possible path, indicating the length of the array, or `null` for JSON values matching the path that are not an array. If `path` does not exist, an empty array will be returned. - For legacy path (path doesn't start with `$`): Returns an integer representing the length of the array. If multiple paths are matched, returns the length of the first matching array. If `path` doesn't exist or the value at `path` is not an array, an error is raised. - If the index is out of bounds or `key` doesn't exist, an error is raised. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### arrpop()

> `static` **arrpop**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Pops an element from the array located at `path` in the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | [`JsonArrPopOptions`](../interfaces/JsonArrPopOptions.md) | (Optional) See [JsonArrPopOptions](../interfaces/JsonArrPopOptions.md). Command Response - - For JSONPath (path starts with `$`): Returns an array with a strings for every possible path, representing the popped JSON values, or `null` for JSON values matching the path that are not an array or an empty array. - For legacy path (path doesn't start with `$`): Returns a string representing the popped JSON value, or `null` if the array at `path` is empty. If multiple paths are matched, the value from the first matching array that is not empty is returned. If `path` doesn't exist or the value at `path` is not an array, an error is raised. - If the index is out of bounds or `key` doesn't exist, an error is raised. |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### arrtrim()

> `static` **arrtrim**(`transaction`, `key`, `path`, `start`, `end`): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Trims an array at the specified `path` within the JSON document stored at `key` so that it becomes a subarray [start, end], both inclusive.
If `start` < 0, it is treated as 0.
If `end` >= size (size of the array), it is treated as size-1.
If `start` >= size or `start` > `end`, the array is emptied and 0 is returned.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `path` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The path within the JSON document. |
| `start` | `number` | The start index, inclusive. |
| `end` | `number` | The end index, inclusive. Command Response - - For JSONPath (`path` starts with `$`): - Returns a list of integer replies for every possible path, indicating the new length of the array, or `null` for JSON values matching the path that are not an array. - If the array is empty, its corresponding return value is 0. - If `path` doesn't exist, an empty array will be returned. - If an index argument is out of bounds, an error is raised. - For legacy path (`path` doesn't start with `$`): - Returns an integer representing the new length of the array. - If the array is empty, its corresponding return value is 0. - If multiple paths match, the length of the first trimmed array match is returned. - If `path` doesn't exist, or the value at `path` is not an array, an error is raised. - If an index argument is out of bounds, an error is raised. |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### clear()

> `static` **clear**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Clears arrays or objects at the specified JSON path in the document stored at `key`.
Numeric values are set to `0`, boolean values are set to `false`, and string values are converted to empty strings.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The JSON path to the arrays or objects to be cleared. Defaults to root if not provided. Command Response - The number of containers cleared, numeric values zeroed, and booleans toggled to `false`, and string values converted to empty strings. If `path` doesn't exist, or the value at `path` is already empty (e.g., an empty array, object, or string), `0` is returned. If `key doesn't exist, an error is raised. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### debugFields()

> `static` **debugFields**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Reports the number of fields at the specified `path` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The path within the JSON document, returns total number of fields if no path is given. Command Response - - For JSONPath (path starts with `$`): - Returns an array of numbers for every possible path, indicating the number of fields. If `path` does not exist, an empty array will be returned. - For legacy path (path doesn't start with `$`): - Returns an integer representing the memory usage. If multiple paths are matched, returns the data of the first matching object. If `path` doesn't exist, an error is raised. - If `key` doesn't exist, returns `null`. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### debugMemory()

> `static` **debugMemory**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Reports memory usage in bytes of a JSON object at the specified `path` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The path within the JSON document, returns total memory usage if no path is given. Command Response - - For JSONPath (path starts with `$`): - Returns an array of numbers for every possible path, indicating the memory usage. If `path` does not exist, an empty array will be returned. - For legacy path (path doesn't start with `$`): - Returns an integer representing the memory usage. If multiple paths are matched, returns the data of the first matching object. If `path` doesn't exist, an error is raised. - If `key` doesn't exist, returns `null`. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### del()

> `static` **del**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Deletes the JSON value at the specified `path` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: If `null`, deletes the entire JSON document at `key`. Command Response - The number of elements removed. If `key` or `path` doesn't exist, returns 0. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### forget()

> `static` **forget**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Deletes the JSON value at the specified `path` within the JSON document stored at `key`. This command is
an alias of [del](GlideMultiJson.md#del).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: If `null`, deletes the entire JSON document at `key`. Command Response - The number of elements removed. If `key` or `path` doesn't exist, returns 0. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### get()

> `static` **get**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Retrieves the JSON value at the specified `paths` stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | [`JsonGetOptions`](../interfaces/JsonGetOptions.md) | (Optional) Additional parameters: - (Optional) Options for formatting the byte representation of the JSON data. See [JsonGetOptions](../interfaces/JsonGetOptions.md). Command Response - - If one path is given: - For JSONPath (path starts with `$`): - Returns a stringified JSON list of bytes replies for every possible path, or a byte string representation of an empty array, if path doesn't exist. If `key` doesn't exist, returns `null`. - For legacy path (path doesn't start with `$`): Returns a byte string representation of the value in `path`. If `path` doesn't exist, an error is raised. If `key` doesn't exist, returns `null`. - If multiple paths are given: Returns a stringified JSON object in bytes, in which each path is a key, and it's corresponding value, is the value as if the path was executed in the command as a single path. In case of multiple paths, and `paths` are a mix of both JSONPath and legacy path, the command behaves as if all are JSONPath paths. |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### mget()

> `static` **mget**(`transaction`, `keys`, `path`): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Retrieves the JSON values at the specified `path` stored at multiple `keys`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | - |
| `keys` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md)[] | The keys of the JSON documents. |
| `path` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The path within the JSON documents. Command Response - - For JSONPath (path starts with `$`): Returns a stringified JSON list replies for every possible path, or a string representation of an empty array, if path doesn't exist. - For legacy path (path doesn't start with `$`): Returns a string representation of the value in `path`. If `path` doesn't exist, the corresponding array element will be `null`. - If a `key` doesn't exist, the corresponding array element will be `null`. |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

#### Remarks

When in cluster mode, all keys in the transaction must be mapped to the same slot.

***

### numincrby()

> `static` **numincrby**(`transaction`, `key`, `path`, `num`): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Increments or decrements the JSON value(s) at the specified `path` by `number` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `path` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The path within the JSON document. |
| `num` | `number` | The number to increment or decrement by. Command Response - - For JSONPath (path starts with `$`): - Returns a string representation of an array of strings, indicating the new values after incrementing for each matched `path`. If a value is not a number, its corresponding return value will be `null`. If `path` doesn't exist, a byte string representation of an empty array will be returned. - For legacy path (path doesn't start with `$`): - Returns a string representation of the resulting value after the increment or decrement. If multiple paths match, the result of the last updated value is returned. If the value at the `path` is not a number or `path` doesn't exist, an error is raised. - If `key` does not exist, an error is raised. - If the result is out of the range of 64-bit IEEE double, an error is raised. |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### nummultby()

> `static` **nummultby**(`transaction`, `key`, `path`, `num`): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Multiplies the JSON value(s) at the specified `path` by `number` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `path` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The path within the JSON document. |
| `num` | `number` | The number to multiply by. Command Response - - For JSONPath (path starts with `$`): - Returns a GlideString representation of an array of strings, indicating the new values after multiplication for each matched `path`. If a value is not a number, its corresponding return value will be `null`. If `path` doesn't exist, a byte string representation of an empty array will be returned. - For legacy path (path doesn't start with `$`): - Returns a GlideString representation of the resulting value after multiplication. If multiple paths match, the result of the last updated value is returned. If the value at the `path` is not a number or `path` doesn't exist, an error is raised. - If `key` does not exist, an error is raised. - If the result is out of the range of 64-bit IEEE double, an error is raised. |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### objkeys()

> `static` **objkeys**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Retrieves key names in the object values at the specified `path` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The path within the JSON document where the key names will be retrieved. Defaults to root (`"."`) if not provided. Command Response - ReturnTypeJson<GlideString[]>: - For JSONPath (`path` starts with `$`): - Returns a list of arrays containing key names for each matching object. - If a value matching the path is not an object, an empty array is returned. - If `path` doesn't exist, an empty array is returned. - For legacy path (`path` starts with `.`): - Returns a list of key names for the object value matching the path. - If multiple objects match the path, the key names of the first object is returned. - If a value matching the path is not an object, an error is raised. - If `path` doesn't exist, `null` is returned. - If `key` doesn't exist, `null` is returned. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### objlen()

> `static` **objlen**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Retrieves the number of key-value pairs in the object stored at the specified `path` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The path within the JSON document, Defaults to root (`"."`) if not provided. Command Response - ReturnTypeJson<number>: - For JSONPath (`path` starts with `$`): - Returns a list of integer replies for every possible path, indicating the length of the object, or `null` for JSON values matching the path that are not an object. - If `path` doesn't exist, an empty array will be returned. - For legacy path (`path` doesn't starts with `$`): - Returns the length of the object at `path`. - If multiple paths match, the length of the first object match is returned. - If the JSON value at `path` is not an object or if `path` doesn't exist, an error is raised. - If `key` doesn't exist, `null` is returned. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### resp()

> `static` **resp**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Retrieve the JSON value at the specified `path` within the JSON document stored at `key`.
The returning result is in the Valkey or Redis OSS Serialization Protocol (RESP).
- JSON null is mapped to the RESP Null Bulk String.
- JSON Booleans are mapped to RESP Simple string.
- JSON integers are mapped to RESP Integers.
- JSON doubles are mapped to RESP Bulk Strings.
- JSON strings are mapped to RESP Bulk Strings.
- JSON arrays are represented as RESP arrays, where the first element is the simple string [, followed by the array's elements.
- JSON objects are represented as RESP object, where the first element is the simple string {, followed by key-value pairs, each of which is a RESP bulk string.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The path within the JSON document, defaults to root (`"."`) if not provided. Command Response - - For JSONPath (path starts with `$`): - Returns an array of replies for every possible path, indicating the RESP form of the JSON value. If `path` doesn't exist, returns an empty array. - For legacy path (path doesn't start with `$`): - Returns a single reply for the JSON value at the specified `path`, in its RESP form. If multiple paths match, the value of the first JSON value match is returned. If `path` doesn't exist, an error is raised. - If `key` doesn't exist, `null` is returned. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### set()

> `static` **set**(`transaction`, `key`, `path`, `value`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Sets the JSON value at the specified `path` stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `path` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | Represents the path within the JSON document where the value will be set. The key will be modified only if `value` is added as the last child in the specified `path`, or if the specified `path` acts as the parent of a new child being added. |
| `value` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The value to set at the specific path, in JSON formatted bytes or str. |
| `options`? | \{ `conditionalChange`: [`ConditionalChange`](../../../Commands/enumerations/ConditionalChange.md); \} | (Optional) Additional parameters: - (Optional) `conditionalChange` - Set the value only if the given condition is met (within the key or path). Equivalent to [`XX` | `NX`] in the module API. Command Response - If the value is successfully set, returns `"OK"`. If `value` isn't set because of `conditionalChange`, returns `null`. |
| `options.conditionalChange`? | [`ConditionalChange`](../../../Commands/enumerations/ConditionalChange.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### strappend()

> `static` **strappend**(`transaction`, `key`, `value`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Appends the specified `value` to the string stored at the specified `path` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `value` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The value to append to the string. Must be wrapped with single quotes. For example, to append "foo", pass '"foo"'. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The path within the JSON document, defaults to root (`"."`) if not provided. Command Response - - For JSONPath (path starts with `$`): - Returns a list of integer replies for every possible path, indicating the length of the resulting string after appending `value`, or None for JSON values matching the path that are not string. - If `key` doesn't exist, an error is raised. - For legacy path (path doesn't start with `$`): - Returns the length of the resulting string after appending `value` to the string at `path`. - If multiple paths match, the length of the last updated string is returned. - If the JSON value at `path` is not a string of if `path` doesn't exist, an error is raised. - If `key` doesn't exist, an error is raised. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### strlen()

> `static` **strlen**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Returns the length of the JSON string value stored at the specified `path` within
the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The path within the JSON document, Defaults to root (`"."`) if not provided. Command Response - - For JSONPath (path starts with `$`): - Returns a list of integer replies for every possible path, indicating the length of the JSON string value, or <code>null</code> for JSON values matching the path that are not string. - For legacy path (path doesn't start with `$`): - Returns the length of the JSON value at `path` or `null` if `key` doesn't exist. - If multiple paths match, the length of the first matched string is returned. - If the JSON value at`path` is not a string or if `path` doesn't exist, an error is raised. - If `key` doesn't exist, `null` is returned. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### toggle()

> `static` **toggle**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Toggles a Boolean value stored at the specified `path` within the JSON document stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: The path within the JSON document. Defaults to the root (`"."`) if not specified. Command Response - For JSONPath (`path` starts with `$`), returns a list of boolean replies for every possible path, with the toggled boolean value, or `null` for JSON values matching the path that are not boolean. - For legacy path (`path` doesn't starts with `$`), returns the value of the toggled boolean in `path`. - Note that when sending legacy path syntax, If `path` doesn't exist or the value at `path` isn't a boolean, an error is raised. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

***

### type()

> `static` **type**(`transaction`, `key`, `options`?): [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)

Reports the type of values at the given path.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `transaction` | [`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md) | A transaction to add commands to. |
| `key` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | The key of the JSON document. |
| `options`? | \{ `path`: [`GlideString`](../../../BaseClient/type-aliases/GlideString.md); \} | (Optional) Additional parameters: - (Optional) `path`: Defaults to root (`"."`) if not provided. Command Response - - For JSONPath (path starts with `$`): - Returns an array of strings that represents the type of value at each path. The type is one of "null", "boolean", "string", "number", "integer", "object" and "array". - If a path does not exist, its corresponding return value is `null`. - Empty array if the document key does not exist. - For legacy path (path doesn't start with `$`): - String that represents the type of the value. - `null` if the document key does not exist. - `null` if the JSON path is invalid or does not exist. |
| `options.path`? | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

[`Transaction`](../../../Transaction/classes/Transaction.md) \| [`ClusterTransaction`](../../../Transaction/classes/ClusterTransaction.md)
