[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [BaseClient](../README.md) / BaseClient

# Class: BaseClient

## Extended by

- [`GlideClient`](../../GlideClient/classes/GlideClient.md)
- [`GlideClusterClient`](../../GlideClusterClient/classes/GlideClusterClient.md)

## Constructors

### new BaseClient()

> `protected` **new BaseClient**(`socket`, `options`?): [`BaseClient`](BaseClient.md)

**`Internal`**

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `socket` | `Socket` |
| `options`? | [`BaseClientConfiguration`](../interfaces/BaseClientConfiguration.md) |

#### Returns

[`BaseClient`](BaseClient.md)

## Properties

| Property | Modifier | Type | Default value |
| ------ | ------ | ------ | ------ |
| <a id="defaultdecoder"></a> `defaultDecoder` | `protected` | [`Decoder`](../enumerations/Decoder.md) | `Decoder.String` |
| <a id="isclosed"></a> `isClosed` | `protected` | `boolean` | `false` |
| <a id="promisecallbackfunctions"></a> `promiseCallbackFunctions` | `readonly` | \[`PromiseFunction`, `ErrorFunction`, `undefined` \| [`Decoder`](../enumerations/Decoder.md)\][] \| \[`PromiseFunction`, `ErrorFunction`\][] | `[]` |

## Methods

### append()

> **append**(`key`, `value`): `Promise`\<`number`\>

Appends a `value` to a `key`. If `key` does not exist it is created and set as an empty string,
so `APPEND` will be similar to [set](BaseClient.md#set) in this special case.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the string. |
| `value` | [`GlideString`](../type-aliases/GlideString.md) | The key of the string. |

#### Returns

`Promise`\<`number`\>

The length of the string after appending the value.

#### See

[https://valkey.io/commands/append/\|valkey.io](https://valkey.io/commands/append/|valkey.io) for more details.

#### Example

```typescript
const len = await client.append("key", "Hello");
console.log(len);
    // Output: 5 - Indicates that "Hello" has been appended to the value of "key", which was initially
    // empty, resulting in a new value of "Hello" with a length of 5 - similar to the set operation.
len = await client.append("key", " world");
console.log(result);
    // Output: 11 - Indicates that " world" has been appended to the value of "key", resulting in a
    // new value of "Hello world" with a length of 11.
```

***

### bitcount()

> **bitcount**(`key`, `options`?): `Promise`\<`number`\>

Counts the number of set bits (population counting) in the string stored at `key`. The `options` argument can
optionally be provided to count the number of bits in a specific string interval.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key for the string to count the set bits of. |
| `options`? | [`BitOffsetOptions`](../../Commands/interfaces/BitOffsetOptions.md) | The offset options - see [BitOffsetOptions](../../Commands/interfaces/BitOffsetOptions.md). |

#### Returns

`Promise`\<`number`\>

If `options` is provided, returns the number of set bits in the string interval specified by `options`.
    If `options` is not provided, returns the number of set bits in the string stored at `key`.
    Otherwise, if `key` is missing, returns `0` as it is treated as an empty string.

#### See

[https://valkey.io/commands/bitcount/\|valkey.io](https://valkey.io/commands/bitcount/|valkey.io) for more details.

#### Example

```typescript
console.log(await client.bitcount("my_key1")); // Output: 2 - The string stored at "my_key1" contains 2 set bits.
console.log(await client.bitcount("my_key2", { start: 1 })); // Output: 8 - From the second to to the last bytes of the string stored at "my_key2" are contain 8 set bits.
console.log(await client.bitcount("my_key2", { start: 1, end: 3 })); // Output: 2 - The second to fourth bytes of the string stored at "my_key2" contain 2 set bits.
console.log(await client.bitcount("my_key3", { start: 1, end: 1, indexType: BitmapIndexType.BIT })); // Output: 1 - Indicates that the second bit of the string stored at "my_key3" is set.
console.log(await client.bitcount("my_key3", { start: -1, end: -1, indexType: BitmapIndexType.BIT })); // Output: 1 - Indicates that the last bit of the string stored at "my_key3" is set.
```

***

### bitfield()

> **bitfield**(`key`, `subcommands`): `Promise`\<(`null` \| `number`)[]\>

Reads or modifies the array of bits representing the string that is held at `key` based on the specified
`subcommands`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the string. |
| `subcommands` | [`BitFieldSubCommands`](../../Commands/interfaces/BitFieldSubCommands.md)[] | The subcommands to be performed on the binary value of the string at `key`, which could be any of the following: - [BitFieldGet](../../Commands/classes/BitFieldGet.md) - [BitFieldSet](../../Commands/classes/BitFieldSet.md) - [BitFieldIncrBy](../../Commands/classes/BitFieldIncrBy.md) - [BitFieldOverflow](../../Commands/classes/BitFieldOverflow.md) |

#### Returns

`Promise`\<(`null` \| `number`)[]\>

An array of results from the executed subcommands:

- [BitFieldGet](../../Commands/classes/BitFieldGet.md) returns the value in [BitOffset](../../Commands/classes/BitOffset.md) or [BitOffsetMultiplier](../../Commands/classes/BitOffsetMultiplier.md).
- [BitFieldSet](../../Commands/classes/BitFieldSet.md) returns the old value in [BitOffset](../../Commands/classes/BitOffset.md) or [BitOffsetMultiplier](../../Commands/classes/BitOffsetMultiplier.md).
- [BitFieldIncrBy](../../Commands/classes/BitFieldIncrBy.md) returns the new value in [BitOffset](../../Commands/classes/BitOffset.md) or [BitOffsetMultiplier](../../Commands/classes/BitOffsetMultiplier.md).
- [BitFieldOverflow](../../Commands/classes/BitFieldOverflow.md) determines the behavior of the [BitFieldSet](../../Commands/classes/BitFieldSet.md) and [BitFieldIncrBy](../../Commands/classes/BitFieldIncrBy.md)
  subcommands when an overflow or underflow occurs. [BitFieldOverflow](../../Commands/classes/BitFieldOverflow.md) does not return a value and
  does not contribute a value to the array response.

#### See

[https://valkey.io/commands/bitfield/\|valkey.io](https://valkey.io/commands/bitfield/|valkey.io) for more details.

#### Example

```typescript
await client.set("key", "A");  // "A" has binary value 01000001
const result = await client.bitfield("key", [new BitFieldSet(new UnsignedEncoding(2), new BitOffset(1), 3), new BitFieldGet(new UnsignedEncoding(2), new BitOffset(1))]);
console.log(result); // Output: [2, 3] - The old value at offset 1 with an unsigned encoding of 2 was 2. The new value at offset 1 with an unsigned encoding of 2 is 3.
```

***

### bitfieldReadOnly()

> **bitfieldReadOnly**(`key`, `subcommands`): `Promise`\<`number`[]\>

Reads the array of bits representing the string that is held at `key` based on the specified `subcommands`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the string. |
| `subcommands` | [`BitFieldGet`](../../Commands/classes/BitFieldGet.md)[] | The [BitFieldGet](../../Commands/classes/BitFieldGet.md) subcommands to be performed. |

#### Returns

`Promise`\<`number`[]\>

An array of results from the [BitFieldGet](../../Commands/classes/BitFieldGet.md) subcommands.

#### See

[https://valkey.io/commands/bitfield\_ro/\|valkey.io](https://valkey.io/commands/bitfield_ro/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.0.0.

#### Example

```typescript
await client.set("key", "A");  // "A" has binary value 01000001
const result = await client.bitfieldReadOnly("key", [new BitFieldGet(new UnsignedEncoding(2), new BitOffset(1))]);
console.log(result); // Output: [2] - The value at offset 1 with an unsigned encoding of 2 is 2.
```

***

### bitop()

> **bitop**(`operation`, `destination`, `keys`): `Promise`\<`number`\>

Perform a bitwise operation between multiple keys (containing string values) and store the result in the
`destination`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `operation` | [`BitwiseOperation`](../../Commands/enumerations/BitwiseOperation.md) | The bitwise operation to perform. |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key that will store the resulting string. |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The list of keys to perform the bitwise operation on. |

#### Returns

`Promise`\<`number`\>

The size of the string stored in `destination`.

#### See

[https://valkey.io/commands/bitop/\|valkey.io](https://valkey.io/commands/bitop/|valkey.io) for more details.

#### Remarks

When in cluster mode, `destination` and all `keys` must map to the same hash slot.

#### Example

```typescript
await client.set("key1", "A"); // "A" has binary value 01000001
await client.set("key2", "B"); // "B" has binary value 01000010
const result1 = await client.bitop(BitwiseOperation.AND, "destination", ["key1", "key2"]);
console.log(result1); // Output: 1 - The size of the resulting string stored in "destination" is 1.

const result2 = await client.get("destination");
console.log(result2); // Output: "@" - "@" has binary value 01000000
```

***

### bitpos()

> **bitpos**(`key`, `bit`, `options`?): `Promise`\<`number`\>

Returns the position of the first bit matching the given `bit` value. The optional starting offset
`start` is a zero-based index, with `0` being the first byte of the list, `1` being the next byte and so on.
The offset can also be a negative number indicating an offset starting at the end of the list, with `-1` being
the last byte of the list, `-2` being the penultimate, and so on.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the string. |
| `bit` | `number` | The bit value to match. Must be `0` or `1`. |
| `options`? | [`BitOffsetOptions`](../../Commands/interfaces/BitOffsetOptions.md) | (Optional) The [BitOffsetOptions](../../Commands/interfaces/BitOffsetOptions.md). |

#### Returns

`Promise`\<`number`\>

The position of the first occurrence of `bit` in the binary value of the string held at `key`.
     If `start` was provided, the search begins at the offset indicated by `start`.

#### See

[https://valkey.io/commands/bitpos/\|valkey.io](https://valkey.io/commands/bitpos/|valkey.io) for details.

#### Example

```typescript
await client.set("key1", "A1");  // "A1" has binary value 01000001 00110001
const result1 = await client.bitpos("key1", 1);
console.log(result1); // Output: 1 - The first occurrence of bit value 1 in the string stored at "key1" is at the second position.

const result2 = await client.bitpos("key1", 1, { start: -1 });
console.log(result2); // Output: 10 - The first occurrence of bit value 1, starting at the last byte in the string stored at "key1", is at the eleventh position.

await client.set("key1", "A12");  // "A12" has binary value 01000001 00110001 00110010
const result3 = await client.bitpos("key1", 1, { start: 1, end: -1 });
console.log(result3); // Output: 10 - The first occurrence of bit value 1 in the second byte to the last byte of the string stored at "key1" is at the eleventh position.

const result4 = await client.bitpos("key1", 1, { start: 2, end: 9, indexType: BitmapIndexType.BIT });
console.log(result4); // Output: 7 - The first occurrence of bit value 1 in the third to tenth bits of the string stored at "key1" is at the eighth position.
```

***

### blmove()

> **blmove**(`source`, `destination`, `whereFrom`, `whereTo`, `timeout`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Blocks the connection until it pops atomically and removes the left/right-most element to the
list stored at `source` depending on `whereFrom`, and pushes the element at the first/last element
of the list stored at `destination` depending on `whereTo`.
`BLMOVE` is the blocking variant of [lmove](BaseClient.md#lmove).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `source` | [`GlideString`](../type-aliases/GlideString.md) | The key to the source list. |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key to the destination list. |
| `whereFrom` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The [ListDirection](../../Commands/enumerations/ListDirection.md) to remove the element from. |
| `whereTo` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The [ListDirection](../../Commands/enumerations/ListDirection.md) to add the element to. |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

The popped element, or `null` if `source` does not exist or if the operation timed-out.

#### See

[https://valkey.io/commands/blmove/\|valkey.io](https://valkey.io/commands/blmove/|valkey.io) for details.

#### Remarks

When in cluster mode, both `source` and `destination` must map to the same hash slot.

#### Example

```typescript
await client.lpush("testKey1", ["two", "one"]);
await client.lpush("testKey2", ["four", "three"]);
const result = await client.blmove("testKey1", "testKey2", ListDirection.LEFT, ListDirection.LEFT, 0.1);
console.log(result); // Output: "one"

const result2 = await client.lrange("testKey1", 0, -1);
console.log(result2);   // Output: "two"

const updated_array2 = await client.lrange("testKey2", 0, -1);
console.log(updated_array2); // Output: ["one", "three", "four"]
```

***

### blmpop()

> **blmpop**(`keys`, `direction`, `timeout`, `options`?): `Promise`\<`null` \| \{ `elements`: [`GlideString`](../type-aliases/GlideString.md)[]; `key`: [`GlideString`](../type-aliases/GlideString.md); \}\>

Blocks the connection until it pops one or more elements from the first non-empty list from the
provided `key`. `BLMPOP` is the blocking variant of [lmpop](BaseClient.md#lmpop).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | An array of keys. |
| `direction` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The direction based on which elements are popped from - see [ListDirection](../../Commands/enumerations/ListDirection.md). |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `count`: the maximum number of popped elements. If not specified, pops one member. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| \{ `elements`: [`GlideString`](../type-aliases/GlideString.md)[]; `key`: [`GlideString`](../type-aliases/GlideString.md); \}\>

A `Record` which stores the key name where elements were popped out and the array of popped elements.
    If no member could be popped and the timeout expired, returns `null`.

#### See

[https://valkey.io/commands/blmpop/\|valkey.io](https://valkey.io/commands/blmpop/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
await client.lpush("testKey", ["one", "two", "three"]);
await client.lpush("testKey2", ["five", "six", "seven"]);
const result = await client.blmpop(["testKey", "testKey2"], ListDirection.LEFT, 0.1, 1);
console.log(result"testKey"); // Output: { key: "testKey", elements: ["three"] }
```

***

### blpop()

> **blpop**(`keys`, `timeout`, `options`?): `Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)\]\>

Blocking list pop primitive.
Pop an element from the head of the first list that is non-empty,
with the given `keys` being checked in the order that they are given.
Blocks the connection when there are no elements to pop from any of the given lists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The `keys` of the lists to pop from. |
| `timeout` | `number` | The `timeout` in seconds. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)\]\>

- An `array` containing the `key` from which the element was popped and the value of the popped element,
formatted as [key, value]. If no element could be popped and the timeout expired, returns `null`.

#### See

[https://valkey.io/commands/blpop/\|valkey.io](https://valkey.io/commands/blpop/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
const result = await client.blpop(["list1", "list2"], 5);
console.log(result); // Output: ['list1', 'element']
```

***

### brpop()

> **brpop**(`keys`, `timeout`, `options`?): `Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)\]\>

Blocking list pop primitive.
Pop an element from the tail of the first list that is non-empty,
with the given `keys` being checked in the order that they are given.
Blocks the connection when there are no elements to pop from any of the given lists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The `keys` of the lists to pop from. |
| `timeout` | `number` | The `timeout` in seconds. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)\]\>

- An `array` containing the `key` from which the element was popped and the value of the popped element,
formatted as [key, value]. If no element could be popped and the timeout expired, returns `null`.

#### See

[https://valkey.io/commands/brpop/\|valkey.io](https://valkey.io/commands/brpop/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
// Example usage of brpop method to block and wait for elements from multiple lists
const result = await client.brpop(["list1", "list2"], 5);
console.log(result); // Output: ["list1", "element"] - Indicates an element "element" was popped from "list1".
```

***

### bzmpop()

> **bzmpop**(`keys`, `modifier`, `timeout`, `options`?): `Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\]\>

Pops a member-score pair from the first non-empty sorted set, with the given `keys` being
checked in the order they are provided. Blocks the connection when there are no members
to pop from any of the given sorted sets. `BZMPOP` is the blocking variant of [zmpop](BaseClient.md#zmpop).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `modifier` | [`ScoreFilter`](../../Commands/enumerations/ScoreFilter.md) | The element pop criteria - either [ScoreFilter.MIN](../../Commands/enumerations/ScoreFilter.md#min) or [ScoreFilter.MAX](../../Commands/enumerations/ScoreFilter.md#max) to pop the member with the lowest/highest score accordingly. |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of 0 will block indefinitely. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `count`: the maximum number of popped elements. If not specified, pops one member. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\]\>

A two-element `array` containing the key name of the set from which the element
    was popped, and a [SortedSetDataType](../type-aliases/SortedSetDataType.md) of the popped elements.
    If no member could be popped, returns `null`.

#### See

[https://valkey.io/commands/bzmpop/\|valkey.io](https://valkey.io/commands/bzmpop/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
await client.zadd("zSet1", { one: 1.0, two: 2.0, three: 3.0 });
await client.zadd("zSet2", { four: 4.0 });
console.log(await client.bzmpop(["zSet1", "zSet2"], ScoreFilter.MAX, 0.1, 2));
// Output:
// "three" with score 3 and "two" with score 2 were popped from "zSet1"
// [ "zSet1", [
//     { element: 'three', score: 3 },
//     { element: 'two', score: 2 }
// ] ]
```

***

### bzpopmax()

> **bzpopmax**(`keys`, `timeout`, `options`?): `Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md), `number`\]\>

Blocks the connection until it removes and returns a member with the highest score from the
first non-empty sorted set, with the given `key` being checked in the order they
are provided.
`BZPOPMAX` is the blocking variant of [zpopmax](BaseClient.md#zpopmax).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely. Since 6.0.0: timeout is interpreted as a double instead of an integer. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md), `number`\]\>

An `array` containing the key where the member was popped out, the member, itself, and the member score.
    If no member could be popped and the `timeout` expired, returns `null`.

#### See

[https://valkey.io/commands/zpopmax/\|valkey.io](https://valkey.io/commands/zpopmax/|valkey.io) for more details.

#### Remarks

When in cluster mode, `keys` must map to the same hash slot.

#### Example

```typescript
const data = await client.bzpopmax(["zset1", "zset2"], 0.5);
console.log(data); // Output: ["zset1", "c", 2];
```

***

### bzpopmin()

> **bzpopmin**(`keys`, `timeout`, `options`?): `Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md), `number`\]\>

Blocks the connection until it removes and returns a member with the lowest score from the
first non-empty sorted set, with the given `key` being checked in the order they
are provided.
`BZPOPMIN` is the blocking variant of [zpopmin](BaseClient.md#zpopmin).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely. Since 6.0.0: timeout is interpreted as a double instead of an integer. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md), `number`\]\>

An `array` containing the key where the member was popped out, the member, itself, and the member score.
    If no member could be popped and the `timeout` expired, returns `null`.

#### See

[https://valkey.io/commands/bzpopmin/\|valkey.io](https://valkey.io/commands/bzpopmin/|valkey.io) for more details.

#### Remarks

When in cluster mode, `keys` must map to the same hash slot.

#### Example

```typescript
const data = await client.bzpopmin(["zset1", "zset2"], 0.5);
console.log(data); // Output: ["zset1", "a", 2];
```

***

### cancelPubSubFuturesWithExceptionSafe()

> **cancelPubSubFuturesWithExceptionSafe**(`exception`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `exception` | [`ConnectionError`](../../Errors/classes/ConnectionError.md) |

#### Returns

`void`

***

### close()

> **close**(`errorMessage`?): `void`

Terminate the client by closing all associated resources, including the socket and any active promises.
 All open promises will be closed with an exception.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `errorMessage`? | `string` | If defined, this error message will be passed along with the exceptions when closing all open promises. |

#### Returns

`void`

***

### completePubSubFuturesSafe()

> **completePubSubFuturesSafe**(): `void`

#### Returns

`void`

***

### configureAdvancedConfigurationBase()

> `protected` **configureAdvancedConfigurationBase**(`options`, `request`): `void`

**`Internal`**

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`AdvancedBaseClientConfiguration`](../interfaces/AdvancedBaseClientConfiguration.md) |
| `request` | `IConnectionRequest` |

#### Returns

`void`

***

### configurePubsub()

> `protected` **configurePubsub**(`options`, `configuration`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`GlideClientConfiguration`](../../GlideClient/type-aliases/GlideClientConfiguration.md) \| [`GlideClusterClientConfiguration`](../../GlideClusterClient/type-aliases/GlideClusterClientConfiguration.md) |
| `configuration` | `IConnectionRequest` |

#### Returns

`void`

***

### connectToServer()

> `protected` **connectToServer**(`options`): `Promise`\<`void`\>

**`Internal`**

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`BaseClientConfiguration`](../interfaces/BaseClientConfiguration.md) |

#### Returns

`Promise`\<`void`\>

***

### createClientRequest()

> `protected` **createClientRequest**(`options`): `IConnectionRequest`

**`Internal`**

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`BaseClientConfiguration`](../interfaces/BaseClientConfiguration.md) |

#### Returns

`IConnectionRequest`

***

### createScriptInvocationPromise()

> `protected` **createScriptInvocationPromise**\<`T`\>(`command`, `options`): `Promise`\<`T`\>

#### Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | [`GlideString`](../type-aliases/GlideString.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `command` | `ScriptInvocation` |
| `options` | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) |

#### Returns

`Promise`\<`T`\>

***

### createUpdateConnectionPasswordPromise()

> `protected` **createUpdateConnectionPasswordPromise**(`command`): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `command` | `UpdateConnectionPassword` |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)\>

***

### createWritePromise()

> `protected` **createWritePromise**\<`T`\>(`command`, `options`): `Promise`\<`T`\>

**`Internal`**

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `command` | `Command` \| `Command`[] |
| `options` | [`WritePromiseOptions`](../type-aliases/WritePromiseOptions.md) |

#### Returns

`Promise`\<`T`\>

***

### decr()

> **decr**(`key`): `Promise`\<`number`\>

Decrements the number stored at `key` by one. If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to decrement its value. |

#### Returns

`Promise`\<`number`\>

the value of `key` after the decrement.

#### See

[https://valkey.io/commands/decr/\|valkey.io](https://valkey.io/commands/decr/|valkey.io) for details.

#### Example

```typescript
// Example usage of decr method to decrement the value of a key by 1
await client.set("my_counter", "10");
const result = await client.decr("my_counter");
console.log(result); // Output: 9
```

***

### decrBy()

> **decrBy**(`key`, `amount`): `Promise`\<`number`\>

Decrements the number stored at `key` by `amount`. If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to decrement its value. |
| `amount` | `number` | The amount to decrement. |

#### Returns

`Promise`\<`number`\>

the value of `key` after the decrement.

#### See

[https://valkey.io/commands/decrby/\|valkey.io](https://valkey.io/commands/decrby/|valkey.io) for details.

#### Example

```typescript
// Example usage of decrby method to decrement the value of a key by a specified amount
await client.set("my_counter", "10");
const result = await client.decrby("my_counter", 5);
console.log(result); // Output: 5
```

***

### del()

> **del**(`keys`): `Promise`\<`number`\>

Removes the specified keys. A key is ignored if it does not exist.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys we wanted to remove. |

#### Returns

`Promise`\<`number`\>

The number of keys that were removed.

#### See

[https://valkey.io/commands/del/\|valkey.io](https://valkey.io/commands/del/|valkey.io) for details.

#### Remarks

In cluster mode, if keys in `keys` map to different hash slots,
the command will be split across these slots and executed separately for each.
This means the command is atomic only at the slot level. If one or more slot-specific
requests fail, the entire call will return the first encountered error, even
though some requests may have succeeded while others did not.
If this behavior impacts your application logic, consider splitting the
request into sub-requests per slot to ensure atomicity.

#### Examples

```typescript
// Example usage of del method to delete an existing key
await client.set("my_key", "my_value");
const result = await client.del(["my_key"]);
console.log(result); // Output: 1
```

```typescript
// Example usage of del method for a non-existing key
const result = await client.del(["non_existing_key"]);
console.log(result); // Output: 0
```

***

### dump()

> **dump**(`key`): `Promise`\<`null` \| `Buffer`\>

Serialize the value stored at `key` in a Valkey-specific format and return it to the user.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The `key` to serialize. |

#### Returns

`Promise`\<`null` \| `Buffer`\>

The serialized value of the data stored at `key`. If `key` does not exist, `null` will be returned.

#### See

[https://valkey.io/commands/dump/\|valkey.io](https://valkey.io/commands/dump/|valkey.io) for details.

#### Examples

```typescript
let result = await client.dump("myKey");
console.log(result); // Output: the serialized value of "myKey"
```

```typescript
result = await client.dump("nonExistingKey");
console.log(result); // Output: `null`
```

***

### ensureClientIsOpen()

> `protected` **ensureClientIsOpen**(): `void`

#### Returns

`void`

***

### exists()

> **exists**(`keys`): `Promise`\<`number`\>

Returns the number of keys in `keys` that exist in the database.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys list to check. |

#### Returns

`Promise`\<`number`\>

The number of keys that exist. If the same existing key is mentioned in `keys` multiple times,
it will be counted multiple times.

#### Remarks

In cluster mode, if keys in `keys` map to different hash slots,
the command will be split across these slots and executed separately for each.
This means the command is atomic only at the slot level. If one or more slot-specific
requests fail, the entire call will return the first encountered error, even
though some requests may have succeeded while others did not.
If this behavior impacts your application logic, consider splitting the
request into sub-requests per slot to ensure atomicity.

#### See

[https://valkey.io/commands/exists/\|valkey.io](https://valkey.io/commands/exists/|valkey.io) for details.

#### Example

```typescript
// Example usage of the exists method
const result = await client.exists(["key1", "key2", "key3"]);
console.log(result); // Output: 3 - Indicates that all three keys exist in the database.
```

***

### expire()

> **expire**(`key`, `seconds`, `options`?): `Promise`\<`boolean`\>

Sets a timeout on `key` in seconds. After the timeout has expired, the key will automatically be deleted.
If `key` already has an existing expire set, the time to live is updated to the new value.
If `seconds` is non-positive number, the key will be deleted rather than expired.
The timeout will only be cleared by commands that delete or overwrite the contents of `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to set timeout on it. |
| `seconds` | `number` | The timeout in seconds. |
| `options`? | \{ `expireOption`: [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md); \} | (Optional) Additional parameters: - (Optional) `expireOption`: the expire option - see [ExpireOptions](../../Commands/enumerations/ExpireOptions.md). |
| `options.expireOption`? | [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md) | - |

#### Returns

`Promise`\<`boolean`\>

`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
or operation skipped due to the provided arguments.

#### See

[https://valkey.io/commands/expire/\|valkey.io](https://valkey.io/commands/expire/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the expire method
const result = await client.expire("my_key", 60);
console.log(result); // Output: true - Indicates that a timeout of 60 seconds has been set for "my_key".
```

```typescript
// Example usage of the expire method with exisiting expiry
const result = await client.expire("my_key", 60, { expireOption: ExpireOptions.HasNoExpiry });
console.log(result); // Output: false - Indicates that "my_key" has an existing expiry.
```

***

### expireAt()

> **expireAt**(`key`, `unixSeconds`, `options`?): `Promise`\<`boolean`\>

Sets a timeout on `key`. It takes an absolute Unix timestamp (seconds since January 1, 1970) instead of specifying the number of seconds.
A timestamp in the past will delete the key immediately. After the timeout has expired, the key will automatically be deleted.
If `key` already has an existing expire set, the time to live is updated to the new value.
The timeout will only be cleared by commands that delete or overwrite the contents of `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to set timeout on it. |
| `unixSeconds` | `number` | The timeout in an absolute Unix timestamp. |
| `options`? | \{ `expireOption`: [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md); \} | (Optional) Additional parameters: - (Optional) `expireOption`: the expire option - see [ExpireOptions](../../Commands/enumerations/ExpireOptions.md). |
| `options.expireOption`? | [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md) | - |

#### Returns

`Promise`\<`boolean`\>

`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
or operation skipped due to the provided arguments.

#### See

[https://valkey.io/commands/expireat/\|valkey.io](https://valkey.io/commands/expireat/|valkey.io) for details.

#### Example

```typescript
// Example usage of the expireAt method on a key with no previous expiry
const result = await client.expireAt("my_key", 1672531200, { expireOption: ExpireOptions.HasNoExpiry });
console.log(result); // Output: true - Indicates that the expiration time for "my_key" was successfully set.
```

***

### expiretime()

> **expiretime**(`key`): `Promise`\<`number`\>

Returns the absolute Unix timestamp (since January 1, 1970) at which the given `key` will expire, in seconds.
To get the expiration with millisecond precision, use [pexpiretime](BaseClient.md#pexpiretime).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The `key` to determine the expiration value of. |

#### Returns

`Promise`\<`number`\>

The expiration Unix timestamp in seconds, `-2` if `key` does not exist or `-1` if `key` exists but has no associated expire.

#### See

[https://valkey.io/commands/expiretime/\|valkey.io](https://valkey.io/commands/expiretime/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

#### Example

```typescript
const result1 = await client.expiretime("myKey");
console.log(result1); // Output: -2 - myKey doesn't exist.

const result2 = await client.set(myKey, "value");
const result3 = await client.expireTime(myKey);
console.log(result2); // Output: -1 - myKey has no associated expiration.

client.expire(myKey, 60);
const result3 = await client.expireTime(myKey);
console.log(result3); // Output: 123456 - the Unix timestamp (in seconds) when "myKey" will expire.
```

***

### fcall()

> **fcall**(`func`, `keys`, `args`, `options`?): `Promise`\<[`GlideReturnType`](../type-aliases/GlideReturnType.md)\>

Invokes a previously loaded function.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `func` | [`GlideString`](../type-aliases/GlideString.md) | The function name. |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of `keys` accessed by the function. To ensure the correct execution of functions, all names of keys that a function accesses must be explicitly provided as `keys`. |
| `args` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of `function` arguments and it should not represent names of keys. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideReturnType`](../type-aliases/GlideReturnType.md)\>

The invoked function's return value.

#### See

[https://valkey.io/commands/fcall/\|valkey.io](https://valkey.io/commands/fcall/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
const response = await client.fcall("Deep_Thought", [], []);
console.log(response); // Output: Returns the function's return value.
```

***

### fcallReadonly()

> **fcallReadonly**(`func`, `keys`, `args`, `options`?): `Promise`\<[`GlideReturnType`](../type-aliases/GlideReturnType.md)\>

Invokes a previously loaded read-only function.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `func` | [`GlideString`](../type-aliases/GlideString.md) | The function name. |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of `keys` accessed by the function. To ensure the correct execution of functions, all names of keys that a function accesses must be explicitly provided as `keys`. |
| `args` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of `function` arguments and it should not represent names of keys. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideReturnType`](../type-aliases/GlideReturnType.md)\>

The invoked function's return value.

#### See

[https://valkey.io/commands/fcall/\|valkey.io](https://valkey.io/commands/fcall/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
const response = await client.fcallReadOnly("Deep_Thought", ["key1"], ["Answer", "to", "the",
           "Ultimate", "Question", "of", "Life,", "the", "Universe,", "and", "Everything"]);
console.log(response); // Output: 42 # The return value on the function that was executed.
```

***

### geoadd()

> **geoadd**(`key`, `membersToGeospatialData`, `options`?): `Promise`\<`number`\>

Adds geospatial members with their positions to the specified sorted set stored at `key`.
If a member is already a part of the sorted set, its position is updated.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `membersToGeospatialData` | `Map`\<[`GlideString`](../type-aliases/GlideString.md), [`GeospatialData`](../../Commands/interfaces/GeospatialData.md)\> | A mapping of member names to their corresponding positions - see [GeospatialData](../../Commands/interfaces/GeospatialData.md). The command will report an error when the user attempts to index coordinates outside the specified ranges. |
| `options`? | [`GeoAddOptions`](../../Commands/interfaces/GeoAddOptions.md) | The GeoAdd options - see [GeoAddOptions](../../Commands/interfaces/GeoAddOptions.md). |

#### Returns

`Promise`\<`number`\>

The number of elements added to the sorted set. If `changed` is set to
   `true` in the options, returns the number of elements updated in the sorted set.

#### See

[https://valkey.io/commands/geoadd/\|valkey.io](https://valkey.io/commands/geoadd/|valkey.io) for more details.

#### Example

```typescript
const options = {updateMode: ConditionalChange.ONLY_IF_EXISTS, changed: true};
const membersToCoordinates = new Map<string, GeospatialData>([
     ["Palermo", { longitude: 13.361389, latitude: 38.115556 }],
]);
const num = await client.geoadd("mySortedSet", membersToCoordinates, options);
console.log(num); // Output: 1 - Indicates that the position of an existing member in the sorted set "mySortedSet" has been updated.
```

***

### geodist()

> **geodist**(`key`, `member1`, `member2`, `options`?): `Promise`\<`null` \| `number`\>

Returns the distance between `member1` and `member2` saved in the geospatial index stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `member1` | [`GlideString`](../type-aliases/GlideString.md) | The name of the first member. |
| `member2` | [`GlideString`](../type-aliases/GlideString.md) | The name of the second member. |
| `options`? | \{ `unit`: [`GeoUnit`](../../Commands/enumerations/GeoUnit.md); \} | (Optional) Additional parameters: - (Optional) `unit`: the unit of distance measurement - see [GeoUnit](../../Commands/enumerations/GeoUnit.md). If not specified, the [GeoUnit.METERS](../../Commands/enumerations/GeoUnit.md#meters) is used as a default unit. |
| `options.unit`? | [`GeoUnit`](../../Commands/enumerations/GeoUnit.md) | - |

#### Returns

`Promise`\<`null` \| `number`\>

The distance between `member1` and `member2`. Returns `null`, if one or both members do not exist,
    or if the key does not exist.

#### See

[https://valkey.io/commands/geodist/\|valkey.io](https://valkey.io/commands/geodist/|valkey.io) for more details.

#### Example

```typescript
const result = await client.geodist("mySortedSet", "Place1", "Place2", { unit: GeoUnit.KILOMETERS });
console.log(num); // Output: the distance between Place1 and Place2.
```

***

### geohash()

> **geohash**(`key`, `members`): `Promise`\<(`null` \| `string`)[]\>

Returns the `GeoHash` strings representing the positions of all the specified `members` in the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `members` | [`GlideString`](../type-aliases/GlideString.md)[] | The array of members whose `GeoHash` strings are to be retrieved. |

#### Returns

`Promise`\<(`null` \| `string`)[]\>

An array of `GeoHash` strings representing the positions of the specified members stored at `key`.
    If a member does not exist in the sorted set, a `null` value is returned for that member.

#### See

[https://valkey.io/commands/geohash/\|valkey.io](https://valkey.io/commands/geohash/|valkey.io) for more details.

#### Example

```typescript
const result = await client.geohash("mySortedSet", ["Palermo", "Catania", "NonExisting"]);
console.log(result); // Output: ["sqc8b49rny0", "sqdtr74hyu0", null]
```

***

### geopos()

> **geopos**(`key`, `members`): `Promise`\<(`null` \| \[`number`, `number`\])[]\>

Returns the positions (longitude, latitude) of all the specified `members` of the
geospatial index represented by the sorted set at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `members` | [`GlideString`](../type-aliases/GlideString.md)[] | The members for which to get the positions. |

#### Returns

`Promise`\<(`null` \| \[`number`, `number`\])[]\>

A 2D `Array` which represents positions (longitude and latitude) corresponding to the
    given members. The order of the returned positions matches the order of the input members.
    If a member does not exist, its position will be `null`.

#### See

[https://valkey.io/commands/geopos/\|valkey.io](https://valkey.io/commands/geopos/|valkey.io) for more details.

#### Example

```typescript
const data = new Map([["Palermo", { longitude: 13.361389, latitude: 38.115556 }], ["Catania", { longitude: 15.087269, latitude: 37.502669 }]]);
await client.geoadd("mySortedSet", data);
const result = await client.geopos("mySortedSet", ["Palermo", "Catania", "NonExisting"]);
// When added via GEOADD, the geospatial coordinates are converted into a 52 bit geohash, so the coordinates
// returned might not be exactly the same as the input values
console.log(result); // Output:
// [
//     [13.36138933897018433, 38.11555639549629859],
//     [15.08726745843887329, 37.50266842333162032],
//     null
// ]
```

***

### geosearch()

> **geosearch**(`key`, `searchFrom`, `searchBy`, `options`?): `Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), \[`number`?, `number`?, \[`number`, `number`\]?\]?\][]\>

Returns the members of a sorted set populated with geospatial information using [geoadd](BaseClient.md#geoadd),
which are within the borders of the area specified by a given shape.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `searchFrom` | [`SearchOrigin`](../../Commands/type-aliases/SearchOrigin.md) | The query's center point options, could be one of: - [MemberOrigin](../../Commands/interfaces/MemberOrigin.md) to use the position of the given existing member in the sorted set. - [CoordOrigin](../../Commands/interfaces/CoordOrigin.md) to use the given longitude and latitude coordinates. |
| `searchBy` | [`GeoSearchShape`](../../Commands/type-aliases/GeoSearchShape.md) | The query's shape options, could be one of: - [GeoCircleShape](../../Commands/interfaces/GeoCircleShape.md) to search inside circular area according to given radius. - [GeoBoxShape](../../Commands/interfaces/GeoBoxShape.md) to search inside an axis-aligned rectangle, determined by height and width. |
| `options`? | `GeoSearchCommonResultOptions` & `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Parameters to request additional information and configure sorting/limiting the results, see [GeoSearchResultOptions](../../Commands/type-aliases/GeoSearchResultOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), \[`number`?, `number`?, \[`number`, `number`\]?\]?\][]\>

By default, returns an `Array` of members (locations) names.
    If any of `withCoord`, `withDist` or `withHash` are set to `true` in [GeoSearchResultOptions](../../Commands/type-aliases/GeoSearchResultOptions.md), a 2D `Array` returned,
    where each sub-array represents a single item in the following order:
- The member (location) name.
- The distance from the center as a floating point `number`, in the same unit specified for `searchBy`, if `withDist` is set to `true`.
- The geohash of the location as a integer `number`, if `withHash` is set to `true`.
- The coordinates as a two item `array` of floating point `number`s, if `withCoord` is set to `true`.

#### See

[https://valkey.io/commands/geosearch/\|valkey.io](https://valkey.io/commands/geosearch/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
const data = new Map<GlideString, GeospatialData>([["Palermo", { longitude: 13.361389, latitude: 38.115556 }], ["Catania", { longitude: 15.087269, latitude: 37.502669 }]]);
await client.geoadd("mySortedSet", data);
// search for locations within 200 km circle around stored member named 'Palermo'
const result1 = await client.geosearch("mySortedSet", { member: "Palermo" }, { radius: 200, unit: GeoUnit.KILOMETERS });
console.log(result1); // Output: ['Palermo', 'Catania']

// search for locations in 200x300 mi rectangle centered at coordinate (15, 37), requesting additional info,
// limiting results by 2 best matches, ordered by ascending distance from the search area center
const result2 = await client.geosearch(
    "mySortedSet",
    { position: { longitude: 15, latitude: 37 } },
    { width: 200, height: 300, unit: GeoUnit.MILES },
    {
        sortOrder: SortOrder.ASC,
        count: 2,
        withCoord: true,
        withDist: true,
        withHash: true,
    },
);
console.log(result2); // Output:
// [
//     [
//         'Catania',                                       // location name
//         [
//             56.4413,                                     // distance
//             3479447370796909,                            // geohash of the location
//             [15.087267458438873, 37.50266842333162],     // coordinates of the location
//         ],
//     ],
//     [
//         'Palermo',
//         [
//             190.4424,
//             3479099956230698,
//             [13.361389338970184, 38.1155563954963],
//         ],
//     ],
// ]
```

***

### geosearchstore()

> **geosearchstore**(`destination`, `source`, `searchFrom`, `searchBy`, `options`?): `Promise`\<`number`\>

Searches for members in a sorted set stored at `source` representing geospatial data
within a circular or rectangular area and stores the result in `destination`.

If `destination` already exists, it is overwritten. Otherwise, a new sorted set will be created.

To get the result directly, see [geosearch](BaseClient.md#geosearch).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key of the destination sorted set. |
| `source` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `searchFrom` | [`SearchOrigin`](../../Commands/type-aliases/SearchOrigin.md) | The query's center point options, could be one of: - [MemberOrigin](../../Commands/interfaces/MemberOrigin.md) to use the position of the given existing member in the sorted set. - [CoordOrigin](../../Commands/interfaces/CoordOrigin.md) to use the given longitude and latitude coordinates. |
| `searchBy` | [`GeoSearchShape`](../../Commands/type-aliases/GeoSearchShape.md) | The query's shape options, could be one of: - [GeoCircleShape](../../Commands/interfaces/GeoCircleShape.md) to search inside circular area according to given radius. - [GeoBoxShape](../../Commands/interfaces/GeoBoxShape.md) to search inside an axis-aligned rectangle, determined by height and width. |
| `options`? | [`GeoSearchStoreResultOptions`](../../Commands/type-aliases/GeoSearchStoreResultOptions.md) | (Optional) Parameters to request additional information and configure sorting/limiting the results, see [GeoSearchStoreResultOptions](../../Commands/type-aliases/GeoSearchStoreResultOptions.md). |

#### Returns

`Promise`\<`number`\>

The number of elements in the resulting sorted set stored at `destination`.

#### See

[https://valkey.io/commands/geosearchstore/\|valkey.io](https://valkey.io/commands/geosearchstore/|valkey.io) for more details.

#### Remarks

When in cluster mode, `destination` and `source` must map to the same hash slot.

#### Example

```typescript
const data = new Map([["Palermo", { longitude: 13.361389, latitude: 38.115556 }], ["Catania", { longitude: 15.087269, latitude: 37.502669 }]]);
await client.geoadd("mySortedSet", data);
// search for locations within 200 km circle around stored member named 'Palermo' and store in `destination`:
await client.geosearchstore("destination", "mySortedSet", { member: "Palermo" }, { radius: 200, unit: GeoUnit.KILOMETERS });
// query the stored results
const result1 = await client.zrangeWithScores("destination", { start: 0, end: -1 });
console.log(result1); // Output:
// {
//     Palermo: 3479099956230698,   // geohash of the location is stored as element's score
//     Catania: 3479447370796909
// }

// search for locations in 200x300 mi rectangle centered at coordinate (15, 37), requesting to store distance instead of geohashes,
// limiting results by 2 best matches, ordered by ascending distance from the search area center
await client.geosearchstore(
    "destination",
    "mySortedSet",
    { position: { longitude: 15, latitude: 37 } },
    { width: 200, height: 300, unit: GeoUnit.MILES },
    {
        sortOrder: SortOrder.ASC,
        count: 2,
        storeDist: true,
    },
);
// query the stored results
const result2 = await client.zrangeWithScores("destination", { start: 0, end: -1 });
console.log(result2); // Output:
// {
//     Palermo: 190.4424,   // distance from the search area center is stored as element's score
//     Catania: 56.4413,    // the distance is measured in units used for the search query (miles)
// }
```

***

### get()

> **get**(`key`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Get the value associated with the given key, or null if no such value exists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to retrieve from the database. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

If `key` exists, returns the value of `key`. Otherwise, return null.

#### See

[https://valkey.io/commands/get/\|valkey.io](https://valkey.io/commands/get/|valkey.io) for details.

#### Example

```typescript
// Example usage of get method to retrieve the value of a key
const result = await client.get("key");
console.log(result); // Output: 'value'
// Example usage of get method to retrieve the value of a key with Bytes decoder
const result = await client.get("key", Decoder.Bytes);
console.log(result); // Output: {"data": [118, 97, 108, 117, 101], "type": "Buffer"}
```

***

### getbit()

> **getbit**(`key`, `offset`): `Promise`\<`number`\>

Returns the bit value at `offset` in the string value stored at `key`. `offset` must be greater than or equal
to zero.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the string. |
| `offset` | `number` | The index of the bit to return. |

#### Returns

`Promise`\<`number`\>

The bit at the given `offset` of the string. Returns `0` if the key is empty or if the `offset` exceeds
the length of the string.

#### See

[https://valkey.io/commands/getbit/\|valkey.io](https://valkey.io/commands/getbit/|valkey.io) for more details.

#### Example

```typescript
const result = await client.getbit("key", 1);
console.log(result); // Output: 1 - The second bit of the string stored at "key" is set to 1.
```

***

### getCallbackIndex()

> `protected` **getCallbackIndex**(): `number`

#### Returns

`number`

***

### getdel()

> **getdel**(`key`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Gets a string value associated with the given `key`and deletes the key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to retrieve from the database. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

If `key` exists, returns the `value` of `key`. Otherwise, return `null`.

#### See

[https://valkey.io/commands/getdel/\|valkey.io](https://valkey.io/commands/getdel/|valkey.io) for details.

#### Example

```typescript
const result = client.getdel("key");
console.log(result); // Output: 'value'

const value = client.getdel("key");  // value is null
```

***

### getex()

> **getex**(`key`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Get the value of `key` and optionally set its expiration. `GETEX` is similar to [get](BaseClient.md#get).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to retrieve from the database. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional Parameters: - (Optional) `expiry`: expiriation to the given key: `"persist"` will retain the time to live associated with the key. Equivalent to `PERSIST` in the VALKEY API. Otherwise, a [TimeUnit](../../Commands/enumerations/TimeUnit.md) and duration of the expire time should be specified. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

If `key` exists, returns the value of `key` as a `string`. Otherwise, return `null`.

#### See

[https://valkey.io/commands/getex/\|valkey.op](https://valkey.io/commands/getex/|valkey.op) for more details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
const result = await client.getex("key", {expiry: { type: TimeUnit.Seconds, count: 5 }});
console.log(result); // Output: 'value'
```

***

### getPubsubCallbackAndContext()

> **getPubsubCallbackAndContext**(`config`): \[`undefined` \| `null` \| (`msg`, `context`) => `void`, `any`\]

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`GlideClientConfiguration`](../../GlideClient/type-aliases/GlideClientConfiguration.md) \| [`GlideClusterClientConfiguration`](../../GlideClusterClient/type-aliases/GlideClusterClientConfiguration.md) |

#### Returns

\[`undefined` \| `null` \| (`msg`, `context`) => `void`, `any`\]

***

### getPubSubMessage()

> **getPubSubMessage**(): `Promise`\<[`PubSubMsg`](../interfaces/PubSubMsg.md)\>

#### Returns

`Promise`\<[`PubSubMsg`](../interfaces/PubSubMsg.md)\>

***

### getrange()

> **getrange**(`key`, `start`, `end`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Returns the substring of the string value stored at `key`, determined by the byte offsets
`start` and `end` (both are inclusive). Negative offsets can be used in order to provide
an offset starting from the end of the string. So `-1` means the last character, `-2` the
penultimate and so forth. If `key` does not exist, an empty string is returned. If `start`
or `end` are out of range, returns the substring within the valid range of the string.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the string. |
| `start` | `number` | The starting byte offset. |
| `end` | `number` | The ending byte offset. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

A substring extracted from the value stored at `key`.

#### See

[https://valkey.io/commands/getrange/\|valkey.io](https://valkey.io/commands/getrange/|valkey.io) for details.

#### Example

```typescript
await client.set("mykey", "This is a string")
let result = await client.getrange("mykey", 0, 3)
console.log(result); // Output: "This"
result = await client.getrange("mykey", -3, -1)
console.log(result); // Output: "ing" - extracted last 3 characters of a string
result = await client.getrange("mykey", 0, 100)
console.log(result); // Output: "This is a string"
result = await client.getrange("mykey", 5, 6)
console.log(result); // Output: ""
```

***

### getStatistics()

> **getStatistics**(): `object`

Return a statistics

#### Returns

`object`

Return an object that contains the statistics collected internally by GLIDE core

***

### hdel()

> **hdel**(`key`, `fields`): `Promise`\<`number`\>

Removes the specified fields from the hash stored at `key`.
Specified fields that do not exist within this hash are ignored.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `fields` | [`GlideString`](../type-aliases/GlideString.md)[] | The fields to remove from the hash stored at `key`. |

#### Returns

`Promise`\<`number`\>

the number of fields that were removed from the hash, not including specified but non existing fields.
If `key` does not exist, it is treated as an empty hash and it returns 0.

#### See

[https://valkey.io/commands/hdel/\|valkey.io](https://valkey.io/commands/hdel/|valkey.io) for details.

#### Example

```typescript
// Example usage of the hdel method
const result = await client.hdel("my_hash", ["field1", "field2"]);
console.log(result); // Output: 2 - Indicates that two fields were successfully removed from the hash.
```

***

### hexists()

> **hexists**(`key`, `field`): `Promise`\<`boolean`\>

Returns if `field` is an existing field in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../type-aliases/GlideString.md) | The field to check in the hash stored at `key`. |

#### Returns

`Promise`\<`boolean`\>

`true` the hash contains `field`. If the hash does not contain `field`, or if `key` does not exist, it returns `false`.

#### See

[https://valkey.io/commands/hexists/\|valkey.io](https://valkey.io/commands/hexists/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the hexists method with existing field
const result = await client.hexists("my_hash", "field1");
console.log(result); // Output: true
```

```typescript
// Example usage of the hexists method with non-existing field
const result = await client.hexists("my_hash", "nonexistent_field");
console.log(result); // Output: false
```

***

### hget()

> **hget**(`key`, `field`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Retrieve the value associated with `field` in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../type-aliases/GlideString.md) | The field in the hash stored at `key` to retrieve from the database. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

the value associated with `field`, or null when `field` is not present in the hash or `key` does not exist.

#### See

[https://valkey.io/commands/hget/\|valkey.io](https://valkey.io/commands/hget/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the hget method on an-existing field
await client.hset("my_hash", {"field": "value"});
const result = await client.hget("my_hash", "field");
console.log(result); // Output: "value"
```

```typescript
// Example usage of the hget method on a non-existing field
const result = await client.hget("my_hash", "nonexistent_field");
console.log(result); // Output: null
```

***

### hgetall()

> **hgetall**(`key`, `options`?): `Promise`\<[`HashDataType`](../type-aliases/HashDataType.md)\>

Returns all fields and values of the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`HashDataType`](../type-aliases/HashDataType.md)\>

A list of fields and their values stored in the hash.
If `key` does not exist, it returns an empty list.

#### See

[https://valkey.io/commands/hgetall/\|valkey.io](https://valkey.io/commands/hgetall/|valkey.io) for details.

#### Example

```typescript
// Example usage of the hgetall method
const result = await client.hgetall("my_hash");
console.log(result); // Output:
// [
//     { field: "field1", value: "value1"},
//     { field: "field2", value: "value2"}
// ]
```

***

### hincrBy()

> **hincrBy**(`key`, `field`, `amount`): `Promise`\<`number`\>

Increments the number stored at `field` in the hash stored at `key` by increment.
By using a negative increment value, the value stored at `field` in the hash stored at `key` is decremented.
If `field` or `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../type-aliases/GlideString.md) | The field in the hash stored at `key` to increment its value. |
| `amount` | `number` | The amount to increment. |

#### Returns

`Promise`\<`number`\>

the value of `field` in the hash stored at `key` after the increment.

#### See

[https://valkey.io/commands/hincrby/\|valkey.io](https://valkey.io/commands/hincrby/|valkey.io) for details.

#### Example

```typescript
// Example usage of the hincrby method to increment the value in a hash by a specified amount
const result = await client.hincrby("my_hash", "field1", 5);
console.log(result); // Output: 5
```

***

### hincrByFloat()

> **hincrByFloat**(`key`, `field`, `amount`): `Promise`\<`number`\>

Increment the string representing a floating point number stored at `field` in the hash stored at `key` by increment.
By using a negative increment value, the value stored at `field` in the hash stored at `key` is decremented.
If `field` or `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../type-aliases/GlideString.md) | The field in the hash stored at `key` to increment its value. |
| `amount` | `number` | The amount to increment. |

#### Returns

`Promise`\<`number`\>

the value of `field` in the hash stored at `key` after the increment.

#### See

[https://valkey.io/commands/hincrbyfloat/\|valkey.io](https://valkey.io/commands/hincrbyfloat/|valkey.io) for details.

#### Example

```typescript
// Example usage of the hincrbyfloat method to increment the value of a floating point in a hash by a specified amount
const result = await client.hincrbyfloat("my_hash", "field1", 2.5);
console.log(result); // Output: 2.5
```

***

### hkeys()

> **hkeys**(`key`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Returns all field names in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

A list of field names for the hash, or an empty list when the key does not exist.

#### See

[https://valkey.io/commands/hkeys/\|valkey.io](https://valkey.io/commands/hkeys/|valkey.io) for details.

#### Example

```typescript
// Example usage of the hkeys method:
await client.hset("my_hash", {"field1": "value1", "field2": "value2", "field3": "value3"});
const result = await client.hkeys("my_hash");
console.log(result); // Output: ["field1", "field2", "field3"]  - Returns all the field names stored in the hash "my_hash".
```

***

### hlen()

> **hlen**(`key`): `Promise`\<`number`\>

Returns the number of fields contained in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |

#### Returns

`Promise`\<`number`\>

The number of fields in the hash, or 0 when the key does not exist.

#### See

[https://valkey.io/commands/hlen/\|valkey.io](https://valkey.io/commands/hlen/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of the hlen method with an existing key
const result = await client.hlen("my_hash");
console.log(result); // Output: 3
```

```typescript
// Example usage of the hlen method with a non-existing key
const result = await client.hlen("non_existing_key");
console.log(result); // Output: 0
```

***

### hmget()

> **hmget**(`key`, `fields`, `options`?): `Promise`\<(`null` \| [`GlideString`](../type-aliases/GlideString.md))[]\>

Returns the values associated with the specified fields in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `fields` | [`GlideString`](../type-aliases/GlideString.md)[] | The fields in the hash stored at `key` to retrieve from the database. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<(`null` \| [`GlideString`](../type-aliases/GlideString.md))[]\>

a list of values associated with the given fields, in the same order as they are requested.
For every field that does not exist in the hash, a null value is returned.
If `key` does not exist, it is treated as an empty hash and it returns a list of null values.

#### See

[https://valkey.io/commands/hmget/\|valkey.io](https://valkey.io/commands/hmget/|valkey.io) for details.

#### Example

```typescript
// Example usage of the hmget method
const result = await client.hmget("my_hash", ["field1", "field2"]);
console.log(result); // Output: ["value1", "value2"] - A list of values associated with the specified fields.
```

***

### hrandfield()

> **hrandfield**(`key`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Returns a random field name from the hash value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

A random field name from the hash stored at `key`, or `null` when
    the key does not exist.

#### See

[https://valkey.io/commands/hrandfield/\|valkey.io](https://valkey.io/commands/hrandfield/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
console.log(await client.hrandfield("myHash")); // Output: 'field'
```

***

### hrandfieldCount()

> **hrandfieldCount**(`key`, `count`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Retrieves up to `count` random field names from the hash value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `count` | `number` | The number of field names to return. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). If `count` is positive, returns unique elements. If negative, allows for duplicates. |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

An `array` of random field names from the hash stored at `key`,
    or an `empty array` when the key does not exist.

#### See

[https://valkey.io/commands/hrandfield/\|valkey.io](https://valkey.io/commands/hrandfield/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
console.log(await client.hrandfieldCount("myHash", 2)); // Output: ['field1', 'field2']
```

***

### hrandfieldWithValues()

> **hrandfieldWithValues**(`key`, `count`, `options`?): `Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)\][]\>

Retrieves up to `count` random field names along with their values from the hash
value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `count` | `number` | The number of field names to return. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). If `count` is positive, returns unique elements. If negative, allows for duplicates. |

#### Returns

`Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)\][]\>

A 2D `array` of `[fieldName, value]` `arrays`, where `fieldName` is a random
    field name from the hash and `value` is the associated value of the field name.
    If the hash does not exist or is empty, the response will be an empty `array`.

#### See

[https://valkey.io/commands/hrandfield/\|valkey.io](https://valkey.io/commands/hrandfield/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
const result = await client.hrandfieldCountWithValues("myHash", 2);
console.log(result); // Output: [['field1', 'value1'], ['field2', 'value2']]
```

***

### hscan()

> **hscan**(`key`, `cursor`, `options`?): `Promise`\<\[`string`, [`GlideString`](../type-aliases/GlideString.md)[]\]\>

Iterates incrementally over a hash.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the set. |
| `cursor` | `string` | The cursor that points to the next iteration of results. A value of `"0"` indicates the start of the search. |
| `options`? | [`BaseScanOptions`](../../Commands/interfaces/BaseScanOptions.md) & `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [HScanOptions](../../Commands/type-aliases/HScanOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<\[`string`, [`GlideString`](../type-aliases/GlideString.md)[]\]\>

An array of the `cursor` and the subset of the hash held by `key`.
The first element is always the `cursor` for the next iteration of results. `"0"` will be the `cursor`
returned on the last iteration of the hash. The second element is always an array of the subset of the
hash held in `key`. The array in the second element is a flattened series of string pairs,
where the value is at even indices and the value is at odd indices.
If `options.noValues` is set to `true`, the second element will only contain the fields without the values.

#### See

[https://valkey.io/commands/hscan/\|valkey.io](https://valkey.io/commands/hscan/|valkey.io) for more details.

#### Examples

```typescript
// Assume "key" contains a hash with multiple members
let newCursor = "0";
let result = [];
do {
     result = await client.hscan(key1, newCursor, {
         match: "*",
         count: 3,
     });
     newCursor = result[0];
     console.log("Cursor: ", newCursor);
     console.log("Members: ", result[1]);
} while (newCursor !== "0");
// The output of the code above is something similar to:
// Cursor:  31
// Members:  ['field 79', 'value 79', 'field 20', 'value 20', 'field 115', 'value 115']
// Cursor:  39
// Members:  ['field 63', 'value 63', 'field 293', 'value 293', 'field 162', 'value 162']
// Cursor:  0
// Members:  ['field 55', 'value 55', 'field 24', 'value 24', 'field 90', 'value 90', 'field 113', 'value 113']
```

```typescript
// Hscan with noValues
let newCursor = "0";
let result = [];
do {
     result = await client.hscan(key1, newCursor, {
         match: "*",
         count: 3,
         noValues: true,
     });
     newCursor = result[0];
     console.log("Cursor: ", newCursor);
     console.log("Members: ", result[1]);
} while (newCursor !== "0");
// The output of the code above is something similar to:
// Cursor:  31
// Members:  ['field 79', 'field 20', 'field 115']
// Cursor:  39
// Members:  ['field 63', 'field 293', 'field 162']
// Cursor:  0
// Members:  ['field 55', 'field 24', 'field 90', 'field 113']
```

***

### hset()

> **hset**(`key`, `fieldsAndValues`): `Promise`\<`number`\>

Sets the specified fields to their respective values in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `fieldsAndValues` | `Record`\<`string`, [`GlideString`](../type-aliases/GlideString.md)\> \| [`HashDataType`](../type-aliases/HashDataType.md) | A list of field names and their values. |

#### Returns

`Promise`\<`number`\>

The number of fields that were added.

#### See

[https://valkey.io/commands/hset/\|valkey.io](https://valkey.io/commands/hset/|valkey.io) for details.

#### Example

```typescript
// Example usage of the hset method using HashDataType as input type
const result = await client.hset("my_hash", [{"field": "field1", "value": "value1"}, {"field": "field2", "value": "value2"}]);
console.log(result); // Output: 2 - Indicates that 2 fields were successfully set in the hash "my_hash".

// Example usage of the hset method using Record<string, GlideString> as input
const result = await client.hset("my_hash", {"field1": "value", "field2": "value2"});
console.log(result); // Output: 2 - Indicates that 2 fields were successfully set in the hash "my_hash".
```

***

### hsetnx()

> **hsetnx**(`key`, `field`, `value`): `Promise`\<`boolean`\>

Sets `field` in the hash stored at `key` to `value`, only if `field` does not yet exist.
If `key` does not exist, a new key holding a hash is created.
If `field` already exists, this operation has no effect.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../type-aliases/GlideString.md) | The field to set the value for. |
| `value` | [`GlideString`](../type-aliases/GlideString.md) | The value to set. |

#### Returns

`Promise`\<`boolean`\>

`true` if the field was set, `false` if the field already existed and was not set.

#### See

[https://valkey.io/commands/hsetnx/\|valkey.io](https://valkey.io/commands/hsetnx/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of the hsetnx method
const result = await client.hsetnx("my_hash", "field", "value");
console.log(result); // Output: true - Indicates that the field "field" was set successfully in the hash "my_hash".
```

```typescript
// Example usage of the hsetnx method on a field that already exists
const result = await client.hsetnx("my_hash", "field", "new_value");
console.log(result); // Output: false - Indicates that the field "field" already existed in the hash "my_hash" and was not set again.
```

***

### hstrlen()

> **hstrlen**(`key`, `field`): `Promise`\<`number`\>

Returns the string length of the value associated with `field` in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../type-aliases/GlideString.md) | The field in the hash. |

#### Returns

`Promise`\<`number`\>

The string length or `0` if `field` or `key` does not exist.

#### See

[https://valkey.io/commands/hstrlen/\|valkey.io](https://valkey.io/commands/hstrlen/|valkey.io) for details.

#### Example

```typescript
await client.hset("my_hash", {"field": "value"});
const result = await client.hstrlen("my_hash", "field");
console.log(result); // Output: 5
```

***

### hvals()

> **hvals**(`key`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Returns all values in the hash stored at key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the hash. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

a list of values in the hash, or an empty list when the key does not exist.

#### See

[https://valkey.io/commands/hvals/\|valkey.io](https://valkey.io/commands/hvals/|valkey.io) for more details.

#### Example

```typescript
// Example usage of the hvals method
const result = await client.hvals("my_hash");
console.log(result); // Output: ["value1", "value2", "value3"] - Returns all the values stored in the hash "my_hash".
```

***

### incr()

> **incr**(`key`): `Promise`\<`number`\>

Increments the number stored at `key` by one. If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to increment its value. |

#### Returns

`Promise`\<`number`\>

the value of `key` after the increment.

#### See

[https://valkey.io/commands/incr/\|valkey.io](https://valkey.io/commands/incr/|valkey.io) for details.

#### Example

```typescript
// Example usage of incr method to increment the value of a key
await client.set("my_counter", "10");
const result = await client.incr("my_counter");
console.log(result); // Output: 11
```

***

### incrBy()

> **incrBy**(`key`, `amount`): `Promise`\<`number`\>

Increments the number stored at `key` by `amount`. If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to increment its value. |
| `amount` | `number` | The amount to increment. |

#### Returns

`Promise`\<`number`\>

the value of `key` after the increment.

#### See

[https://valkey.io/commands/incrby/\|valkey.io](https://valkey.io/commands/incrby/|valkey.io) for details.

#### Example

```typescript
// Example usage of incrBy method to increment the value of a key by a specified amount
await client.set("my_counter", "10");
const result = await client.incrBy("my_counter", 5);
console.log(result); // Output: 15
```

***

### incrByFloat()

> **incrByFloat**(`key`, `amount`): `Promise`\<`number`\>

Increment the string representing a floating point number stored at `key` by `amount`.
By using a negative increment value, the result is that the value stored at `key` is decremented.
If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to increment its value. |
| `amount` | `number` | The amount to increment. |

#### Returns

`Promise`\<`number`\>

the value of `key` after the increment.

#### See

[https://valkey.io/commands/incrbyfloat/\|valkey.io](https://valkey.io/commands/incrbyfloat/|valkey.io) for details.

#### Example

```typescript
// Example usage of incrByFloat method to increment the value of a floating point key by a specified amount
await client.set("my_float_counter", "10.5");
const result = await client.incrByFloat("my_float_counter", 2.5);
console.log(result); // Output: 13.0
```

***

### invokeScript()

> **invokeScript**(`script`, `options`?): `Promise`\<[`GlideReturnType`](../type-aliases/GlideReturnType.md)\>

Invokes a Lua script with its keys and arguments.
This method simplifies the process of invoking scripts on a Valkey server by using an object that represents a Lua script.
The script loading, argument preparation, and execution will all be handled internally. If the script has not already been loaded,
it will be loaded automatically using the `SCRIPT LOAD` command. After that, it will be invoked using the `EVALSHA` command.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `script` | `Script` | The Lua script to execute. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `keys` : the keys that are used in the script. - (Optional) `args`: the arguments for the script. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideReturnType`](../type-aliases/GlideReturnType.md)\>

A value that depends on the script that was executed.

#### See

[LOAD](https://valkey.io/commands/script-load/|SCRIPT) and [https://valkey.io/commands/evalsha/\|EVALSHA](https://valkey.io/commands/evalsha/|EVALSHA) on valkey.io for details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
const luaScript = new Script("return { KEYS[1], ARGV[1] }");
const scriptOptions = {
     keys: ["foo"],
     args: ["bar"],
};
const result = await invokeScript(luaScript, scriptOptions);
console.log(result); // Output: ['foo', 'bar']
```

***

### isPubsubConfigured()

> **isPubsubConfigured**(`config`): `boolean`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`GlideClientConfiguration`](../../GlideClient/type-aliases/GlideClientConfiguration.md) \| [`GlideClusterClientConfiguration`](../../GlideClusterClient/type-aliases/GlideClusterClientConfiguration.md) |

#### Returns

`boolean`

***

### lcs()

> **lcs**(`key1`, `key2`, `options`?): `Promise`\<`string`\>

Returns all the longest common subsequences combined between strings stored at `key1` and `key2`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key1` | [`GlideString`](../type-aliases/GlideString.md) | The key that stores the first string. |
| `key2` | [`GlideString`](../type-aliases/GlideString.md) | The key that stores the second string. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`string`\>

A `String` containing all the longest common subsequence combined between the 2 strings.
    An empty `String` is returned if the keys do not exist or have no common subsequences.

#### See

[https://valkey.io/commands/lcs/\|valkey.io](https://valkey.io/commands/lcs/|valkey.io) for more details.

#### Remarks

When in cluster mode, `key1` and `key2` must map to the same hash slot.

#### Example

```typescript
await client.mset({"testKey1": "abcd", "testKey2": "axcd"});
const result = await client.lcs("testKey1", "testKey2");
console.log(result); // Output: 'acd'
```

***

### lcsIdx()

> **lcsIdx**(`key1`, `key2`, `options`?): `Promise`\<`Record`\<`string`, `number` \| (`number` \| \[`number`, `number`\])[][]\>\>

Returns the indices and lengths of the longest common subsequences between strings stored at
`key1` and `key2`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key1` | [`GlideString`](../type-aliases/GlideString.md) | The key that stores the first string. |
| `key2` | [`GlideString`](../type-aliases/GlideString.md) | The key that stores the second string. |
| `options`? | \{ `minMatchLen`: `number`; `withMatchLen`: `boolean`; \} | (Optional) Additional parameters: - (Optional) `withMatchLen`: if `true`, include the length of the substring matched for the each match. - (Optional) `minMatchLen`: the minimum length of matches to include in the result. |
| `options.minMatchLen`? | `number` | - |
| `options.withMatchLen`? | `boolean` | - |

#### Returns

`Promise`\<`Record`\<`string`, `number` \| (`number` \| \[`number`, `number`\])[][]\>\>

A `Record` containing the indices of the longest common subsequences between the
    2 strings and the lengths of the longest common subsequences. The resulting map contains two
    keys, "matches" and "len":
    - `"len"` is mapped to the total length of the all longest common subsequences between the 2 strings
          stored as an integer. This value doesn't count towards the `minMatchLen` filter.
    - `"matches"` is mapped to a three dimensional array of integers that stores pairs
          of indices that represent the location of the common subsequences in the strings held
          by `key1` and `key2`.

    See example for more details.

#### See

[https://valkey.io/commands/lcs/\|valkey.io](https://valkey.io/commands/lcs/|valkey.io) for more details.

#### Remarks

When in cluster mode, `key1` and `key2` must map to the same hash slot.

#### Example

```typescript
await client.mset({"key1": "ohmytext", "key2": "mynewtext"});
const result = await client.lcsIdx("key1", "key2");
console.log(result); // Output:
{
    "matches" :
    [
        [              // first substring match is "text"
            [4, 7],    // in `key1` it is located between indices 4 and 7
            [5, 8],    // and in `key2` - in between 5 and 8
            4          // the match length, returned if `withMatchLen` set to `true`
        ],
        [              // second substring match is "my"
            [2, 3],    // in `key1` it is located between indices 2 and 3
            [0, 1],    // and in `key2` - in between 0 and 1
            2          // the match length, returned if `withMatchLen` set to `true`
        ]
    ],
    "len" : 6          // total length of the all matches found
}
```

***

### lcsLen()

> **lcsLen**(`key1`, `key2`, `options`?): `Promise`\<`number`\>

Returns the total length of all the longest common subsequences between strings stored at `key1` and `key2`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key1` | [`GlideString`](../type-aliases/GlideString.md) | The key that stores the first string. |
| `key2` | [`GlideString`](../type-aliases/GlideString.md) | The key that stores the second string. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`number`\>

The total length of all the longest common subsequences between the 2 strings.

#### See

[https://valkey.io/commands/lcs/\|valkey.io](https://valkey.io/commands/lcs/|valkey.io) for more details.

#### Remarks

When in cluster mode, `key1` and `key2` must map to the same hash slot.

#### Example

```typescript
await client.mset({"testKey1": "abcd", "testKey2": "axcd"});
const result = await client.lcsLen("testKey1", "testKey2");
console.log(result); // Output: 3
```

***

### lindex()

> **lindex**(`key`, `index`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Returns the element at index `index` in the list stored at `key`.
The index is zero-based, so 0 means the first element, 1 the second element and so on.
Negative indices can be used to designate elements starting at the tail of the list.
Here, -1 means the last element, -2 means the penultimate and so forth.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The `key` of the list. |
| `index` | `number` | The `index` of the element in the list to retrieve. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

- The element at `index` in the list stored at `key`.
If `index` is out of range or if `key` does not exist, null is returned.

#### See

[https://valkey.io/commands/lindex/\|valkey.io](https://valkey.io/commands/lindex/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of lindex method to retrieve elements from a list by index
const result = await client.lindex("my_list", 0);
console.log(result); // Output: 'value1' - Returns the first element in the list stored at 'my_list'.
```

```typescript
// Example usage of lindex method to retrieve elements from a list by negative index
const result = await client.lindex("my_list", -1);
console.log(result); // Output: 'value3' - Returns the last element in the list stored at 'my_list'.
```

***

### linsert()

> **linsert**(`key`, `position`, `pivot`, `element`): `Promise`\<`number`\>

Inserts `element` in the list at `key` either before or after the `pivot`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `position` | [`InsertPosition`](../../Commands/enumerations/InsertPosition.md) | The relative position to insert into - either `InsertPosition.Before` or `InsertPosition.After` the `pivot`. |
| `pivot` | [`GlideString`](../type-aliases/GlideString.md) | An element of the list. |
| `element` | [`GlideString`](../type-aliases/GlideString.md) | The new element to insert. |

#### Returns

`Promise`\<`number`\>

The list length after a successful insert operation.
If the `key` doesn't exist returns `-1`.
If the `pivot` wasn't found, returns `0`.

#### See

[https://valkey.io/commands/linsert/\|valkey.io](https://valkey.io/commands/linsert/|valkey.io) for more details.

#### Example

```typescript
const length = await client.linsert("my_list", InsertPosition.Before, "World", "There");
console.log(length); // Output: 2 - The list has a length of 2 after performing the insert.
```

***

### llen()

> **llen**(`key`): `Promise`\<`number`\>

Returns the length of the list stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |

#### Returns

`Promise`\<`number`\>

the length of the list at `key`.
If `key` does not exist, it is interpreted as an empty list and 0 is returned.

#### See

[https://valkey.io/commands/llen/\|valkey.io](https://valkey.io/commands/llen/|valkey.io) for details.

#### Example

```typescript
// Example usage of the llen method
const result = await client.llen("my_list");
console.log(result); // Output: 3 - Indicates that there are 3 elements in the list.
```

***

### lmove()

> **lmove**(`source`, `destination`, `whereFrom`, `whereTo`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Atomically pops and removes the left/right-most element to the list stored at `source`
depending on `whereTo`, and pushes the element at the first/last element of the list
stored at `destination` depending on `whereFrom`, see [ListDirection](../../Commands/enumerations/ListDirection.md).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `source` | [`GlideString`](../type-aliases/GlideString.md) | The key to the source list. |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key to the destination list. |
| `whereFrom` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The [ListDirection](../../Commands/enumerations/ListDirection.md) to remove the element from. |
| `whereTo` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The [ListDirection](../../Commands/enumerations/ListDirection.md) to add the element to. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

The popped element, or `null` if `source` does not exist.

#### See

[https://valkey.io/commands/lmove/\|valkey.io](https://valkey.io/commands/lmove/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
await client.lpush("testKey1", ["two", "one"]);
await client.lpush("testKey2", ["four", "three"]);

const result1 = await client.lmove("testKey1", "testKey2", ListDirection.LEFT, ListDirection.LEFT);
console.log(result1); // Output: "one".

const updated_array_key1 = await client.lrange("testKey1", 0, -1);
console.log(updated_array); // Output: "two".

const updated_array_key2 = await client.lrange("testKey2", 0, -1);
console.log(updated_array_key2); // Output: ["one", "three", "four"].
```

***

### lmpop()

> **lmpop**(`keys`, `direction`, `options`?): `Promise`\<`null` \| \{ `elements`: [`GlideString`](../type-aliases/GlideString.md)[]; `key`: [`GlideString`](../type-aliases/GlideString.md); \}\>

Pops one or more elements from the first non-empty list from the provided `keys`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | An array of keys. |
| `direction` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The direction based on which elements are popped from - see [ListDirection](../../Commands/enumerations/ListDirection.md). |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `count`: the maximum number of popped elements. If not specified, pops one member. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| \{ `elements`: [`GlideString`](../type-aliases/GlideString.md)[]; `key`: [`GlideString`](../type-aliases/GlideString.md); \}\>

A `Record` which stores the key name where elements were popped out and the array of popped elements.

#### See

[https://valkey.io/commands/lmpop/\|valkey.io](https://valkey.io/commands/lmpop/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
await client.lpush("testKey", ["one", "two", "three"]);
await client.lpush("testKey2", ["five", "six", "seven"]);
const result = await client.lmpop(["testKey", "testKey2"], ListDirection.LEFT, 1L);
console.log(result); // Output: { key: "testKey", elements: ["three"] }
```

***

### lpop()

> **lpop**(`key`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Removes and returns the first elements of the list stored at `key`.
The command pops a single element from the beginning of the list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

The value of the first element.
If `key` does not exist null will be returned.

#### See

[https://valkey.io/commands/lpop/\|valkey.io](https://valkey.io/commands/lpop/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the lpop method with an existing list
const result = await client.lpop("my_list");
console.log(result); // Output: 'value1'
```

```typescript
// Example usage of the lpop method with a non-existing list
const result = await client.lpop("non_exiting_key");
console.log(result); // Output: null
```

***

### lpopCount()

> **lpopCount**(`key`, `count`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)[]\>

Removes and returns up to `count` elements of the list stored at `key`, depending on the list's length.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `count` | `number` | The count of the elements to pop from the list. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)[]\>

A list of the popped elements will be returned depending on the list's length.
If `key` does not exist null will be returned.

#### See

[https://valkey.io/commands/lpop/\|valkey.io](https://valkey.io/commands/lpop/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the lpopCount method with an existing list
const result = await client.lpopCount("my_list", 2);
console.log(result); // Output: ["value1", "value2"]
```

```typescript
// Example usage of the lpopCount method with a non-existing list
const result = await client.lpopCount("non_exiting_key", 3);
console.log(result); // Output: null
```

***

### lpos()

> **lpos**(`key`, `element`, `options`?): `Promise`\<`null` \| `number` \| `number`[]\>

Returns the index of the first occurrence of `element` inside the list specified by `key`. If no
match is found, `null` is returned. If the `count` option is specified, then the function returns
an `array` of indices of matching elements within the list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The name of the list. |
| `element` | [`GlideString`](../type-aliases/GlideString.md) | The value to search for within the list. |
| `options`? | [`LPosOptions`](../../Commands/interfaces/LPosOptions.md) | (Optional) The LPOS options - see [LPosOptions](../../Commands/interfaces/LPosOptions.md). |

#### Returns

`Promise`\<`null` \| `number` \| `number`[]\>

The index of `element`, or `null` if `element` is not in the list. If the `count` option
is specified, then the function returns an `array` of indices of matching elements within the list.

#### See

[https://valkey.io/commands/lpos/\|valkey.io](https://valkey.io/commands/lpos/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.0.6.

#### Example

```typescript
await client.rpush("myList", ["a", "b", "c", "d", "e", "e"]);
console.log(await client.lpos("myList", "e", { rank: 2 })); // Output: 5 - the second occurrence of "e" is at index 5.
console.log(await client.lpos("myList", "e", { count: 3 })); // Output: [ 4, 5 ] - indices for the occurrences of "e" in list "myList".
```

***

### lpush()

> **lpush**(`key`, `elements`): `Promise`\<`number`\>

Inserts all the specified values at the head of the list stored at `key`.
`elements` are inserted one after the other to the head of the list, from the leftmost element to the rightmost element.
If `key` does not exist, it is created as empty list before performing the push operations.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `elements` | [`GlideString`](../type-aliases/GlideString.md)[] | The elements to insert at the head of the list stored at `key`. |

#### Returns

`Promise`\<`number`\>

the length of the list after the push operations.

#### See

[https://valkey.io/commands/lpush/\|valkey.io](https://valkey.io/commands/lpush/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the lpush method with an existing list
const result = await client.lpush("my_list", ["value2", "value3"]);
console.log(result); // Output: 3 - Indicated that the new length of the list is 3 after the push operation.
```

```typescript
// Example usage of the lpush method with a non-existing list
const result = await client.lpush("nonexistent_list", ["new_value"]);
console.log(result); // Output: 1 - Indicates that a new list was created with one element
```

***

### lpushx()

> **lpushx**(`key`, `elements`): `Promise`\<`number`\>

Inserts specified values at the head of the `list`, only if `key` already
exists and holds a list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `elements` | [`GlideString`](../type-aliases/GlideString.md)[] | The elements to insert at the head of the list stored at `key`. |

#### Returns

`Promise`\<`number`\>

The length of the list after the push operation.

#### See

[https://valkey.io/commands/lpushx/\|valkey.io](https://valkey.io/commands/lpushx/|valkey.io) for details.

#### Example

```typescript
const listLength = await client.lpushx("my_list", ["value1", "value2"]);
console.log(result); // Output: 2 - Indicates that the list has two elements.
```

***

### lrange()

> **lrange**(`key`, `start`, `end`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Returns the specified elements of the list stored at `key`.
The offsets `start` and `end` are zero-based indexes, with 0 being the first element of the list, 1 being the next element and so on.
These offsets can also be negative numbers indicating offsets starting at the end of the list,
with -1 being the last element of the list, -2 being the penultimate, and so on.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `start` | `number` | The starting point of the range. |
| `end` | `number` | The end of the range. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

list of elements in the specified range.
If `start` exceeds the end of the list, or if `start` is greater than `end`, an empty list will be returned.
If `end` exceeds the actual end of the list, the range will stop at the actual end of the list.
If `key` does not exist an empty list will be returned.

#### See

[https://valkey.io/commands/lrange/\|valkey.io](https://valkey.io/commands/lrange/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the lrange method with an existing list and positive indices
const result = await client.lrange("my_list", 0, 2);
console.log(result); // Output: ["value1", "value2", "value3"]
```

```typescript
// Example usage of the lrange method with an existing list and negative indices
const result = await client.lrange("my_list", -2, -1);
console.log(result); // Output: ["value2", "value3"]
```

```typescript
// Example usage of the lrange method with a non-existing list
const result = await client.lrange("non_exiting_key", 0, 2);
console.log(result); // Output: []
```

***

### lrem()

> **lrem**(`key`, `count`, `element`): `Promise`\<`number`\>

Removes the first `count` occurrences of elements equal to `element` from the list stored at `key`.
If `count` is positive : Removes elements equal to `element` moving from head to tail.
If `count` is negative : Removes elements equal to `element` moving from tail to head.
If `count` is 0 or `count` is greater than the occurrences of elements equal to `element`: Removes all elements equal to `element`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `count` | `number` | The count of the occurrences of elements equal to `element` to remove. |
| `element` | [`GlideString`](../type-aliases/GlideString.md) | The element to remove from the list. |

#### Returns

`Promise`\<`number`\>

the number of the removed elements.
If `key` does not exist, 0 is returned.

#### Example

```typescript
// Example usage of the lrem method
const result = await client.lrem("my_list", 2, "value");
console.log(result); // Output: 2 - Removes the first 2 occurrences of "value" in the list.
```

***

### lset()

> **lset**(`key`, `index`, `element`): `Promise`\<`"OK"`\>

Sets the list element at `index` to `element`.
The index is zero-based, so `0` means the first element, `1` the second element and so on.
Negative indices can be used to designate elements starting at the tail of
the list. Here, `-1` means the last element, `-2` means the penultimate and so forth.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `index` | `number` | The index of the element in the list to be set. |
| `element` | [`GlideString`](../type-aliases/GlideString.md) | The new element to set at the specified index. |

#### Returns

`Promise`\<`"OK"`\>

Always "OK".

#### See

[https://valkey.io/commands/lset/\|valkey.io](https://valkey.io/commands/lset/|valkey.io) for details.

#### Example

```typescript
// Example usage of the lset method
const response = await client.lset("test_key", 1, "two");
console.log(response); // Output: 'OK' - Indicates that the second index of the list has been set to "two".
```

***

### ltrim()

> **ltrim**(`key`, `start`, `end`): `Promise`\<`"OK"`\>

Trim an existing list so that it will contain only the specified range of elements specified.
The offsets `start` and `end` are zero-based indexes, with 0 being the first element of the list, 1 being the next element and so on.
These offsets can also be negative numbers indicating offsets starting at the end of the list,
with -1 being the last element of the list, -2 being the penultimate, and so on.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `start` | `number` | The starting point of the range. |
| `end` | `number` | The end of the range. |

#### Returns

`Promise`\<`"OK"`\>

always "OK".
If `start` exceeds the end of the list, or if `start` is greater than `end`, the result will be an empty list (which causes key to be removed).
If `end` exceeds the actual end of the list, it will be treated like the last element of the list.
If `key` does not exist the command will be ignored.

#### See

[https://valkey.io/commands/ltrim/\|valkey.io](https://valkey.io/commands/ltrim/|valkey.io) for details.

#### Example

```typescript
// Example usage of the ltrim method
const result = await client.ltrim("my_list", 0, 1);
console.log(result); // Output: 'OK' - Indicates that the list has been trimmed to contain elements from 0 to 1.
```

***

### mget()

> **mget**(`keys`, `options`?): `Promise`\<(`null` \| [`GlideString`](../type-aliases/GlideString.md))[]\>

Retrieve the values of multiple keys.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of keys to retrieve values for. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<(`null` \| [`GlideString`](../type-aliases/GlideString.md))[]\>

A list of values corresponding to the provided keys. If a key is not found,
its corresponding value in the list will be null.

#### See

[https://valkey.io/commands/mget/\|valkey.io](https://valkey.io/commands/mget/|valkey.io) for details.

#### Remarks

In cluster mode, if keys in `keys` map to different hash slots,
the command will be split across these slots and executed separately for each.
This means the command is atomic only at the slot level. If one or more slot-specific
requests fail, the entire call will return the first encountered error, even
though some requests may have succeeded while others did not.
If this behavior impacts your application logic, consider splitting the
request into sub-requests per slot to ensure atomicity.

#### Example

```typescript
// Example usage of mget method to retrieve values of multiple keys
await client.set("key1", "value1");
await client.set("key2", "value2");
const result = await client.mget(["key1", "key2"]);
console.log(result); // Output: ['value1', 'value2']
```

***

### mset()

> **mset**(`keysAndValues`): `Promise`\<`"OK"`\>

Set multiple keys to multiple values in a single operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keysAndValues` | `Record`\<`string`, [`GlideString`](../type-aliases/GlideString.md)\> \| [`GlideRecord`](../type-aliases/GlideRecord.md)\<[`GlideString`](../type-aliases/GlideString.md)\> | A list of key-value pairs to set. |

#### Returns

`Promise`\<`"OK"`\>

A simple "OK" response.

#### See

[https://valkey.io/commands/mset/\|valkey.io](https://valkey.io/commands/mset/|valkey.io) for details.

#### Remarks

In cluster mode, if keys in `keyValueMap` map to different hash slots,
the command will be split across these slots and executed separately for each.
This means the command is atomic only at the slot level. If one or more slot-specific
requests fail, the entire call will return the first encountered error, even
though some requests may have succeeded while others did not.
If this behavior impacts your application logic, consider splitting the
request into sub-requests per slot to ensure atomicity.

#### Examples

```typescript
// Example usage of mset method to set values for multiple keys
const result = await client.mset({"key1": "value1", "key2": "value2"});
console.log(result); // Output: 'OK'
```

```typescript
// Example usage of mset method to set values for multiple keys (GlideRecords allow binary data in the key)
const result = await client.mset([{key: "key1", value: "value1"}, {key: "key2", value: "value2"}]);
console.log(result); // Output: 'OK'
```

***

### msetnx()

> **msetnx**(`keysAndValues`): `Promise`\<`boolean`\>

Sets multiple keys to values if the key does not exist. The operation is atomic, and if one or
more keys already exist, the entire operation fails.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keysAndValues` | `Record`\<`string`, [`GlideString`](../type-aliases/GlideString.md)\> \| [`GlideRecord`](../type-aliases/GlideRecord.md)\<[`GlideString`](../type-aliases/GlideString.md)\> | A list of key-value pairs to set. |

#### Returns

`Promise`\<`boolean`\>

`true` if all keys were set. `false` if no key was set.

#### See

[https://valkey.io/commands/msetnx/\|valkey.io](https://valkey.io/commands/msetnx/|valkey.io) for more details.

#### Remarks

When in cluster mode, all keys in `keyValueMap` must map to the same hash slot.

#### Example

```typescript
const result1 = await client.msetnx({"key1": "value1", "key2": "value2"});
console.log(result1); // Output: `true`

const result2 = await client.msetnx({"key2": "value4", "key3": "value5"});
console.log(result2); // Output: `false`
```

***

### notificationToPubSubMessageSafe()

> **notificationToPubSubMessageSafe**(`pushNotification`, `decoder`?): `null` \| [`PubSubMsg`](../interfaces/PubSubMsg.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `pushNotification` | `Response` |
| `decoder`? | [`Decoder`](../enumerations/Decoder.md) |

#### Returns

`null` \| [`PubSubMsg`](../interfaces/PubSubMsg.md)

***

### objectEncoding()

> **objectEncoding**(`key`): `Promise`\<`null` \| `string`\>

Returns the internal encoding for the Valkey object stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The `key` of the object to get the internal encoding of. |

#### Returns

`Promise`\<`null` \| `string`\>

- If `key` exists, returns the internal encoding of the object stored at `key` as a string.
    Otherwise, returns `null`.

#### See

[https://valkey.io/commands/object-encoding/\|valkey.io](https://valkey.io/commands/object-encoding/|valkey.io) for more details.

#### Example

```typescript
const result = await client.objectEncoding("my_hash");
console.log(result); // Output: "listpack"
```

***

### objectFreq()

> **objectFreq**(`key`): `Promise`\<`null` \| `number`\>

Returns the logarithmic access frequency counter of a Valkey object stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The `key` of the object to get the logarithmic access frequency counter of. |

#### Returns

`Promise`\<`null` \| `number`\>

- If `key` exists, returns the logarithmic access frequency counter of the object
           stored at `key` as a `number`. Otherwise, returns `null`.

#### See

[https://valkey.io/commands/object-freq/\|valkey.io](https://valkey.io/commands/object-freq/|valkey.io) for more details.

#### Example

```typescript
const result = await client.objectFreq("my_hash");
console.log(result); // Output: 2 - The logarithmic access frequency counter of "my_hash".
```

***

### objectIdletime()

> **objectIdletime**(`key`): `Promise`\<`null` \| `number`\>

Returns the time in seconds since the last access to the value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the object to get the idle time of. |

#### Returns

`Promise`\<`null` \| `number`\>

If `key` exists, returns the idle time in seconds. Otherwise, returns `null`.

#### See

[https://valkey.io/commands/object-idletime/\|valkey.io](https://valkey.io/commands/object-idletime/|valkey.io) for more details.

#### Example

```typescript
const result = await client.objectIdletime("my_hash");
console.log(result); // Output: 13 - "my_hash" was last accessed 13 seconds ago.
```

***

### objectRefcount()

> **objectRefcount**(`key`): `Promise`\<`null` \| `number`\>

Returns the reference count of the object stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The `key` of the object to get the reference count of. |

#### Returns

`Promise`\<`null` \| `number`\>

If `key` exists, returns the reference count of the object stored at `key` as a `number`.
Otherwise, returns `null`.

#### See

[https://valkey.io/commands/object-refcount/\|valkey.io](https://valkey.io/commands/object-refcount/|valkey.io) for more details.

#### Example

```typescript
const result = await client.objectRefcount("my_hash");
console.log(result); // Output: 2 - "my_hash" has a reference count of 2.
```

***

### persist()

> **persist**(`key`): `Promise`\<`boolean`\>

Removes the existing timeout on `key`, turning the key from volatile (a key with an expire set) to
persistent (a key that will never expire as no timeout is associated).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to remove the existing timeout on. |

#### Returns

`Promise`\<`boolean`\>

`false` if `key` does not exist or does not have an associated timeout, `true` if the timeout has been removed.

#### See

[https://valkey.io/commands/persist/\|valkey.io](https://valkey.io/commands/persist/|valkey.io) for more details.

#### Example

```typescript
// Example usage of persist method to remove the timeout associated with a key
const result = await client.persist("my_key");
console.log(result); // Output: true - Indicates that the timeout associated with the key "my_key" was successfully removed.
```

***

### pexpire()

> **pexpire**(`key`, `milliseconds`, `options`?): `Promise`\<`boolean`\>

Sets a timeout on `key` in milliseconds. After the timeout has expired, the key will automatically be deleted.
If `key` already has an existing expire set, the time to live is updated to the new value.
If `milliseconds` is non-positive number, the key will be deleted rather than expired.
The timeout will only be cleared by commands that delete or overwrite the contents of `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to set timeout on it. |
| `milliseconds` | `number` | The timeout in milliseconds. |
| `options`? | \{ `expireOption`: [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md); \} | (Optional) Additional parameters: - (Optional) `expireOption`: the expire option - see [ExpireOptions](../../Commands/enumerations/ExpireOptions.md). |
| `options.expireOption`? | [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md) | - |

#### Returns

`Promise`\<`boolean`\>

`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
or operation skipped due to the provided arguments.

#### See

[https://valkey.io/commands/pexpire/\|valkey.io](https://valkey.io/commands/pexpire/|valkey.io) for details.

#### Example

```typescript
// Example usage of the pexpire method on a key with no previous expiry
const result = await client.pexpire("my_key", 60000, { expireOption: ExpireOptions.HasNoExpiry });
console.log(result); // Output: true - Indicates that a timeout of 60,000 milliseconds has been set for "my_key".
```

***

### pexpireAt()

> **pexpireAt**(`key`, `unixMilliseconds`, `options`?): `Promise`\<`number`\>

Sets a timeout on `key`. It takes an absolute Unix timestamp (milliseconds since January 1, 1970) instead of specifying the number of milliseconds.
A timestamp in the past will delete the key immediately. After the timeout has expired, the key will automatically be deleted.
If `key` already has an existing expire set, the time to live is updated to the new value.
The timeout will only be cleared by commands that delete or overwrite the contents of `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to set timeout on it. |
| `unixMilliseconds` | `number` | The timeout in an absolute Unix timestamp. |
| `options`? | \{ `expireOption`: [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md); \} | (Optional) Additional parameters: - (Optional) `expireOption`: the expire option - see [ExpireOptions](../../Commands/enumerations/ExpireOptions.md). |
| `options.expireOption`? | [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md) | - |

#### Returns

`Promise`\<`number`\>

`true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist,
or operation skipped due to the provided arguments.

#### See

[https://valkey.io/commands/pexpireat/\|valkey.io](https://valkey.io/commands/pexpireat/|valkey.io) for details.

#### Example

```typescript
// Example usage of the pexpireAt method on a key with no previous expiry
const result = await client.pexpireAt("my_key", 1672531200000, { expireOption: ExpireOptions.HasNoExpiry });
console.log(result); // Output: true - Indicates that the expiration time for "my_key" was successfully set.
```

***

### pexpiretime()

> **pexpiretime**(`key`): `Promise`\<`number`\>

Returns the absolute Unix timestamp (since January 1, 1970) at which the given `key` will expire, in milliseconds.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The `key` to determine the expiration value of. |

#### Returns

`Promise`\<`number`\>

The expiration Unix timestamp in seconds, `-2` if `key` does not exist or `-1` if `key` exists but has no associated expire.

#### See

[https://valkey.io/commands/pexpiretime/\|valkey.io](https://valkey.io/commands/pexpiretime/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

#### Example

```typescript
const result1 = client.pexpiretime("myKey");
console.log(result1); // Output: -2 - myKey doesn't exist.

const result2 = client.set(myKey, "value");
const result3 = client.pexpireTime(myKey);
console.log(result2); // Output: -1 - myKey has no associated expiration.

client.expire(myKey, 60);
const result3 = client.pexpireTime(myKey);
console.log(result3); // Output: 123456789 - the Unix timestamp (in milliseconds) when "myKey" will expire.
```

***

### pfadd()

> **pfadd**(`key`, `elements`): `Promise`\<`number`\>

Adds all elements to the HyperLogLog data structure stored at the specified `key`.
Creates a new structure if the `key` does not exist.
When no elements are provided, and `key` exists and is a HyperLogLog, then no operation is performed.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the HyperLogLog data structure to add elements into. |
| `elements` | [`GlideString`](../type-aliases/GlideString.md)[] | An array of members to add to the HyperLogLog stored at `key`. |

#### Returns

`Promise`\<`number`\>

- If the HyperLogLog is newly created, or if the HyperLogLog approximated cardinality is
    altered, then returns `1`. Otherwise, returns `0`.

#### See

[https://valkey.io/commands/pfadd/\|valkey.io](https://valkey.io/commands/pfadd/|valkey.io) for more details.

#### Example

```typescript
const result = await client.pfadd("hll_1", ["a", "b", "c"]);
console.log(result); // Output: 1 - Indicates that a data structure was created or modified
const result = await client.pfadd("hll_2", []);
console.log(result); // Output: 1 - Indicates that a new empty data structure was created
```

***

### pfcount()

> **pfcount**(`keys`): `Promise`\<`number`\>

Estimates the cardinality of the data stored in a HyperLogLog structure for a single key or
calculates the combined cardinality of multiple keys by merging their HyperLogLogs temporarily.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the HyperLogLog data structures to be analyzed. |

#### Returns

`Promise`\<`number`\>

- The approximated cardinality of given HyperLogLog data structures.
    The cardinality of a key that does not exist is `0`.

#### See

[https://valkey.io/commands/pfcount/\|valkey.io](https://valkey.io/commands/pfcount/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
const result = await client.pfcount(["hll_1", "hll_2"]);
console.log(result); // Output: 4 - The approximated cardinality of the union of "hll_1" and "hll_2"
```

***

### pfmerge()

> **pfmerge**(`destination`, `sourceKeys`): `Promise`\<`"OK"`\>

Merges multiple HyperLogLog values into a unique value. If the destination variable exists, it is
treated as one of the source HyperLogLog data sets, otherwise a new HyperLogLog is created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key of the destination HyperLogLog where the merged data sets will be stored. |
| `sourceKeys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the HyperLogLog structures to be merged. |

#### Returns

`Promise`\<`"OK"`\>

A simple "OK" response.

#### See

[https://valkey.io/commands/pfmerge/\|valkey.io](https://valkey.io/commands/pfmerge/|valkey.io) for more details.

#### Remarks

When in Cluster mode, all keys in `sourceKeys` and `destination` must map to the same hash slot.

#### Example

```typescript
await client.pfadd("hll1", ["a", "b"]);
await client.pfadd("hll2", ["b", "c"]);
const result = await client.pfmerge("new_hll", ["hll1", "hll2"]);
console.log(result); // Output: OK  - The value of "hll1" merged with "hll2" was stored in "new_hll".
const count = await client.pfcount(["new_hll"]);
console.log(count); // Output: 3  - The approximated cardinality of "new_hll" is 3.
```

***

### processPush()

> **processPush**(`response`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `response` | `Response` |

#### Returns

`void`

***

### processResponse()

> **processResponse**(`message`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `Response` |

#### Returns

`void`

***

### processResultWithSetCommands()

> `protected` **processResultWithSetCommands**(`result`, `setCommandsIndexes`): `null` \| [`GlideReturnType`](../type-aliases/GlideReturnType.md)[]

**`Internal`**

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `result` | `null` \| [`GlideReturnType`](../type-aliases/GlideReturnType.md)[] |
| `setCommandsIndexes` | `number`[] |

#### Returns

`null` \| [`GlideReturnType`](../type-aliases/GlideReturnType.md)[]

***

### pttl()

> **pttl**(`key`): `Promise`\<`number`\>

Returns the remaining time to live of `key` that has a timeout, in milliseconds.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to return its timeout. |

#### Returns

`Promise`\<`number`\>

TTL in milliseconds, `-2` if `key` does not exist, `-1` if `key` exists but has no associated expire.

#### See

[https://valkey.io/commands/pttl/\|valkey.io](https://valkey.io/commands/pttl/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of pttl method with an existing key
const result = await client.pttl("my_key");
console.log(result); // Output: 5000 - Indicates that the key "my_key" has a remaining time to live of 5000 milliseconds.
```

```typescript
// Example usage of pttl method with a non-existing key
const result = await client.pttl("non_existing_key");
console.log(result); // Output: -2 - Indicates that the key "non_existing_key" does not exist.
```

```typescript
// Example usage of pttl method with an exisiting key that has no associated expire.
const result = await client.pttl("key");
console.log(result); // Output: -1 - Indicates that the key "key" has no associated expire.
```

***

### pubsubChannels()

> **pubsubChannels**(`options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Lists the currently active channels.
The command is routed to all nodes, and aggregates the response to a single array.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `pattern`: A glob-style pattern to match active channels. If not provided, all active channels are returned. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

A list of currently active channels matching the given pattern.
         If no pattern is specified, all active channels are returned.

#### See

[https://valkey.io/commands/pubsub-channels/\|valkey.io](https://valkey.io/commands/pubsub-channels/|valkey.io) for more details.

#### Example

```typescript
const channels = await client.pubsubChannels();
console.log(channels); // Output: ["channel1", "channel2"]

const newsChannels = await client.pubsubChannels("news.*");
console.log(newsChannels); // Output: ["news.sports", "news.weather"]
```

***

### pubsubNumPat()

> **pubsubNumPat**(): `Promise`\<`number`\>

Returns the number of unique patterns that are subscribed to by clients.

Note: This is the total number of unique patterns all the clients are subscribed to,
not the count of clients subscribed to patterns.
The command is routed to all nodes, and aggregates the response to the sum of all pattern subscriptions.

#### Returns

`Promise`\<`number`\>

The number of unique patterns.

#### See

[https://valkey.io/commands/pubsub-numpat/\|valkey.io](https://valkey.io/commands/pubsub-numpat/|valkey.io) for more details.

#### Example

```typescript
const patternCount = await client.pubsubNumpat();
console.log(patternCount); // Output: 3
```

***

### pubsubNumSub()

> **pubsubNumSub**(`channels`, `options`?): `Promise`\<`object`[]\>

Returns the number of subscribers (exclusive of clients subscribed to patterns) for the specified channels.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `channels` | [`GlideString`](../type-aliases/GlideString.md)[] | The list of channels to query for the number of subscribers. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`object`[]\>

A list of the channel names and their numbers of subscribers.

#### See

[https://valkey.io/commands/pubsub-numsub/\|valkey.io](https://valkey.io/commands/pubsub-numsub/|valkey.io) for more details.

#### Remarks

When in cluster mode, the command is routed to all nodes, and aggregates the response into a single list.

#### Example

```typescript
const result1 = await client.pubsubNumsub(["channel1", "channel2"]);
console.log(result1); // Output:
// [{ channel: "channel1", numSub: 3}, { channel: "channel2", numSub: 5 }]

const result2 = await client.pubsubNumsub([]);
console.log(result2); // Output: []
```

***

### rename()

> **rename**(`key`, `newKey`): `Promise`\<`"OK"`\>

Renames `key` to `newkey`.
If `newkey` already exists it is overwritten.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to rename. |
| `newKey` | [`GlideString`](../type-aliases/GlideString.md) | The new name of the key. |

#### Returns

`Promise`\<`"OK"`\>

- If the `key` was successfully renamed, return "OK". If `key` does not exist, an error is thrown.

#### See

[https://valkey.io/commands/rename/\|valkey.io](https://valkey.io/commands/rename/|valkey.io) for more details.

#### Remarks

When in cluster mode, `key` and `newKey` must map to the same hash slot.

#### Example

```typescript
// Example usage of rename method to rename a key
await client.set("old_key", "value");
const result = await client.rename("old_key", "new_key");
console.log(result); // Output: OK - Indicates successful renaming of the key "old_key" to "new_key".
```

***

### renamenx()

> **renamenx**(`key`, `newKey`): `Promise`\<`boolean`\>

Renames `key` to `newkey` if `newkey` does not yet exist.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to rename. |
| `newKey` | [`GlideString`](../type-aliases/GlideString.md) | The new name of the key. |

#### Returns

`Promise`\<`boolean`\>

- If the `key` was successfully renamed, returns `true`. Otherwise, returns `false`.
If `key` does not exist, an error is thrown.

#### See

[https://valkey.io/commands/renamenx/\|valkey.io](https://valkey.io/commands/renamenx/|valkey.io) for more details.

#### Remarks

When in cluster mode, `key` and `newKey` must map to the same hash slot.

#### Example

```typescript
// Example usage of renamenx method to rename a key
await client.set("old_key", "value");
const result = await client.renamenx("old_key", "new_key");
console.log(result); // Output: true - Indicates successful renaming of the key "old_key" to "new_key".
```

***

### restore()

> **restore**(`key`, `ttl`, `value`, `options`?): `Promise`\<`"OK"`\>

Create a `key` associated with a `value` that is obtained by deserializing the provided
serialized `value` (obtained via [dump](BaseClient.md#dump)).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The `key` to create. |
| `ttl` | `number` | The expiry time (in milliseconds). If `0`, the `key` will persist. |
| `value` | `Buffer` | The serialized value to deserialize and assign to `key`. |
| `options`? | [`RestoreOptions`](../../Commands/interfaces/RestoreOptions.md) | (Optional) Restore options [RestoreOptions](../../Commands/interfaces/RestoreOptions.md). |

#### Returns

`Promise`\<`"OK"`\>

Return "OK" if the `key` was successfully restored with a `value`.

#### See

[https://valkey.io/commands/restore/\|valkey.io](https://valkey.io/commands/restore/|valkey.io) for details.

#### Remarks

`options.idletime` and `options.frequency` modifiers cannot be set at the same time.

#### Examples

```typescript
const result = await client.restore("myKey", 0, value);
console.log(result); // Output: "OK"
```

```typescript
const result = await client.restore("myKey", 1000, value, {replace: true, absttl: true});
console.log(result); // Output: "OK"
```

```typescript
const result = await client.restore("myKey", 0, value, {replace: true, idletime: 10});
console.log(result); // Output: "OK"
```

```typescript
const result = await client.restore("myKey", 0, value, {replace: true, frequency: 10});
console.log(result); // Output: "OK"
```

***

### rpop()

> **rpop**(`key`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Removes and returns the last elements of the list stored at `key`.
The command pops a single element from the end of the list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

The value of the last element.
If `key` does not exist null will be returned.

#### See

[https://valkey.io/commands/rpop/\|valkey.io](https://valkey.io/commands/rpop/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the rpop method with an existing list
const result = await client.rpop("my_list");
console.log(result); // Output: 'value1'
```

```typescript
// Example usage of the rpop method with a non-existing list
const result = await client.rpop("non_exiting_key");
console.log(result); // Output: null
```

***

### rpopCount()

> **rpopCount**(`key`, `count`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)[]\>

Removes and returns up to `count` elements from the list stored at `key`, depending on the list's length.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `count` | `number` | The count of the elements to pop from the list. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)[]\>

A list of popped elements will be returned depending on the list's length.
If `key` does not exist null will be returned.

#### See

[https://valkey.io/commands/rpop/\|valkey.io](https://valkey.io/commands/rpop/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the rpopCount method with an existing list
const result = await client.rpopCount("my_list", 2);
console.log(result); // Output: ["value1", "value2"]
```

```typescript
// Example usage of the rpopCount method with a non-existing list
const result = await client.rpopCount("non_exiting_key", 7);
console.log(result); // Output: null
```

***

### rpush()

> **rpush**(`key`, `elements`): `Promise`\<`number`\>

Inserts all the specified values at the tail of the list stored at `key`.
`elements` are inserted one after the other to the tail of the list, from the leftmost element to the rightmost element.
If `key` does not exist, it is created as empty list before performing the push operations.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `elements` | [`GlideString`](../type-aliases/GlideString.md)[] | The elements to insert at the tail of the list stored at `key`. |

#### Returns

`Promise`\<`number`\>

the length of the list after the push operations.

#### See

[https://valkey.io/commands/rpush/\|valkey.io](https://valkey.io/commands/rpush/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the rpush method with an existing list
const result = await client.rpush("my_list", ["value2", "value3"]);
console.log(result); // Output: 3 - Indicates that the new length of the list is 3 after the push operation.
```

```typescript
// Example usage of the rpush method with a non-existing list
const result = await client.rpush("nonexistent_list", ["new_value"]);
console.log(result); // Output: 1
```

***

### rpushx()

> **rpushx**(`key`, `elements`): `Promise`\<`number`\>

Inserts specified values at the tail of the `list`, only if `key` already
exists and holds a list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list. |
| `elements` | [`GlideString`](../type-aliases/GlideString.md)[] | The elements to insert at the tail of the list stored at `key`. |

#### Returns

`Promise`\<`number`\>

The length of the list after the push operation.

#### See

[https://valkey.io/commands/rpushx/\|valkey.io](https://valkey.io/commands/rpushx/|valkey.io) for details.

#### Example

```typescript
const result = await client.rpushx("my_list", ["value1", "value2"]);
console.log(result);  // Output: 2 - Indicates that the list has two elements.
```

***

### sadd()

> **sadd**(`key`, `members`): `Promise`\<`number`\>

Adds the specified members to the set stored at `key`. Specified members that are already a member of this set are ignored.
If `key` does not exist, a new set is created before adding `members`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to store the members to its set. |
| `members` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of members to add to the set stored at `key`. |

#### Returns

`Promise`\<`number`\>

The number of members that were added to the set, not including all the members already present in the set.

#### See

[https://valkey.io/commands/sadd/\|valkey.io](https://valkey.io/commands/sadd/|valkey.io) for details.

#### Example

```typescript
// Example usage of the sadd method with an existing set
const result = await client.sadd("my_set", ["member1", "member2"]);
console.log(result); // Output: 2
```

***

### scard()

> **scard**(`key`): `Promise`\<`number`\>

Returns the set cardinality (number of elements) of the set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to return the number of its members. |

#### Returns

`Promise`\<`number`\>

The cardinality (number of elements) of the set, or 0 if key does not exist.

#### See

[https://valkey.io/commands/scard/\|valkey.io](https://valkey.io/commands/scard/|valkey.io) for details.

#### Example

```typescript
// Example usage of the scard method
const result = await client.scard("my_set");
console.log(result); // Output: 3
```

***

### scriptShow()

> **scriptShow**(`sha1`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)\>

Returns the original source code of a script in the script cache.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `sha1` | [`GlideString`](../type-aliases/GlideString.md) | The SHA1 digest of the script. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)\>

The original source code of the script, if present in the cache.
If the script is not found in the cache, an error is thrown.

#### See

[https://valkey.io/commands/script-show\|valkey.io](https://valkey.io/commands/script-show|valkey.io) for more details.

#### Remarks

Since Valkey version 8.0.0.

#### Example

```typescript
const scriptHash = script.getHash();
const scriptSource = await client.scriptShow(scriptHash);
console.log(scriptSource); // Output: "return { KEYS[1], ARGV[1] }"
```

***

### sdiff()

> **sdiff**(`keys`, `options`?): `Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

Computes the difference between the first set and all the successive sets in `keys`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sets to diff. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

A `Set` of elements representing the difference between the sets.
If a key in `keys` does not exist, it is treated as an empty set.

#### See

[https://valkey.io/commands/sdiff/\|valkey.io](https://valkey.io/commands/sdiff/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
await client.sadd("set1", ["member1", "member2"]);
await client.sadd("set2", ["member1"]);
const result = await client.sdiff(["set1", "set2"]);
console.log(result); // Output: Set {"member1"} - "member2" is in "set1" but not "set2"
```

***

### sdiffstore()

> **sdiffstore**(`destination`, `keys`): `Promise`\<`number`\>

Stores the difference between the first set and all the successive sets in `keys` into a new set at `destination`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key of the destination set. |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sets to diff. |

#### Returns

`Promise`\<`number`\>

The number of elements in the resulting set.

#### See

[https://valkey.io/commands/sdiffstore/\|valkey.io](https://valkey.io/commands/sdiffstore/|valkey.io) for more details.

#### Remarks

When in cluster mode, `destination` and all `keys` must map to the same hash slot.

#### Example

```typescript
await client.sadd("set1", ["member1", "member2"]);
await client.sadd("set2", ["member1"]);
const result = await client.sdiffstore("set3", ["set1", "set2"]);
console.log(result); // Output: 1 - One member was stored in "set3", and that member is the diff between "set1" and "set2".
```

***

### set()

> **set**(`key`, `value`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Set the given key with the given value. Return value is dependent on the passed options.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to store. |
| `value` | [`GlideString`](../type-aliases/GlideString.md) | The value to store with the given key. |
| `options`? | SetOptions & DecoderOption | (Optional) See [SetOptions](../../Commands/type-aliases/SetOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

- If the value is successfully set, return OK.
If `conditional` in `options` is not set, the value will be set regardless of prior value existence.
If value isn't set because of `onlyIfExists` or `onlyIfDoesNotExist` or `onlyIfEqual` conditions, return `null`.
If `returnOldValue` is set, return the old value as a string.

#### See

[https://valkey.io/commands/set/\|valkey.io](https://valkey.io/commands/set/|valkey.io) for details.

#### Example

```typescript
// Example usage of set method to set a key-value pair
const result = await client.set("my_key", "my_value");
console.log(result); // Output: 'OK'

// Example usage of set method with conditional options and expiration
const result2 = await client.set("key", "new_value", {conditionalSet: "onlyIfExists", expiry: { type: TimeUnit.Seconds, count: 5 }});
console.log(result2); // Output: 'OK' - Set "new_value" to "key" only if "key" already exists, and set the key expiration to 5 seconds.

// Example usage of set method with conditional options and returning old value
const result3 = await client.set("key", "value", {conditionalSet: "onlyIfDoesNotExist", returnOldValue: true});
console.log(result3); // Output: 'new_value' - Returns the old value of "key".

// Example usage of get method to retrieve the value of a key
const result4 = await client.get("key");
console.log(result4); // Output: 'new_value' - Value wasn't modified back to being "value" because of "NX" flag.

// Example usage of set method with conditional option IFEQ
await client.set("key", "value we will compare to");
const result5 = await client.set("key", "new_value", {conditionalSet: "onlyIfEqual", comparisonValue: "value we will compare to"});
console.log(result5); // Output: 'OK' - Set "new_value" to "key" only if comparisonValue is equal to the current value of "key".
const result6 = await client.set("key", "another_new_value", {conditionalSet: "onlyIfEqual", comparisonValue: "value we will compare to"});
console.log(result6); // Output: `null` - Value wasn't set because the comparisonValue is not equal to the current value of "key". Value of "key" remains "new_value".
```

***

### setbit()

> **setbit**(`key`, `offset`, `value`): `Promise`\<`number`\>

Sets or clears the bit at `offset` in the string value stored at `key`. The `offset` is a zero-based index, with
`0` being the first element of the list, `1` being the next element, and so on. The `offset` must be less than
`2^32` and greater than or equal to `0`. If a key is non-existent then the bit at `offset` is set to `value` and
the preceding bits are set to `0`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the string. |
| `offset` | `number` | The index of the bit to be set. |
| `value` | `number` | The bit value to set at `offset`. The value must be `0` or `1`. |

#### Returns

`Promise`\<`number`\>

The bit value that was previously stored at `offset`.

#### See

[https://valkey.io/commands/setbit/\|valkey.io](https://valkey.io/commands/setbit/|valkey.io) for more details.

#### Example

```typescript
const result = await client.setbit("key", 1, 1);
console.log(result); // Output: 0 - The second bit value was 0 before setting to 1.
```

***

### setrange()

> **setrange**(`key`, `offset`, `value`): `Promise`\<`number`\>

Overwrites part of the string stored at `key`, starting at the specified byte `offset`,
for the entire length of `value`. If the `offset` is larger than the current length of the string at `key`,
the string is padded with zero bytes to make `offset` fit. Creates the `key` if it doesn't exist.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the string to update. |
| `offset` | `number` | The byte position in the string where `value` should be written. |
| `value` | [`GlideString`](../type-aliases/GlideString.md) | The string written with `offset`. |

#### Returns

`Promise`\<`number`\>

The length of the string stored at `key` after it was modified.

#### See

[https://valkey.io/commands/setrange/\|valkey.io](https://valkey.io/commands/setrange/|valkey.io) for more details.

#### Example

```typescript
const len = await client.setrange("key", 6, "GLIDE");
console.log(len); // Output: 11 - New key was created with length of 11 symbols
const value = await client.get("key");
console.log(result); // Output: "\0\0\0\0\0\0GLIDE" - The string was padded with zero bytes
```

***

### sinter()

> **sinter**(`keys`, `options`?): `Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

Gets the intersection of all the given sets.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The `keys` of the sets to get the intersection. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

- A set of members which are present in all given sets.
If one or more sets do not exist, an empty set will be returned.

#### See

[https://valkey.io/docs/latest/commands/sinter/\|valkey.io](https://valkey.io/docs/latest/commands/sinter/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Examples

```typescript
// Example usage of sinter method when member exists
const result = await client.sinter(["my_set1", "my_set2"]);
console.log(result); // Output: Set {'member2'} - Indicates that sets have one common member
```

```typescript
// Example usage of sinter method with non-existing key
const result = await client.sinter(["my_set", "non_existing_key"]);
console.log(result); // Output: Set {} - An empty set is returned since the key does not exist.
```

***

### sintercard()

> **sintercard**(`keys`, `options`?): `Promise`\<`number`\>

Gets the cardinality of the intersection of all the given sets.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sets. |
| `options`? | \{ `limit`: `number`; \} | (Optional) Additional parameters: - (Optional) `limit`: the limit for the intersection cardinality value. If not specified, or set to `0`, no limit is used. |
| `options.limit`? | `number` | - |

#### Returns

`Promise`\<`number`\>

The cardinality of the intersection result. If one or more sets do not exist, `0` is returned.

#### See

[https://valkey.io/commands/sintercard/\|valkey.io](https://valkey.io/commands/sintercard/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
await client.sadd("set1", ["a", "b", "c"]);
await client.sadd("set2", ["b", "c", "d"]);
const result1 = await client.sintercard(["set1", "set2"]);
console.log(result1); // Output: 2 - The intersection of "set1" and "set2" contains 2 elements: "b" and "c".

const result2 = await client.sintercard(["set1", "set2"], { limit: 1 });
console.log(result2); // Output: 1 - The computation stops early as the intersection cardinality reaches the limit of 1.
```

***

### sinterstore()

> **sinterstore**(`destination`, `keys`): `Promise`\<`number`\>

Stores the members of the intersection of all given sets specified by `keys` into a new set at `destination`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key of the destination set. |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys from which to retrieve the set members. |

#### Returns

`Promise`\<`number`\>

The number of elements in the resulting set.

#### See

[https://valkey.io/commands/sinterstore/\|valkey.io](https://valkey.io/commands/sinterstore/|valkey.io) for more details.

#### Remarks

When in cluster mode, `destination` and all `keys` must map to the same hash slot.

#### Example

```typescript
const result = await client.sinterstore("my_set", ["set1", "set2"]);
console.log(result); // Output: 2 - Two elements were stored at "my_set", and those elements are the intersection of "set1" and "set2".
```

***

### sismember()

> **sismember**(`key`, `member`): `Promise`\<`boolean`\>

Returns if `member` is a member of the set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the set. |
| `member` | [`GlideString`](../type-aliases/GlideString.md) | The member to check for existence in the set. |

#### Returns

`Promise`\<`boolean`\>

`true` if the member exists in the set, `false` otherwise.
If `key` doesn't exist, it is treated as an empty set and the command returns `false`.

#### See

[https://valkey.io/commands/sismember/\|valkey.io](https://valkey.io/commands/sismember/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of the sismember method when member exists
const result = await client.sismember("my_set", "member1");
console.log(result); // Output: true - Indicates that "member1" exists in the set "my_set".
```

```typescript
// Example usage of the sismember method when member does not exist
const result = await client.sismember("my_set", "non_existing_member");
console.log(result); // Output: false - Indicates that "non_existing_member" does not exist in the set "my_set".
```

***

### smembers()

> **smembers**(`key`, `options`?): `Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

Returns all the members of the set value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to return its members. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

A `Set` containing all members of the set.
If `key` does not exist, it is treated as an empty set and this command returns an empty `Set`.

#### See

[https://valkey.io/commands/smembers/\|valkey.io](https://valkey.io/commands/smembers/|valkey.io) for details.

#### Example

```typescript
// Example usage of the smembers method
const result = await client.smembers("my_set");
console.log(result); // Output: Set {'member1', 'member2', 'member3'}
```

***

### smismember()

> **smismember**(`key`, `members`): `Promise`\<`boolean`[]\>

Checks whether each member is contained in the members of the set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the set to check. |
| `members` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of members to check for existence in the set. |

#### Returns

`Promise`\<`boolean`[]\>

An `array` of `boolean` values, each indicating if the respective member exists in the set.

#### See

[https://valkey.io/commands/smismember/\|valkey.io](https://valkey.io/commands/smismember/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
await client.sadd("set1", ["a", "b", "c"]);
const result = await client.smismember("set1", ["b", "c", "d"]);
console.log(result); // Output: [true, true, false] - "b" and "c" are members of "set1", but "d" is not.
```

***

### smove()

> **smove**(`source`, `destination`, `member`): `Promise`\<`boolean`\>

Moves `member` from the set at `source` to the set at `destination`, removing it from the source set.
Creates a new destination set if needed. The operation is atomic.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `source` | [`GlideString`](../type-aliases/GlideString.md) | The key of the set to remove the element from. |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key of the set to add the element to. |
| `member` | [`GlideString`](../type-aliases/GlideString.md) | The set element to move. |

#### Returns

`Promise`\<`boolean`\>

`true` on success, or `false` if the `source` set does not exist or the element is not a member of the source set.

#### See

[https://valkey.io/commands/smove/\|valkey.io](https://valkey.io/commands/smove/|valkey.io) for more details.

#### Remarks

When in cluster mode, `source` and `destination` must map to the same hash slot.

#### Example

```typescript
const result = await client.smove("set1", "set2", "member1");
console.log(result); // Output: true - "member1" was moved from "set1" to "set2".
```

***

### sort()

> **sort**(`key`, `options`?): `Promise`\<(`null` \| [`GlideString`](../type-aliases/GlideString.md))[]\>

Sorts the elements in the list, set, or sorted set at `key` and returns the result.

The `sort` command can be used to sort elements based on different criteria and
apply transformations on sorted elements.

To store the result into a new key, see [sortStore](BaseClient.md#sortstore).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list, set, or sorted set to be sorted. |
| `options`? | [`SortOptions`](../../Commands/interfaces/SortOptions.md) & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) The [SortOptions](../../Commands/interfaces/SortOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<(`null` \| [`GlideString`](../type-aliases/GlideString.md))[]\>

An `Array` of sorted elements.

#### See

[https://valkey.io/commands/sort/\|valkey.io](https://valkey.io/commands/sort/|valkey.io) for more details.

#### Remarks

When in cluster mode, both `key` and the patterns specified in [SortOptions.byPattern](../../Commands/interfaces/SortOptions.md#bypattern)
and [SortOptions.getPatterns](../../Commands/interfaces/SortOptions.md#getpatterns) must map to the same hash slot. The use of [SortOptions.byPattern](../../Commands/interfaces/SortOptions.md#bypattern)
and [SortOptions.getPatterns](../../Commands/interfaces/SortOptions.md#getpatterns) in cluster mode is supported since Valkey version 8.0.

#### Example

```typescript
await client.hset("user:1", new Map([["name", "Alice"], ["age", "30"]]));
await client.hset("user:2", new Map([["name", "Bob"], ["age", "25"]]));
await client.lpush("user_ids", ["2", "1"]);
const result = await client.sort("user_ids", { byPattern: "user:*->age", getPattern: ["user:*->name"] });
console.log(result); // Output: [ 'Bob', 'Alice' ] - Returns a list of the names sorted by age
```

***

### sortReadOnly()

> **sortReadOnly**(`key`, `options`?): `Promise`\<(`null` \| [`GlideString`](../type-aliases/GlideString.md))[]\>

Sorts the elements in the list, set, or sorted set at `key` and returns the result.

The `sortReadOnly` command can be used to sort elements based on different criteria and
apply transformations on sorted elements.

This command is routed depending on the client's [ReadFrom](../type-aliases/ReadFrom.md) strategy.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list, set, or sorted set to be sorted. |
| `options`? | [`SortOptions`](../../Commands/interfaces/SortOptions.md) & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) The [SortOptions](../../Commands/interfaces/SortOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<(`null` \| [`GlideString`](../type-aliases/GlideString.md))[]\>

An `Array` of sorted elements

#### See

[https://valkey.io/commands/sort/\|valkey.io](https://valkey.io/commands/sort/|valkey.io) for more details.

#### Remarks

Since Valkey version 7.0.0.

#### Example

```typescript
await client.hset("user:1", new Map([["name", "Alice"], ["age", "30"]]));
await client.hset("user:2", new Map([["name", "Bob"], ["age", "25"]]));
await client.lpush("user_ids", ["2", "1"]);
const result = await client.sortReadOnly("user_ids", { byPattern: "user:*->age", getPattern: ["user:*->name"] });
console.log(result); // Output: [ 'Bob', 'Alice' ] - Returns a list of the names sorted by age
```

***

### sortStore()

> **sortStore**(`key`, `destination`, `options`?): `Promise`\<`number`\>

Sorts the elements in the list, set, or sorted set at `key` and stores the result in
`destination`.

The `sort` command can be used to sort elements based on different criteria and
apply transformations on sorted elements, and store the result in a new key.

To get the sort result without storing it into a key, see [sort](BaseClient.md#sort) or [sortReadOnly](BaseClient.md#sortreadonly).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the list, set, or sorted set to be sorted. |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key where the sorted result will be stored. |
| `options`? | [`SortOptions`](../../Commands/interfaces/SortOptions.md) | (Optional) The [SortOptions](../../Commands/interfaces/SortOptions.md). |

#### Returns

`Promise`\<`number`\>

The number of elements in the sorted key stored at `destination`.

#### See

[https://valkey.io/commands/sort\|valkey.io](https://valkey.io/commands/sort|valkey.io) for more details.

#### Remarks

When in cluster mode, `key`, `destination` and the patterns specified in [SortOptions.byPattern](../../Commands/interfaces/SortOptions.md#bypattern)
and [SortOptions.getPatterns](../../Commands/interfaces/SortOptions.md#getpatterns) must map to the same hash slot. The use of [SortOptions.byPattern](../../Commands/interfaces/SortOptions.md#bypattern)
and [SortOptions.getPatterns](../../Commands/interfaces/SortOptions.md#getpatterns) in cluster mode is supported since Valkey version 8.0.

#### Example

```typescript
await client.hset("user:1", new Map([["name", "Alice"], ["age", "30"]]));
await client.hset("user:2", new Map([["name", "Bob"], ["age", "25"]]));
await client.lpush("user_ids", ["2", "1"]);
const sortedElements = await client.sortStore("user_ids", "sortedList", { byPattern: "user:*->age", getPattern: ["user:*->name"] });
console.log(sortedElements); // Output: 2 - number of elements sorted and stored
console.log(await client.lrange("sortedList", 0, -1)); // Output: [ 'Bob', 'Alice' ] - Returns a list of the names sorted by age stored in `sortedList`
```

***

### spop()

> **spop**(`key`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Removes and returns one random member from the set value store at `key`.
To pop multiple members, see [spopCount](BaseClient.md#spopcount).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the set. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

the value of the popped member.
If `key` does not exist, null will be returned.

#### See

[https://valkey.io/commands/spop/\|valkey.io](https://valkey.io/commands/spop/|valkey.io) for details.

#### Examples

```typescript
// Example usage of spop method to remove and return a random member from a set
const result = await client.spop("my_set");
console.log(result); // Output: 'member1' - Removes and returns a random member from the set "my_set".
```

```typescript
// Example usage of spop method with non-existing key
const result = await client.spop("non_existing_key");
console.log(result); // Output: null
```

***

### spopCount()

> **spopCount**(`key`, `count`, `options`?): `Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

Removes and returns up to `count` random members from the set value store at `key`, depending on the set's length.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the set. |
| `count` | `number` | The count of the elements to pop from the set. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

A `Set` containing the popped elements, depending on the set's length.
If `key` does not exist, an empty `Set` will be returned.

#### See

[https://valkey.io/commands/spop/\|valkey.io](https://valkey.io/commands/spop/|valkey.io) for details.

#### Examples

```typescript
// Example usage of spopCount method to remove and return multiple random members from a set
const result = await client.spopCount("my_set", 2);
console.log(result); // Output: Set {'member2', 'member3'} - Removes and returns 2 random members from the set "my_set".
```

```typescript
// Example usage of spopCount method with non-existing key
const result = await client.spopCount("non_existing_key");
console.log(result); // Output: Set {} - An empty set is returned since the key does not exist.
```

***

### srandmember()

> **srandmember**(`key`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Returns a random element from the set value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key from which to retrieve the set member. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

A random element from the set, or null if `key` does not exist.

#### See

[https://valkey.io/commands/srandmember/\|valkey.io](https://valkey.io/commands/srandmember/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of srandmember method to return a random member from a set
const result = await client.srandmember("my_set");
console.log(result); // Output: 'member1' - A random member of "my_set".
```

```typescript
// Example usage of srandmember method with non-existing key
const result = await client.srandmember("non_existing_set");
console.log(result); // Output: null
```

***

### srandmemberCount()

> **srandmemberCount**(`key`, `count`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Returns one or more random elements from the set value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `count` | `number` | The number of members to return. If `count` is positive, returns unique members. If `count` is negative, allows for duplicates members. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

a list of members from the set. If the set does not exist or is empty, an empty list will be returned.

#### See

[https://valkey.io/commands/srandmember/\|valkey.io](https://valkey.io/commands/srandmember/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of srandmemberCount method to return multiple random members from a set
const result = await client.srandmemberCount("my_set", -3);
console.log(result); // Output: ['member1', 'member1', 'member2'] - Random members of "my_set".
```

```typescript
// Example usage of srandmemberCount method with non-existing key
const result = await client.srandmemberCount("non_existing_set", 3);
console.log(result); // Output: [] - An empty list since the key does not exist.
```

***

### srem()

> **srem**(`key`, `members`): `Promise`\<`number`\>

Removes the specified members from the set stored at `key`. Specified members that are not a member of this set are ignored.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to remove the members from its set. |
| `members` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of members to remove from the set stored at `key`. |

#### Returns

`Promise`\<`number`\>

The number of members that were removed from the set, not including non existing members.
If `key` does not exist, it is treated as an empty set and this command returns 0.

#### See

[https://valkey.io/commands/srem/\|valkey.io](https://valkey.io/commands/srem/|valkey.io) for details.

#### Example

```typescript
// Example usage of the srem method
const result = await client.srem("my_set", ["member1", "member2"]);
console.log(result); // Output: 2
```

***

### sscan()

> **sscan**(`key`, `cursor`, `options`?): `Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)[]\]\>

Iterates incrementally over a set.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the set. |
| `cursor` | [`GlideString`](../type-aliases/GlideString.md) | The cursor that points to the next iteration of results. A value of `"0"` indicates the start of the search. |
| `options`? | [`BaseScanOptions`](../../Commands/interfaces/BaseScanOptions.md) & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [BaseScanOptions](../../Commands/interfaces/BaseScanOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)[]\]\>

An array of the cursor and the subset of the set held by `key`. The first element is always the `cursor` and for the next iteration of results.
The `cursor` will be `"0"` on the last iteration of the set. The second element is always an array of the subset of the set held in `key`.

#### See

[https://valkey.io/commands/sscan](https://valkey.io/commands/sscan) for details.

#### Example

```typescript
// Assume key contains a set with 200 members
let newCursor = "0";
let result = [];

do {
     result = await client.sscan(key1, newCursor, {
     match: "*",
     count: 5,
});
     newCursor = result[0];
     console.log("Cursor: ", newCursor);
     console.log("Members: ", result[1]);
} while (newCursor !== "0");

// The output of the code above is something similar to:
// Cursor:  8, Match: "f*"
// Members:  ['field', 'fur', 'fun', 'fame']
// Cursor:  20, Count: 3
// Members:  ['1', '2', '3', '4', '5', '6']
// Cursor:  0
// Members:  ['1', '2', '3', '4', '5', '6']
```

***

### strlen()

> **strlen**(`key`): `Promise`\<`number`\>

Returns the length of the string value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to check its length. |

#### Returns

`Promise`\<`number`\>

The length of the string value stored at key
If `key` does not exist, it is treated as an empty string, and the command returns `0`.

#### See

[https://valkey.io/commands/strlen/\|valkey.io](https://valkey.io/commands/strlen/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of strlen method with an existing key
await client.set("key", "GLIDE");
const len1 = await client.strlen("key");
console.log(len1); // Output: 5
```

```typescript
// Example usage of strlen method with a non-existing key
const len2 = await client.strlen("non_existing_key");
console.log(len2); // Output: 0
```

***

### sunion()

> **sunion**(`keys`, `options`?): `Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

Gets the union of all the given sets.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sets. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`Set`\<[`GlideString`](../type-aliases/GlideString.md)\>\>

A `Set` of members which are present in at least one of the given sets.
If none of the sets exist, an empty `Set` will be returned.

#### See

[https://valkey.io/commands/sunion/\|valkey.io](https://valkey.io/commands/sunion/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
await client.sadd("my_set1", ["member1", "member2"]);
await client.sadd("my_set2", ["member2", "member3"]);
const result1 = await client.sunion(["my_set1", "my_set2"]);
console.log(result1); // Output: Set {'member1', 'member2', 'member3'} - Sets "my_set1" and "my_set2" have three unique members.

const result2 = await client.sunion(["my_set1", "non_existing_set"]);
console.log(result2); // Output: Set {'member1', 'member2'}
```

***

### sunionstore()

> **sunionstore**(`destination`, `keys`): `Promise`\<`number`\>

Stores the members of the union of all given sets specified by `keys` into a new set
at `destination`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key of the destination set. |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys from which to retrieve the set members. |

#### Returns

`Promise`\<`number`\>

The number of elements in the resulting set.

#### See

[https://valkey.io/commands/sunionstore/\|valkey.io](https://valkey.io/commands/sunionstore/|valkey.io) for details.

#### Remarks

When in cluster mode, `destination` and all `keys` must map to the same hash slot.

#### Example

```typescript
const length = await client.sunionstore("mySet", ["set1", "set2"]);
console.log(length); // Output: 2 - Two elements were stored in "mySet", and those two members are the union of "set1" and "set2".
```

***

### toProtobufRoute()

> `protected` **toProtobufRoute**(`route`): `undefined` \| `Routes`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `route` | `undefined` \| [`Routes`](../../GlideClusterClient/type-aliases/Routes.md) |

#### Returns

`undefined` \| `Routes`

***

### touch()

> **touch**(`keys`): `Promise`\<`number`\>

Updates the last access time of the specified keys.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys to update the last access time of. |

#### Returns

`Promise`\<`number`\>

The number of keys that were updated. A key is ignored if it doesn't exist.

#### See

[https://valkey.io/commands/touch/\|valkey.io](https://valkey.io/commands/touch/|valkey.io) for more details.

#### Remarks

In cluster mode, if keys in `keys` map to different hash slots,
the command will be split across these slots and executed separately for each.
This means the command is atomic only at the slot level. If one or more slot-specific
requests fail, the entire call will return the first encountered error, even
though some requests may have succeeded while others did not.
If this behavior impacts your application logic, consider splitting the
request into sub-requests per slot to ensure atomicity.

#### Example

```typescript
await client.set("key1", "value1");
await client.set("key2", "value2");
const result = await client.touch(["key1", "key2", "nonExistingKey"]);
console.log(result); // Output: 2 - The last access time of 2 keys has been updated.
```

***

### tryGetPubSubMessage()

> **tryGetPubSubMessage**(`decoder`?): `null` \| [`PubSubMsg`](../interfaces/PubSubMsg.md)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `decoder`? | [`Decoder`](../enumerations/Decoder.md) |

#### Returns

`null` \| [`PubSubMsg`](../interfaces/PubSubMsg.md)

***

### ttl()

> **ttl**(`key`): `Promise`\<`number`\>

Returns the remaining time to live of `key` that has a timeout.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key to return its timeout. |

#### Returns

`Promise`\<`number`\>

TTL in seconds, `-2` if `key` does not exist or `-1` if `key` exists but has no associated expire.

#### See

[https://valkey.io/commands/ttl/\|valkey.io](https://valkey.io/commands/ttl/|valkey.io) for details.

#### Examples

```typescript
// Example usage of the ttl method with existing key
const result = await client.ttl("my_key");
console.log(result); // Output: 3600 - Indicates that "my_key" has a remaining time to live of 3600 seconds.
```

```typescript
// Example usage of the ttl method with existing key that has no associated expire.
const result = await client.ttl("key");
console.log(result); // Output: -1 - Indicates that the key has no associated expire.
```

```typescript
// Example usage of the ttl method with a non-existing key
const result = await client.ttl("nonexistent_key");
console.log(result); // Output: -2 - Indicates that the key doesn't exist.
```

***

### type()

> **type**(`key`): `Promise`\<`string`\>

Returns the string representation of the type of the value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The `key` to check its data type. |

#### Returns

`Promise`\<`string`\>

If the `key` exists, the type of the stored value is returned. Otherwise, a "none" string is returned.

#### See

[https://valkey.io/commands/type/\|valkey.io](https://valkey.io/commands/type/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of type method with a string value
await client.set("key", "value");
const type = await client.type("key");
console.log(type); // Output: 'string'
```

```typescript
// Example usage of type method with a list
await client.lpush("key", ["value"]);
const type = await client.type("key");
console.log(type); // Output: 'list'
```

***

### unlink()

> **unlink**(`keys`): `Promise`\<`number`\>

Removes the specified keys. A key is ignored if it does not exist.
This command, similar to [del](BaseClient.md#del), removes specified keys and ignores non-existent ones.
However, this command does not block the server, while [https://valkey.io/commands/del\|\`DEL\`](https://valkey.io/commands/del|`DEL`) does.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys we wanted to unlink. |

#### Returns

`Promise`\<`number`\>

The number of keys that were unlinked.

#### Remarks

In cluster mode, if keys in `keys` map to different hash slots,
the command will be split across these slots and executed separately for each.
This means the command is atomic only at the slot level. If one or more slot-specific
requests fail, the entire call will return the first encountered error, even
though some requests may have succeeded while others did not.
If this behavior impacts your application logic, consider splitting the
request into sub-requests per slot to ensure atomicity.

#### See

[https://valkey.io/commands/unlink/\|valkey.io](https://valkey.io/commands/unlink/|valkey.io) for details.

#### Example

```typescript
// Example usage of the unlink method
const result = await client.unlink(["key1", "key2", "key3"]);
console.log(result); // Output: 3 - Indicates that all three keys were unlinked from the database.
```

***

### updateConnectionPassword()

> **updateConnectionPassword**(`password`, `immediateAuth`): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)\>

Update the current connection with a new password.

This method is useful in scenarios where the server password has changed or when utilizing short-lived passwords for enhanced security.
It allows the client to update its password to reconnect upon disconnection without the need to recreate the client instance.
This ensures that the internal reconnection mechanism can handle reconnection seamlessly, preventing the loss of in-flight commands.

This method updates the client's internal password configuration and does not perform password rotation on the server side.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `password` | `null` \| `string` | `undefined` | `String | null`. The new password to update the current password, or `null` to remove the current password. |
| `immediateAuth` | `boolean` | `false` | - |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)\>

#### Example

```typescript
await client.updateConnectionPassword("newPassword", true) // "OK"
```

***

### wait()

> **wait**(`numreplicas`, `timeout`): `Promise`\<`number`\>

Blocks the current client until all the previous write commands are successfully transferred and
acknowledged by at least `numreplicas` of replicas. If `timeout` is reached, the command returns
the number of replicas that were not yet reached.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `numreplicas` | `number` | The number of replicas to reach. |
| `timeout` | `number` | The timeout value specified in milliseconds. A value of 0 will block indefinitely. |

#### Returns

`Promise`\<`number`\>

The number of replicas reached by all the writes performed in the context of the current connection.

#### See

[https://valkey.io/commands/wait/\|valkey.io](https://valkey.io/commands/wait/|valkey.io) for more details.

#### Example

```typescript
await client.set(key, value);
let response = await client.wait(1, 1000);
console.log(response); // Output: return 1 when a replica is reached or 0 if 1000ms is reached.
```

***

### watch()

> **watch**(`keys`): `Promise`\<`"OK"`\>

Marks the given keys to be watched for conditional execution of a transaction. Transactions
will only execute commands if the watched keys are not modified before execution of the
transaction. Executing a transaction will automatically flush all previously watched keys.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys to watch. |

#### Returns

`Promise`\<`"OK"`\>

A simple `"OK"` response.

#### See

[https://valkey.io/commands/watch/\|valkey.io](https://valkey.io/commands/watch/|valkey.io) and [Glide Wiki](https://valkey.io/topics/transactions/#cas|Valkey) for more details.

#### Remarks

In cluster mode, if keys in `keys` map to different hash slots,
the command will be split across these slots and executed separately for each.
This means the command is atomic only at the slot level. If one or more slot-specific
requests fail, the entire call will return the first encountered error, even
though some requests may have succeeded while others did not.
If this behavior impacts your application logic, consider splitting the
request into sub-requests per slot to ensure atomicity.

#### Example

```typescript
const response = await client.watch(["sampleKey"]);
console.log(response); // Output: "OK"
const transaction = new Transaction().set("SampleKey", "foobar");
const result = await client.exec(transaction);
console.log(result); // Output: "OK" - Executes successfully and keys are unwatched.
```
```typescript
const response = await client.watch(["sampleKey"]);
console.log(response); // Output: "OK"
const transaction = new Transaction().set("SampleKey", "foobar");
await client.set("sampleKey", "hello world");
const result = await client.exec(transaction);
console.log(result); // Output: null - null is returned when the watched key is modified before transaction execution.
```

***

### writeOrBufferCommandRequest()

> `protected` **writeOrBufferCommandRequest**(`callbackIdx`, `command`, `route`?): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `callbackIdx` | `number` |
| `command` | `Command` \| `Command`[] |
| `route`? | `Routes` |

#### Returns

`void`

***

### writeOrBufferRequest()

> `protected` **writeOrBufferRequest**\<`TRequest`\>(`message`, `encodeDelimited`): `void`

#### Type Parameters

| Type Parameter |
| ------ |
| `TRequest` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `TRequest` |
| `encodeDelimited` | (`message`, `writer`) => `void` |

#### Returns

`void`

***

### xack()

> **xack**(`key`, `group`, `ids`): `Promise`\<`number`\>

Returns the number of messages that were successfully acknowledged by the consumer group member of a stream.
This command should be called on a pending message so that such message does not get processed again.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `ids` | `string`[] | An array of entry ids. |

#### Returns

`Promise`\<`number`\>

The number of messages that were successfully acknowledged.

#### See

[https://valkey.io/commands/xack/\|valkey.io](https://valkey.io/commands/xack/|valkey.io) for details.

#### Example

```typescript
const entryId = await client.xadd("mystream", ["myfield", "mydata"]);
// read messages from streamId
const readResult = await client.xreadgroup(["myfield", "mydata"], "mygroup", "my0consumer");
// acknowledge messages on stream
console.log(await client.xack("mystream", "mygroup", [entryId])); // Output: 1
```

***

### xadd()

> **xadd**(`key`, `values`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Adds an entry to the specified stream stored at `key`. If the `key` doesn't exist, the stream is created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `values` | \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)\][] | field-value pairs to be added to the entry. |
| `options`? | [`StreamAddOptions`](../../Commands/interfaces/StreamAddOptions.md) & [`DecoderOption`](../interfaces/DecoderOption.md) | options detailing how to add to the stream. |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

The id of the added entry, or `null` if `options.makeStream` is set to `false` and no stream with the matching `key` exists.

#### See

[https://valkey.io/commands/xadd/\|valkey.io](https://valkey.io/commands/xadd/|valkey.io) for more details.

***

### xautoclaim()

> **xautoclaim**(`key`, `group`, `consumer`, `minIdleTime`, `start`, `options`?): `Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), [`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md), [`GlideString`](../type-aliases/GlideString.md)[]?\]\>

Transfers ownership of pending stream entries that match the specified criteria.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../type-aliases/GlideString.md) | The group consumer. |
| `minIdleTime` | `number` | The minimum idle time for the message to be claimed. |
| `start` | `string` | Filters the claimed entries to those that have an ID equal or greater than the specified value. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `count`: the number of claimed entries. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), [`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md), [`GlideString`](../type-aliases/GlideString.md)[]?\]\>

A `tuple` containing the following elements:
  - A stream ID to be used as the start argument for the next call to `XAUTOCLAIM`. This ID is
    equivalent to the next ID in the stream after the entries that were scanned, or "0-0" if
    the entire stream was scanned.
  - A `Record` of the claimed entries.
  - If you are using Valkey 7.0.0 or above, the response list will also include a list containing
    the message IDs that were in the Pending Entries List but no longer exist in the stream.
    These IDs are deleted from the Pending Entries List.

#### See

[https://valkey.io/commands/xautoclaim/\|valkey.io](https://valkey.io/commands/xautoclaim/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
const result = await client.xautoclaim("myStream", "myGroup", "myConsumer", 42, "0-0", { count: 25 });
console.log(result); // Output:
// [
//     "1609338788321-0",                // value to be used as `start` argument
//                                       // for the next `xautoclaim` call
//     {
//         "1609338752495-0": [          // claimed entries
//             ["field 1", "value 1"],
//             ["field 2", "value 2"]
//         ]
//     },
//     [
//         "1594324506465-0",            // array of IDs of deleted messages,
//         "1594568784150-0"             // included in the response only on valkey 7.0.0 and above
//     ]
// ]
```

***

### xautoclaimJustId()

> **xautoclaimJustId**(`key`, `group`, `consumer`, `minIdleTime`, `start`, `options`?): `Promise`\<\[`string`, `string`[], `string`[]?\]\>

Transfers ownership of pending stream entries that match the specified criteria.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../type-aliases/GlideString.md) | The group consumer. |
| `minIdleTime` | `number` | The minimum idle time for the message to be claimed. |
| `start` | `string` | Filters the claimed entries to those that have an ID equal or greater than the specified value. |
| `options`? | \{ `count`: `number`; \} | (Optional) Additional parameters: - (Optional) `count`: limits the number of claimed entries to the specified value. |
| `options.count`? | `number` | - |

#### Returns

`Promise`\<\[`string`, `string`[], `string`[]?\]\>

An `array` containing the following elements:
  - A stream ID to be used as the start argument for the next call to `XAUTOCLAIM`. This ID is
    equivalent to the next ID in the stream after the entries that were scanned, or "0-0" if
    the entire stream was scanned.
  - A list of the IDs for the claimed entries.
  - If you are using Valkey 7.0.0 or above, the response list will also include a list containing
    the message IDs that were in the Pending Entries List but no longer exist in the stream.
    These IDs are deleted from the Pending Entries List.

#### See

[https://valkey.io/commands/xautoclaim/\|valkey.io](https://valkey.io/commands/xautoclaim/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
const result = await client.xautoclaim("myStream", "myGroup", "myConsumer", 42, "0-0", { count: 25 });
console.log(result); // Output:
// [
//     "1609338788321-0",                // value to be used as `start` argument
//                                       // for the next `xautoclaim` call
//     [
//         "1609338752495-0",            // claimed entries
//         "1609338752495-1",
//     ],
//     [
//         "1594324506465-0",            // array of IDs of deleted messages,
//         "1594568784150-0"             // included in the response only on valkey 7.0.0 and above
//     ]
// ]
```

***

### xclaim()

> **xclaim**(`key`, `group`, `consumer`, `minIdleTime`, `ids`, `options`?): `Promise`\<[`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md)\>

Changes the ownership of a pending message.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../type-aliases/GlideString.md) | The group consumer. |
| `minIdleTime` | `number` | The minimum idle time for the message to be claimed. |
| `ids` | `string`[] | An array of entry ids. |
| `options`? | [`StreamClaimOptions`](../../Commands/interfaces/StreamClaimOptions.md) & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [StreamClaimOptions](../../Commands/interfaces/StreamClaimOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md)\>

A `Record` of message entries that are claimed by the consumer.

#### See

[https://valkey.io/commands/xclaim/\|valkey.io](https://valkey.io/commands/xclaim/|valkey.io) for more details.

#### Example

```typescript
const result = await client.xclaim("myStream", "myGroup", "myConsumer", 42,
    ["1-0", "2-0", "3-0"], { idle: 500, retryCount: 3, isForce: true });
console.log(result); // Output:
// {
//     "2-0": [["duration", "1532"], ["event-id", "5"], ["user-id", "7782813"]]
// }
```

***

### xclaimJustId()

> **xclaimJustId**(`key`, `group`, `consumer`, `minIdleTime`, `ids`, `options`?): `Promise`\<`string`[]\>

Changes the ownership of a pending message. This function returns an `array` with
only the message/entry IDs, and is equivalent to using `JUSTID` in the Valkey API.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../type-aliases/GlideString.md) | The group consumer. |
| `minIdleTime` | `number` | The minimum idle time for the message to be claimed. |
| `ids` | `string`[] | An array of entry ids. |
| `options`? | [`StreamClaimOptions`](../../Commands/interfaces/StreamClaimOptions.md) | (Optional) Stream claim options [StreamClaimOptions](../../Commands/interfaces/StreamClaimOptions.md). |

#### Returns

`Promise`\<`string`[]\>

An `array` of message ids claimed by the consumer.

#### See

[https://valkey.io/commands/xclaim/\|valkey.io](https://valkey.io/commands/xclaim/|valkey.io) for more details.

#### Example

```typescript
const result = await client.xclaimJustId("my_stream", "my_group", "my_consumer", 42,
    ["1-0", "2-0", "3-0"], { idle: 500, retryCount: 3, isForce: true });
console.log(result); // Output: [ "2-0", "3-0" ]
```

***

### xdel()

> **xdel**(`key`, `ids`): `Promise`\<`number`\>

Removes the specified entries by id from a stream, and returns the number of entries deleted.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `ids` | `string`[] | An array of entry ids. |

#### Returns

`Promise`\<`number`\>

The number of entries removed from the stream. This number may be less than the number of entries in
     `ids`, if the specified `ids` don't exist in the stream.

#### See

[https://valkey.io/commands/xdel/\|valkey.io](https://valkey.io/commands/xdel/|valkey.io) for more details.

#### Example

```typescript
console.log(await client.xdel("key", ["1538561698944-0", "1538561698944-1"]));
// Output is 2 since the stream marked 2 entries as deleted.
```

***

### xgroupCreate()

> **xgroupCreate**(`key`, `groupName`, `id`, `options`?): `Promise`\<`"OK"`\>

Creates a new consumer group uniquely identified by `groupname` for the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../type-aliases/GlideString.md) | The newly created consumer group name. |
| `id` | `string` | Stream entry ID that specifies the last delivered entry in the stream from the new group’s perspective. The special ID `"$"` can be used to specify the last entry in the stream. |
| `options`? | [`StreamGroupOptions`](../../Commands/interfaces/StreamGroupOptions.md) | - |

#### Returns

`Promise`\<`"OK"`\>

`"OK"`.

#### See

[https://valkey.io/commands/xgroup-create/\|valkey.io](https://valkey.io/commands/xgroup-create/|valkey.io) for more details.

#### Example

```typescript
// Create the consumer group "mygroup", using zero as the starting ID:
console.log(await client.xgroupCreate("mystream", "mygroup", "0-0")); // Output is "OK"
```

***

### xgroupCreateConsumer()

> **xgroupCreateConsumer**(`key`, `groupName`, `consumerName`): `Promise`\<`boolean`\>

Creates a consumer named `consumerName` in the consumer group `groupName` for the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `consumerName` | [`GlideString`](../type-aliases/GlideString.md) | The newly created consumer. |

#### Returns

`Promise`\<`boolean`\>

`true` if the consumer is created. Otherwise, returns `false`.

#### See

[https://valkey.io/commands/xgroup-createconsumer/\|valkey.io](https://valkey.io/commands/xgroup-createconsumer/|valkey.io) for more details.

#### Example

```typescript
// The consumer "myconsumer" was created in consumer group "mygroup" for the stream "mystream".
console.log(await client.xgroupCreateConsumer("mystream", "mygroup", "myconsumer")); // Output is true
```

***

### xgroupDelConsumer()

> **xgroupDelConsumer**(`key`, `groupName`, `consumerName`): `Promise`\<`number`\>

Deletes a consumer named `consumerName` in the consumer group `groupName` for the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `consumerName` | [`GlideString`](../type-aliases/GlideString.md) | The consumer to delete. |

#### Returns

`Promise`\<`number`\>

The number of pending messages the `consumer` had before it was deleted.

*

#### See

[https://valkey.io/commands/xgroup-delconsumer/\|valkey.io](https://valkey.io/commands/xgroup-delconsumer/|valkey.io) for more details.

#### Example

```typescript
// Consumer "myconsumer" was deleted, and had 5 pending messages unclaimed.
console.log(await client.xgroupDelConsumer("mystream", "mygroup", "myconsumer")); // Output is 5
```

***

### xgroupDestroy()

> **xgroupDestroy**(`key`, `groupName`): `Promise`\<`boolean`\>

Destroys the consumer group `groupname` for the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../type-aliases/GlideString.md) | - |

#### Returns

`Promise`\<`boolean`\>

`true` if the consumer group is destroyed. Otherwise, `false`.

#### See

[https://valkey.io/commands/xgroup-destroy/\|valkey.io](https://valkey.io/commands/xgroup-destroy/|valkey.io) for more details.

#### Example

```typescript
// Destroys the consumer group "mygroup"
console.log(await client.xgroupDestroy("mystream", "mygroup")); // Output is true
```

***

### xgroupSetId()

> **xgroupSetId**(`key`, `groupName`, `id`, `options`?): `Promise`\<`"OK"`\>

Sets the last delivered ID for a consumer group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `id` | `string` | The stream entry ID that should be set as the last delivered ID for the consumer group. |
| `options`? | \{ `entriesRead`: `number`; \} | (Optional) Additional parameters: - (Optional) `entriesRead`: the number of stream entries already read by the group. This option can only be specified if you are using Valkey version 7.0.0 or above. |
| `options.entriesRead`? | `number` | - |

#### Returns

`Promise`\<`"OK"`\>

`"OK"`.

*

#### See

[https://valkey.io/commands/xgroup-setid\|valkey.io](https://valkey.io/commands/xgroup-setid|valkey.io) for more details.

#### Example

```typescript
console.log(await client.xgroupSetId("mystream", "mygroup", "0", { entriesRead: 1 })); // Output is "OK"
```

***

### xinfoConsumers()

> **xinfoConsumers**(`key`, `group`, `options`?): `Promise`\<`Record`\<`string`, `number` \| [`GlideString`](../type-aliases/GlideString.md)\>[]\>

Returns the list of all consumers and their attributes for the given consumer group of the
stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`Record`\<`string`, `number` \| [`GlideString`](../type-aliases/GlideString.md)\>[]\>

An `Array` of `Records`, where each mapping contains the attributes
    of a consumer for the given consumer group of the stream at `key`.

#### See

[https://valkey.io/commands/xinfo-consumers/\|valkey.io](https://valkey.io/commands/xinfo-consumers/|valkey.io) for more details.

#### Example

```typescript
const result = await client.xinfoConsumers("my_stream", "my_group");
console.log(result); // Output:
// [
//     {
//         "name": "Alice",
//         "pending": 1,
//         "idle": 9104628,
//         "inactive": 18104698   // Added in 7.2.0
//     },
//     ...
// ]
```

***

### xinfoGroups()

> **xinfoGroups**(`key`, `options`?): `Promise`\<`Record`\<`string`, `null` \| `number` \| [`GlideString`](../type-aliases/GlideString.md)\>[]\>

Returns the list of all consumer groups and their attributes for the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`Record`\<`string`, `null` \| `number` \| [`GlideString`](../type-aliases/GlideString.md)\>[]\>

An array of maps, where each mapping represents the
    attributes of a consumer group for the stream at `key`.

#### See

[https://valkey.io/commands/xinfo-groups/\|valkey.io](https://valkey.io/commands/xinfo-groups/|valkey.io) for details.

#### Example

```typescript
const result = await client.xinfoGroups("my_stream");
console.log(result); // Output:
// [
//     {
//         "name": "mygroup",
//         "consumers": 2,
//         "pending": 2,
//         "last-delivered-id": "1638126030001-0",
//         "entries-read": 2,                       // Added in version 7.0.0
//         "lag": 0                                 // Added in version 7.0.0
//     },
//     {
//         "name": "some-other-group",
//         "consumers": 1,
//         "pending": 0,
//         "last-delivered-id": "0-0",
//         "entries-read": null,                    // Added in version 7.0.0
//         "lag": 1                                 // Added in version 7.0.0
//     }
// ]
```

***

### xinfoStream()

> **xinfoStream**(`key`, `options`?): `Promise`\<[`ReturnTypeXinfoStream`](../type-aliases/ReturnTypeXinfoStream.md)\>

Returns information about the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `fullOptions`: If `true`, returns verbose information with a limit of the first 10 PEL entries. If `number` is specified, returns verbose information limiting the returned PEL entries. If `0` is specified, returns verbose information with no limit. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`ReturnTypeXinfoStream`](../type-aliases/ReturnTypeXinfoStream.md)\>

A [ReturnTypeXinfoStream](../type-aliases/ReturnTypeXinfoStream.md) of detailed stream information for the given `key`. See
    the example for a sample response.

#### See

[https://valkey.io/commands/xinfo-stream/\|valkey.io](https://valkey.io/commands/xinfo-stream/|valkey.io) for more details.

#### Examples

```typescript
const infoResult = await client.xinfoStream("my_stream");
console.log(infoResult);
// Output: {
//   length: 2,
//   'radix-tree-keys': 1,
//   'radix-tree-nodes': 2,
//   'last-generated-id': '1719877599564-1',
//   'max-deleted-entry-id': '0-0',
//   'entries-added': 2,
//   'recorded-first-entry-id': '1719877599564-0',
//   'first-entry': [ '1719877599564-0', ['some_field", "some_value', ...] ],
//   'last-entry': [ '1719877599564-0', ['some_field", "some_value', ...] ],
//   groups: 1,
// }
```

```typescript
const infoResult = await client.xinfoStream("my_stream", true); // default limit of 10 entries
const infoResult = await client.xinfoStream("my_stream", 15); // limit of 15 entries
console.log(infoResult);
// Output: {
//   'length': 2,
//   'radix-tree-keys': 1,
//   'radix-tree-nodes': 2,
//   'last-generated-id': '1719877599564-1',
//   'max-deleted-entry-id': '0-0',
//   'entries-added': 2,
//   'recorded-first-entry-id': '1719877599564-0',
//   'entries': [ [ '1719877599564-0', ['some_field", "some_value', ...] ] ],
//   'groups': [ {
//     'name': 'group',
//     'last-delivered-id': '1719877599564-0',
//     'entries-read': 1,
//     'lag': 1,
//     'pel-count': 1,
//     'pending': [ [ '1719877599564-0', 'consumer', 1722624726802, 1 ] ],
//     'consumers': [ {
//         'name': 'consumer',
//         'seen-time': 1722624726802,
//         'active-time': 1722624726802,
//         'pel-count': 1,
//         'pending': [ [ '1719877599564-0', 'consumer', 1722624726802, 1 ] ],
//         }
//       ]
//     }
//   ]
// }
```

***

### xlen()

> **xlen**(`key`): `Promise`\<`number`\>

Returns the number of entries in the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |

#### Returns

`Promise`\<`number`\>

The number of entries in the stream. If `key` does not exist, returns `0`.

#### See

[https://valkey.io/commands/xlen/\|valkey.io](https://valkey.io/commands/xlen/|valkey.io) for more details.

#### Example

```typescript
const numEntries = await client.xlen("my_stream");
console.log(numEntries); // Output: 2 - "my_stream" contains 2 entries.
```

***

### xpending()

> **xpending**(`key`, `group`): `Promise`\<\[`number`, [`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md), \[[`GlideString`](../type-aliases/GlideString.md), `number`\][]\]\>

Returns stream message summary information for pending messages matching a given range of IDs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |

#### Returns

`Promise`\<\[`number`, [`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md), \[[`GlideString`](../type-aliases/GlideString.md), `number`\][]\]\>

An `array` that includes the summary of the pending messages. See example for more details.

#### See

[https://valkey.io/commands/xpending/\|valkey.io](https://valkey.io/commands/xpending/|valkey.io) for more details.

#### Example

```typescript
console.log(await client.xpending("my_stream", "my_group")); // Output:
// [
//     42,                            // The total number of pending messages
//     "1722643465939-0",             // The smallest ID among the pending messages
//     "1722643484626-0",             // The greatest ID among the pending messages
//     [                              // A 2D-`array` of every consumer in the group
//         [ "consumer1", "10" ],     // with at least one pending message, and the
//         [ "consumer2", "32" ],     // number of pending messages it has
//     ]
// ]
```

***

### xpendingWithOptions()

> **xpendingWithOptions**(`key`, `group`, `options`): `Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md), `number`, `number`\][]\>

Returns an extended form of stream message information for pending messages matching a given range of IDs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `options` | [`StreamPendingOptions`](../../Commands/interfaces/StreamPendingOptions.md) | Additional options to filter entries, see [StreamPendingOptions](../../Commands/interfaces/StreamPendingOptions.md). |

#### Returns

`Promise`\<\[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md), `number`, `number`\][]\>

A 2D-`array` of 4-tuples containing extended message information. See example for more details.

#### See

[https://valkey.io/commands/xpending/\|valkey.io](https://valkey.io/commands/xpending/|valkey.io) for more details.

#### Example

```typescript
console.log(await client.xpending("my_stream", "my_group"), {
    start: { value: "0-1", isInclusive: true },
    end: InfBoundary.PositiveInfinity,
    count: 2,
    consumer: "consumer1"
}); // Output:
// [
//     [
//         "1722643465939-0",  // The ID of the message
//         "consumer1",        // The name of the consumer that fetched the message and has still to acknowledge it
//         174431,             // The number of milliseconds that elapsed since the last time this message was delivered to this consumer
//         1                   // The number of times this message was delivered
//     ],
//     [
//         "1722643484626-0",
//         "consumer1",
//         202231,
//         1
//     ]
// ]
```

***

### xrange()

> **xrange**(`key`, `start`, `end`, `options`?): `Promise`\<`null` \| [`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md)\>

Returns stream entries matching a given range of entry IDs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `start` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`string`\> | The starting stream entry ID bound for the range. - Use `value` to specify a stream entry ID. - Use `isInclusive: false` to specify an exclusive bounded stream entry ID. This is only available starting with Valkey version 6.2.0. - Use `InfBoundary.NegativeInfinity` to start with the minimum available ID. |
| `end` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`string`\> | The ending stream entry ID bound for the range. - Use `value` to specify a stream entry ID. - Use `isInclusive: false` to specify an exclusive bounded stream entry ID. This is only available starting with Valkey version 6.2.0. - Use `InfBoundary.PositiveInfinity` to end with the maximum available ID. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `count`: the maximum count of stream entries to return. If `count` is not provided, all stream entries in the range will be returned. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md)\>

A map of stream entry ids, to an array of entries, or `null` if `count` is non-positive.

#### See

[https://valkey.io/commands/xrange/\|valkey.io](https://valkey.io/commands/xrange/|valkey.io) for more details.

#### Example

```typescript
await client.xadd("mystream", [["field1", "value1"]], {id: "0-1"});
await client.xadd("mystream", [["field2", "value2"], ["field2", "value3"]], {id: "0-2"});
console.log(await client.xrange("mystream", InfBoundary.NegativeInfinity, InfBoundary.PositiveInfinity));
// Output:
// {
//     "0-1": [["field1", "value1"]],
//     "0-2": [["field2", "value2"], ["field2", "value3"]],
// } // Indicates the stream entry IDs and their associated field-value pairs for all stream entries in "mystream".
```

***

### xread()

> **xread**(`keys_and_ids`, `options`?): `Promise`\<`null` \| [`GlideRecord`](../type-aliases/GlideRecord.md)\<[`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md)\>\>

Reads entries from the given streams.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys_and_ids` | `Record`\<`string`, `string`\> \| [`GlideRecord`](../type-aliases/GlideRecord.md)\<`string`\> | An object of stream keys and entry IDs to read from. |
| `options`? | [`StreamReadOptions`](../../Commands/interfaces/StreamReadOptions.md) & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Parameters detailing how to read the stream - see [StreamReadOptions](../../Commands/interfaces/StreamReadOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideRecord`](../type-aliases/GlideRecord.md)\<[`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md)\>\>

A list of stream keys with a `Record` of stream IDs mapped to an `Array` of entries or `null` if key does not exist.

#### See

[https://valkey.io/commands/xread/\|valkey.io](https://valkey.io/commands/xread/|valkey.io) for more details.

#### Example

```typescript
const streamResults = await client.xread({"my_stream": "0-0", "writers": "0-0"});
console.log(result); // Output:
// [
//     {
//         key: "my_stream",
//         value: {
//             "1526984818136-0": [["duration", "1532"], ["event-id", "5"], ["user-id", "7782813"]],
//             "1526999352406-0": [["duration", "812"], ["event-id", "9"], ["user-id", "388234"]],
//         }
//     },
//     {
//         key: "writers",
//         value: {
//             "1526985676425-0": [["name", "Virginia"], ["surname", "Woolf"]],
//             "1526985685298-0": [["name", "Jane"], ["surname", "Austen"]],
//         }
//     }
// ]
```

***

### xreadgroup()

> **xreadgroup**(`group`, `consumer`, `keys_and_ids`, `options`?): `Promise`\<`null` \| [`GlideRecord`](../type-aliases/GlideRecord.md)\<`Record`\<`string`, `null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)\][]\>\>\>

Reads entries from the given streams owned by a consumer group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `group` | [`GlideString`](../type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../type-aliases/GlideString.md) | The group consumer. |
| `keys_and_ids` | `Record`\<`string`, `string`\> \| [`GlideRecord`](../type-aliases/GlideRecord.md)\<`string`\> | An object of stream keys and entry IDs to read from. Use the special entry ID of `">"` to receive only new messages. |
| `options`? | [`StreamReadOptions`](../../Commands/interfaces/StreamReadOptions.md) & `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Parameters detailing how to read the stream - see [StreamReadGroupOptions](../../Commands/type-aliases/StreamReadGroupOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideRecord`](../type-aliases/GlideRecord.md)\<`Record`\<`string`, `null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`GlideString`](../type-aliases/GlideString.md)\][]\>\>\>

A list of stream keys with a `Record` of stream IDs mapped to an `Array` of entries.
    Returns `null` if there is no stream that can be served.

#### See

[https://valkey.io/commands/xreadgroup/\|valkey.io](https://valkey.io/commands/xreadgroup/|valkey.io) for details.

#### Example

```typescript
const streamResults = await client.xreadgroup("my_group", "my_consumer", {"my_stream": "0-0", "writers_stream": "0-0", "readers_stream", ">"});
console.log(result); // Output:
// [
//     {
//         key: "my_stream",
//         value: {
//             "1526984818136-0": [["duration", "1532"], ["event-id", "5"], ["user-id", "7782813"]],
//             "1526999352406-0": [["duration", "812"], ["event-id", "9"], ["user-id", "388234"]],
//         }
//     },
//     {
//         key: "writers_stream",
//         value: {
//             "1526985676425-0": [["name", "Virginia"], ["surname", "Woolf"]],
//             "1526985685298-0": null,                                          // entry was deleted
//         }
//     },
//     {
//         key: "readers_stream",                                                // stream is empty
//         value: {}
//     }
// ]
```

***

### xrevrange()

> **xrevrange**(`key`, `end`, `start`, `options`?): `Promise`\<`null` \| [`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md)\>

Returns stream entries matching a given range of entry IDs in reverse order. Equivalent to [xrange](BaseClient.md#xrange) but returns the
entries in reverse order.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the stream. |
| `end` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`string`\> | The ending stream entry ID bound for the range. - Use `value` to specify a stream entry ID. - Use `isInclusive: false` to specify an exclusive bounded stream entry ID. This is only available starting with Valkey version 6.2.0. - Use `InfBoundary.PositiveInfinity` to end with the maximum available ID. |
| `start` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`string`\> | The ending stream ID bound for the range. - Use `value` to specify a stream entry ID. - Use `isInclusive: false` to specify an exclusive bounded stream entry ID. This is only available starting with Valkey version 6.2.0. - Use `InfBoundary.NegativeInfinity` to start with the minimum available ID. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `count`: the maximum count of stream entries to return. If `count` is not provided, all stream entries in the range will be returned. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`StreamEntryDataType`](../type-aliases/StreamEntryDataType.md)\>

A map of stream entry ids, to an array of entries, or `null` if `count` is non-positive.

#### See

[https://valkey.io/commands/xrevrange/\|valkey.io](https://valkey.io/commands/xrevrange/|valkey.io) for more details.

#### Example

```typescript
await client.xadd("mystream", [["field1", "value1"]], {id: "0-1"});
await client.xadd("mystream", [["field2", "value2"], ["field2", "value3"]], {id: "0-2"});
console.log(await client.xrevrange("mystream", InfBoundary.PositiveInfinity, InfBoundary.NegativeInfinity));
// Output:
// {
//     "0-2": [["field2", "value2"], ["field2", "value3"]],
//     "0-1": [["field1", "value1"]],
// } // Indicates the stream entry IDs and their associated field-value pairs for all stream entries in "mystream".
```

***

### xtrim()

> **xtrim**(`key`, `options`): `Promise`\<`number`\>

Trims the stream stored at `key` by evicting older entries.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | the key of the stream |
| `options` | [`StreamTrimOptions`](../../Commands/type-aliases/StreamTrimOptions.md) | options detailing how to trim the stream. |

#### Returns

`Promise`\<`number`\>

The number of entries deleted from the stream. If `key` doesn't exist, 0 is returned.

#### See

[https://valkey.io/commands/xtrim/\|valkey.io](https://valkey.io/commands/xtrim/|valkey.io) for more details.

***

### zadd()

> **zadd**(`key`, `membersAndScores`, `options`?): `Promise`\<`number`\>

Adds members with their scores to the sorted set stored at `key`.
If a member is already a part of the sorted set, its score is updated.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `membersAndScores` | [`SortedSetDataType`](../type-aliases/SortedSetDataType.md) \| `Record`\<`string`, `number`\> | A list of members and their corresponding scores or a mapping of members to their corresponding scores. |
| `options`? | [`ZAddOptions`](../../Commands/interfaces/ZAddOptions.md) | (Optional) The `ZADD` options - see [ZAddOptions](../../Commands/interfaces/ZAddOptions.md). |

#### Returns

`Promise`\<`number`\>

The number of elements added to the sorted set.
If [ZAddOptions.changed](../../Commands/interfaces/ZAddOptions.md#changed) is set to `true`, returns the number of elements updated in the sorted set.

#### See

[https://valkey.io/commands/zadd/\|valkey.io](https://valkey.io/commands/zadd/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of the zadd method to add elements to a sorted set
const data = [{ element: "member1", score: 10.5 }, { element: "member2", score: 8.2 }]
const result = await client.zadd("my_sorted_set", data);
console.log(result); // Output: 2 - Indicates that two elements have been added to the sorted set "my_sorted_set."
```

```typescript
// Example usage of the zadd method to update scores in an existing sorted set
const options = { conditionalChange: ConditionalChange.ONLY_IF_EXISTS, changed: true };
const result = await client.zadd("existing_sorted_set", { "member1": 10.5, "member2": 8.2 }, options);
console.log(result); // Output: 2 - Updates the scores of two existing members in the sorted set "existing_sorted_set."
```

***

### zaddIncr()

> **zaddIncr**(`key`, `member`, `increment`, `options`?): `Promise`\<`null` \| `number`\>

Increments the score of member in the sorted set stored at `key` by `increment`.
If `member` does not exist in the sorted set, it is added with `increment` as its score (as if its previous score was 0.0).
If `key` does not exist, a new sorted set with the specified member as its sole member is created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../type-aliases/GlideString.md) | A member in the sorted set to increment score to. |
| `increment` | `number` | The score to increment the member. |
| `options`? | [`ZAddOptions`](../../Commands/interfaces/ZAddOptions.md) | (Optional) The `ZADD` options - see [ZAddOptions](../../Commands/interfaces/ZAddOptions.md). |

#### Returns

`Promise`\<`null` \| `number`\>

The score of the member.
If there was a conflict with the options, the operation aborts and `null` is returned.

#### See

[https://valkey.io/commands/zadd/\|valkey.io](https://valkey.io/commands/zadd/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of the zaddIncr method to add a member with a score to a sorted set
const result = await client.zaddIncr("my_sorted_set", member, 5.0);
console.log(result); // Output: 5.0
```

```typescript
// Example usage of the zaddIncr method to add or update a member with a score in an existing sorted set
const result = await client.zaddIncr("existing_sorted_set", member, "3.0", { updateOptions: UpdateByScore.LESS_THAN });
console.log(result); // Output: null - Indicates that the member in the sorted set haven't been updated.
```

***

### zcard()

> **zcard**(`key`): `Promise`\<`number`\>

Returns the cardinality (number of elements) of the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |

#### Returns

`Promise`\<`number`\>

The number of elements in the sorted set.
If `key` does not exist, it is treated as an empty sorted set, and this command returns `0`.

#### See

[https://valkey.io/commands/zcard/\|valkey.io](https://valkey.io/commands/zcard/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of the zcard method to get the cardinality of a sorted set
const result = await client.zcard("my_sorted_set");
console.log(result); // Output: 3 - Indicates that there are 3 elements in the sorted set "my_sorted_set".
```

```typescript
// Example usage of the zcard method with a non-existing key
const result = await client.zcard("non_existing_key");
console.log(result); // Output: 0
```

***

### zcount()

> **zcount**(`key`, `minScore`, `maxScore`): `Promise`\<`number`\>

Returns the number of members in the sorted set stored at `key` with scores between `minScore` and `maxScore`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `minScore` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`number`\> | The minimum score to count from. Can be positive/negative infinity, or specific score and inclusivity. |
| `maxScore` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`number`\> | The maximum score to count up to. Can be positive/negative infinity, or specific score and inclusivity. |

#### Returns

`Promise`\<`number`\>

The number of members in the specified score range.
If `key` does not exist, it is treated as an empty sorted set, and the command returns `0`.
If `minScore` is greater than `maxScore`, `0` is returned.

#### See

[https://valkey.io/commands/zcount/\|valkey.io](https://valkey.io/commands/zcount/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of the zcount method to count members in a sorted set within a score range
const result = await client.zcount("my_sorted_set", { value: 5.0, isInclusive: true }, InfBoundary.PositiveInfinity);
console.log(result); // Output: 2 - Indicates that there are 2 members with scores between 5.0 (inclusive) and +inf in the sorted set "my_sorted_set".
```

```typescript
// Example usage of the zcount method to count members in a sorted set within a score range
const result = await client.zcount("my_sorted_set", { value: 5.0, isInclusive: true }, { value: 10.0, isInclusive: false });
console.log(result); // Output: 1 - Indicates that there is one member with score between 5.0 (inclusive) and 10.0 (exclusive) in the sorted set "my_sorted_set".
```

***

### zdiff()

> **zdiff**(`keys`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Returns the difference between the first sorted set and all the successive sorted sets.
To get the elements with their scores, see [zdiffWithScores](BaseClient.md#zdiffwithscores).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

An `array` of elements representing the difference between the sorted sets.
If the first key does not exist, it is treated as an empty sorted set, and the command returns an empty `array`.

#### See

[https://valkey.io/commands/zdiff/\|valkey.io](https://valkey.io/commands/zdiff/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
await client.zadd("zset1", {"member1": 1.0, "member2": 2.0, "member3": 3.0});
await client.zadd("zset2", {"member2": 2.0});
await client.zadd("zset3", {"member3": 3.0});
const result = await client.zdiff(["zset1", "zset2", "zset3"]);
console.log(result); // Output: ["member1"] - "member1" is in "zset1" but not "zset2" or "zset3".
```

***

### zdiffstore()

> **zdiffstore**(`destination`, `keys`): `Promise`\<`number`\>

Calculates the difference between the first sorted set and all the successive sorted sets in `keys` and stores
the difference as a sorted set to `destination`, overwriting it if it already exists. Non-existent keys are
treated as empty sets.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key for the resulting sorted set. |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets to compare. |

#### Returns

`Promise`\<`number`\>

The number of members in the resulting sorted set stored at `destination`.

#### See

[https://valkey.io/commands/zdiffstore/\|valkey.io](https://valkey.io/commands/zdiffstore/|valkey.io) for more details.

#### Remarks

When in cluster mode, all keys in `keys` and `destination` must map to the same hash slot.

#### Example

```typescript
await client.zadd("zset1", {"member1": 1.0, "member2": 2.0});
await client.zadd("zset2", {"member1": 1.0});
const result1 = await client.zdiffstore("zset3", ["zset1", "zset2"]);
console.log(result1); // Output: 1 - One member exists in "key1" but not "key2", and this member was stored in "zset3".

const result2 = await client.zrange("zset3", {start: 0, end: -1});
console.log(result2); // Output: ["member2"] - "member2" is now stored in "my_sorted_set".
```

***

### zdiffWithScores()

> **zdiffWithScores**(`keys`, `options`?): `Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

Returns the difference between the first sorted set and all the successive sorted sets, with the associated
scores.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

A list of elements and their scores representing the difference between the sorted sets.
If the first key does not exist, it is treated as an empty sorted set, and the command returns an empty `array`.

#### See

[https://valkey.io/commands/zdiff/\|valkey.io](https://valkey.io/commands/zdiff/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
await client.zadd("zset1", {"member1": 1.0, "member2": 2.0, "member3": 3.0});
await client.zadd("zset2", {"member2": 2.0});
await client.zadd("zset3", {"member3": 3.0});
const result = await client.zdiffWithScores(["zset1", "zset2", "zset3"]);
console.log(result); // Output: "member1" is in "zset1" but not "zset2" or "zset3"
// [{ element: "member1", score: 1.0 }]
```

***

### zincrby()

> **zincrby**(`key`, `increment`, `member`): `Promise`\<`number`\>

Increments the score of `member` in the sorted set stored at `key` by `increment`.
If `member` does not exist in the sorted set, it is added with `increment` as its score.
If `key` does not exist, a new sorted set is created with the specified member as its sole member.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `increment` | `number` | The score increment. |
| `member` | [`GlideString`](../type-aliases/GlideString.md) | A member of the sorted set. |

#### Returns

`Promise`\<`number`\>

The new score of `member`.

#### See

[https://valkey.io/commands/zincrby/\|valkey.io](https://valkey.io/commands/zincrby/|valkey.io) for details.

#### Example

```typescript
// Example usage of zincrBy method to increment the value of a member's score
await client.zadd("my_sorted_set", {"member": 10.5, "member2": 8.2});
console.log(await client.zincrby("my_sorted_set", 1.2, "member"));
// Output: 11.7 - The member existed in the set before score was altered, the new score is 11.7.
console.log(await client.zincrby("my_sorted_set", -1.7, "member"));
// Output: 10.0 - Negative increment, decrements the score.
console.log(await client.zincrby("my_sorted_set", 5.5, "non_existing_member"));
// Output: 5.5 - A new member is added to the sorted set with the score of 5.5.
```

***

### zinter()

> **zinter**(`keys`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Computes the intersection of sorted sets given by the specified `keys` and returns a list of intersecting elements.
To get the scores as well, see [zinterWithScores](BaseClient.md#zinterwithscores).
To store the result in a key as a sorted set, see zinterStore.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

The resulting array of intersecting elements.

#### Remarks

When in cluster mode, all keys in `keys` must map to the same hash slot.

#### See

[https://valkey.io/commands/zinter/\|valkey.io](https://valkey.io/commands/zinter/|valkey.io) for details.

#### Example

```typescript
await client.zadd("key1", {"member1": 10.5, "member2": 8.2});
await client.zadd("key2", {"member1": 9.5});
const result = await client.zinter(["key1", "key2"]);
console.log(result); // Output: ['member1']
```

***

### zintercard()

> **zintercard**(`keys`, `options`?): `Promise`\<`number`\>

Returns the cardinality of the intersection of the sorted sets specified by `keys`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets to intersect. |
| `options`? | \{ `limit`: `number`; \} | (Optional) Additional parameters: - (Optional) `limit`: the limit for the intersection cardinality value. If not specified, or set to `0`, no limit is used. |
| `options.limit`? | `number` | - |

#### Returns

`Promise`\<`number`\>

The cardinality of the intersection of the given sorted sets.

#### See

[https://valkey.io/commands/zintercard/\|valkey.io](https://valkey.io/commands/zintercard/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
const cardinality = await client.zintercard(["key1", "key2"], { limit: 10 });
console.log(cardinality); // Output: 3 - The intersection of the sorted sets at "key1" and "key2" has a cardinality of 3.
```

***

### zinterstore()

> **zinterstore**(`destination`, `keys`, `options`?): `Promise`\<`number`\>

Computes the intersection of sorted sets given by the specified `keys` and stores the result in `destination`.
If `destination` already exists, it is overwritten. Otherwise, a new sorted set will be created.
To get the result directly, see [zinterWithScores](BaseClient.md#zinterwithscores).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key of the destination sorted set. |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] \| [`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[] | The keys of the sorted sets with possible formats: - `GlideString[]` - for keys only. - `KeyWeight[]` - for weighted keys with score multipliers. |
| `options`? | \{ `aggregationType`: [`AggregationType`](../../Commands/type-aliases/AggregationType.md); \} | (Optional) Additional parameters: - (Optional) `aggregationType`: the aggregation strategy to apply when combining the scores of elements. See [AggregationType](../../Commands/type-aliases/AggregationType.md). If `aggregationType` is not specified, defaults to `AggregationType.SUM`. |
| `options.aggregationType`? | [`AggregationType`](../../Commands/type-aliases/AggregationType.md) | - |

#### Returns

`Promise`\<`number`\>

The number of elements in the resulting sorted set stored at `destination`.

#### See

[https://valkey.io/commands/zinterstore/\|valkey.io](https://valkey.io/commands/zinterstore/|valkey.io) for more details.

#### Remarks

When in cluster mode, `destination` and all keys in `keys` must map to the same hash slot.

#### Example

```typescript
await client.zadd("key1", {"member1": 10.5, "member2": 8.2})
await client.zadd("key2", {"member1": 9.5})

// use `zinterstore` with default aggregation and weights
console.log(await client.zinterstore("my_sorted_set", ["key1", "key2"]))
// Output: 1 - Indicates that the sorted set "my_sorted_set" contains one element.
console.log(await client.zrangeWithScores("my_sorted_set", {start: 0, end: -1}))
// Output: {'member1': 20} - "member1" is now stored in "my_sorted_set" with score of 20.

// use `zinterstore` with default weights
console.log(await client.zinterstore("my_sorted_set", ["key1", "key2"] , { aggregationType: AggregationType.MAX }))
// Output: 1 - Indicates that the sorted set "my_sorted_set" contains one element, and it's score is the maximum score between the sets.
console.log(await client.zrangeWithScores("my_sorted_set", {start: 0, end: -1}))
// Output: {'member1': 10.5} - "member1" is now stored in "my_sorted_set" with score of 10.5.
```

***

### zinterWithScores()

> **zinterWithScores**(`keys`, `options`?): `Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

Computes the intersection of sorted sets given by the specified `keys` and returns a list of intersecting elements with scores.
To get the elements only, see [zinter](BaseClient.md#zinter).
To store the result in a key as a sorted set, see zinterStore.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] \| [`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[] | The keys of the sorted sets with possible formats: - `GlideString[]` - for keys only. - `KeyWeight[]` - for weighted keys with score multipliers. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `aggregationType`: the aggregation strategy to apply when combining the scores of elements. If `aggregationType` is not specified, defaults to `AggregationType.SUM`. See [AggregationType](../../Commands/type-aliases/AggregationType.md). - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

A list of elements and their scores representing the intersection of the sorted sets.
If a key does not exist, it is treated as an empty sorted set, and the command returns an empty result.

#### Remarks

When in cluster mode, all keys in `keys` must map to the same hash slot.

#### See

[https://valkey.io/commands/zinter/\|valkey.io](https://valkey.io/commands/zinter/|valkey.io) for details.

#### Example

```typescript
await client.zadd("key1", {"member1": 10.5, "member2": 8.2});
await client.zadd("key2", {"member1": 9.5});
const result1 = await client.zinterWithScores(["key1", "key2"]);
console.log(result1); // Output: "member1" with score of 20 is the result
// [{ element: 'member1', score: 20 }]
const result2 = await client.zinterWithScores(["key1", "key2"], AggregationType.MAX)
console.log(result2); // Output: "member1" with score of 10.5 is the result
// [{ element: 'member1', score: 10.5 }]
```

***

### zlexcount()

> **zlexcount**(`key`, `minLex`, `maxLex`): `Promise`\<`number`\>

Returns the number of members in the sorted set stored at 'key' with scores between 'minLex' and 'maxLex'.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `minLex` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<[`GlideString`](../type-aliases/GlideString.md)\> | The minimum lex to count from. Can be negative infinity, or a specific lex and inclusivity. |
| `maxLex` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<[`GlideString`](../type-aliases/GlideString.md)\> | The maximum lex to count up to. Can be positive infinity, or a specific lex and inclusivity. |

#### Returns

`Promise`\<`number`\>

The number of members in the specified lex range.
If 'key' does not exist, it is treated as an empty sorted set, and the command returns '0'.
If maxLex is less than minLex, '0' is returned.

#### See

[https://valkey.io/commands/zlexcount/\|valkey.io](https://valkey.io/commands/zlexcount/|valkey.io) for more details.

#### Examples

```typescript
const result = await client.zlexcount("my_sorted_set", {value: "c"}, InfBoundary.PositiveInfinity);
console.log(result); // Output: 2 - Indicates that there are 2 members with lex scores between "c" (inclusive) and positive infinity in the sorted set "my_sorted_set".
```

```typescript
const result = await client.zlexcount("my_sorted_set", {value: "c"}, {value: "k", isInclusive: false});
console.log(result); // Output: 1 - Indicates that there is one member with a lex score between "c" (inclusive) and "k" (exclusive) in the sorted set "my_sorted_set".
```

***

### zmpop()

> **zmpop**(`keys`, `modifier`, `options`?): `Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\]\>

Pops member-score pairs from the first non-empty sorted set, with the given `keys`
being checked in the order they are provided.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `modifier` | [`ScoreFilter`](../../Commands/enumerations/ScoreFilter.md) | The element pop criteria - either [ScoreFilter.MIN](../../Commands/enumerations/ScoreFilter.md#min) or [ScoreFilter.MAX](../../Commands/enumerations/ScoreFilter.md#max) to pop the member with the lowest/highest score accordingly. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `count`: the maximum number of popped elements. If not specified, pops one member. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| \[[`GlideString`](../type-aliases/GlideString.md), [`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\]\>

A two-element `array` containing the key name of the set from which the element
    was popped, and a [SortedSetDataType](../type-aliases/SortedSetDataType.md) of the popped elements.
    If no member could be popped, returns `null`.

#### See

[https://valkey.io/commands/zmpop/\|valkey.io](https://valkey.io/commands/zmpop/|valkey.io) for more details.

#### Remarks

When in cluster mode, all `keys` must map to the same hash slot.

#### Example

```typescript
await client.zadd("zSet1", { one: 1.0, two: 2.0, three: 3.0 });
await client.zadd("zSet2", { four: 4.0 });
console.log(await client.zmpop(["zSet1", "zSet2"], ScoreFilter.MAX, 2));
// Output:
// "three" with score 3 and "two" with score 2 were popped from "zSet1"
// [ "zSet1", [
//     { element: 'three', score: 3 },
//     { element: 'two', score: 2 }
// ] ]
```

***

### zmscore()

> **zmscore**(`key`, `members`): `Promise`\<(`null` \| `number`)[]\>

Returns the scores associated with the specified `members` in the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `members` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of members in the sorted set. |

#### Returns

`Promise`\<(`null` \| `number`)[]\>

An `array` of scores corresponding to `members`.
If a member does not exist in the sorted set, the corresponding value in the list will be `null`.

#### See

[https://valkey.io/commands/zmscore/\|valkey.io](https://valkey.io/commands/zmscore/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

#### Example

```typescript
const result = await client.zmscore("zset1", ["member1", "non_existent_member", "member2"]);
console.log(result); // Output: [1.0, null, 2.0] - "member1" has a score of 1.0, "non_existent_member" does not exist in the sorted set, and "member2" has a score of 2.0.
```

***

### zpopmax()

> **zpopmax**(`key`, `options`?): `Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

Removes and returns the members with the highest scores from the sorted set stored at `key`.
If `count` is provided, up to `count` members with the highest scores are removed and returned.
Otherwise, only one member with the highest score is removed and returned.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `count`: the maximum number of popped elements. If not specified, pops one member. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

A list of the removed members and their scores, ordered from the one with the highest score to the one with the lowest.
If `key` doesn't exist, it will be treated as an empty sorted set and the command returns an empty map.
If `count` is higher than the sorted set's cardinality, returns all members and their scores, ordered from highest to lowest.

#### See

[https://valkey.io/commands/zpopmax/\|valkey.io](https://valkey.io/commands/zpopmax/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of zpopmax method to remove and return the member with the highest score from a sorted set
const result = await client.zpopmax("my_sorted_set");
console.log(result); // Output:
// 'member1' with a score of 10.0 has been removed from the sorted set
// [{ element: 'member1', score: 10.0 }]
```

```typescript
// Example usage of zpopmax method to remove and return multiple members with the highest scores from a sorted set
const result = await client.zpopmax("my_sorted_set", 2);
console.log(result); // Output:
// 'member3' with a score of 7.5 and 'member2' with a score of 8.0 have been removed from the sorted set
// [
//     { element: 'member3', score: 7.5 },
//     { element: 'member2', score: 8.0 }
// ]
```

***

### zpopmin()

> **zpopmin**(`key`, `options`?): `Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

Removes and returns the members with the lowest scores from the sorted set stored at `key`.
If `count` is provided, up to `count` members with the lowest scores are removed and returned.
Otherwise, only one member with the lowest score is removed and returned.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `count`: the maximum number of popped elements. If not specified, pops one member. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

A list of the removed members and their scores, ordered from the one with the lowest score to the one with the highest.
If `key` doesn't exist, it will be treated as an empty sorted set and the command returns an empty map.
If `count` is higher than the sorted set's cardinality, returns all members and their scores.

#### See

[https://valkey.io/commands/zpopmin/\|valkey.io](https://valkey.io/commands/zpopmin/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of zpopmin method to remove and return the member with the lowest score from a sorted set
const result = await client.zpopmin("my_sorted_set");
console.log(result); // Output:
// 'member1' with a score of 5.0 has been removed from the sorted set
// [{ element: 'member1', score: 5.0 }]
```

```typescript
// Example usage of zpopmin method to remove and return multiple members with the lowest scores from a sorted set
const result = await client.zpopmin("my_sorted_set", 2);
console.log(result); // Output:
// 'member3' with a score of 7.5 and 'member2' with a score of 8.0 have been removed from the sorted set
// [
//     { element: 'member3', score: 7.5 },
//     { element: 'member2', score: 8.0 }
// ]
```

***

### zrandmember()

> **zrandmember**(`key`, `options`?): `Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

Returns a random member from the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | - |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<`null` \| [`GlideString`](../type-aliases/GlideString.md)\>

A string representing a random member from the sorted set.
    If the sorted set does not exist or is empty, the response will be `null`.

#### See

[https://valkey.io/commands/zrandmember/\|valkey.io](https://valkey.io/commands/zrandmember/|valkey.io) for more details.

#### Examples

```typescript
const payload1 = await client.zrandmember("mySortedSet");
console.log(payload1); // Output: "Glide" (a random member from the set)
```

```typescript
const payload2 = await client.zrandmember("nonExistingSortedSet");
console.log(payload2); // Output: null since the sorted set does not exist.
```

***

### zrandmemberWithCount()

> **zrandmemberWithCount**(`key`, `count`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Returns random members from the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | - |
| `count` | `number` | The number of members to return. If `count` is positive, returns unique members. If negative, allows for duplicates. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

An `array` of members from the sorted set.
    If the sorted set does not exist or is empty, the response will be an empty `array`.

#### See

[https://valkey.io/commands/zrandmember/\|valkey.io](https://valkey.io/commands/zrandmember/|valkey.io) for more details.

#### Examples

```typescript
const payload1 = await client.zrandmemberWithCount("mySortedSet", -3);
console.log(payload1); // Output: ["Glide", "GLIDE", "node"]
```

```typescript
const payload2 = await client.zrandmemberWithCount("nonExistingKey", 3);
console.log(payload1); // Output: [] since the sorted set does not exist.
```

***

### zrandmemberWithCountWithScores()

> **zrandmemberWithCountWithScores**(`key`, `count`, `options`?): `Promise`\<[`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[]\>

Returns random members with scores from the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | - |
| `count` | `number` | The number of members to return. If `count` is positive, returns unique members. If negative, allows for duplicates. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[]\>

A list of [KeyWeight](../../Commands/type-aliases/KeyWeight.md) tuples, which store member names and their respective scores.
    If the sorted set does not exist or is empty, the response will be an empty `array`.

#### See

[https://valkey.io/commands/zrandmember/\|valkey.io](https://valkey.io/commands/zrandmember/|valkey.io) for more details.

#### Examples

```typescript
const payload1 = await client.zrandmemberWithCountWithScore("mySortedSet", -3);
console.log(payload1); // Output: [["Glide", 1.0], ["GLIDE", 1.0], ["node", 2.0]]
```

```typescript
const payload2 = await client.zrandmemberWithCountWithScore("nonExistingKey", 3);
console.log(payload1); // Output: [] since the sorted set does not exist.
```

***

### zrange()

> **zrange**(`key`, `rangeQuery`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Returns the specified range of elements in the sorted set stored at `key`.
`ZRANGE` can perform different types of range queries: by index (rank), by the score, or by lexicographical order.

To get the elements with their scores, see [zrangeWithScores](BaseClient.md#zrangewithscores).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `rangeQuery` | [`RangeByScore`](../../Commands/type-aliases/RangeByScore.md) \| [`RangeByLex`](../../Commands/type-aliases/RangeByLex.md) \| [`RangeByIndex`](../../Commands/interfaces/RangeByIndex.md) | The range query object representing the type of range query to perform. - For range queries by index (rank), use [RangeByIndex](../../Commands/interfaces/RangeByIndex.md). - For range queries by lexicographical order, use [RangeByLex](../../Commands/type-aliases/RangeByLex.md). - For range queries by score, use [RangeByScore](../../Commands/type-aliases/RangeByScore.md). |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `reverse`: if `true`, reverses the sorted set, with index `0` as the element with the highest score. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

A list of elements within the specified range.
If `key` does not exist, it is treated as an empty sorted set, and the command returns an empty array.

#### See

[https://valkey.io/commands/zrange/\|valkey.io](https://valkey.io/commands/zrange/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of zrange method to retrieve all members of a sorted set in ascending order
const result = await client.zrange("my_sorted_set", { start: 0, end: -1 });
console.log(result1); // Output: all members in ascending order
// ['member1', 'member2', 'member3']
```

```typescript
// Example usage of zrange method to retrieve members within a score range in descending order
const result = await client.zrange("my_sorted_set", {
             start: { value: 3, isInclusive: false },
             end: InfBoundary.NegativeInfinity,
             type: "byScore",
          }, { reverse: true });
console.log(result); // Output: members with scores within the range of negative infinity to 3, in descending order
// ['member2', 'member1']
```

***

### zrangeStore()

> **zrangeStore**(`destination`, `source`, `rangeQuery`, `reverse`): `Promise`\<`number`\>

Stores a specified range of elements from the sorted set at `source`, into a new
sorted set at `destination`. If `destination` doesn't exist, a new sorted
set is created; if it exists, it's overwritten.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | `undefined` | The key for the destination sorted set. |
| `source` | [`GlideString`](../type-aliases/GlideString.md) | `undefined` | The key of the source sorted set. |
| `rangeQuery` | [`RangeByScore`](../../Commands/type-aliases/RangeByScore.md) \| [`RangeByLex`](../../Commands/type-aliases/RangeByLex.md) \| [`RangeByIndex`](../../Commands/interfaces/RangeByIndex.md) | `undefined` | The range query object representing the type of range query to perform. - For range queries by index (rank), use [RangeByIndex](../../Commands/interfaces/RangeByIndex.md). - For range queries by lexicographical order, use [RangeByLex](../../Commands/type-aliases/RangeByLex.md). - For range queries by score, use [RangeByScore](../../Commands/type-aliases/RangeByScore.md). |
| `reverse` | `boolean` | `false` | If `true`, reverses the sorted set, with index `0` as the element with the highest score. |

#### Returns

`Promise`\<`number`\>

The number of elements in the resulting sorted set.

#### See

[https://valkey.io/commands/zrangestore/\|valkey.io](https://valkey.io/commands/zrangestore/|valkey.io) for more details.

#### Remarks

When in cluster mode, `destination` and `source` must map to the same hash slot.

#### Examples

```typescript
// Example usage of zrangeStore to retrieve and store all members of a sorted set in ascending order.
const result = await client.zrangeStore("destination_key", "my_sorted_set", { start: 0, end: -1 });
console.log(result); // Output: 7 - "destination_key" contains a sorted set with the 7 members from "my_sorted_set".
```

```typescript
// Example usage of zrangeStore method to retrieve members within a score range in ascending order and store in "destination_key"
const result = await client.zrangeStore("destination_key", "my_sorted_set", {
             start: InfBoundary.NegativeInfinity,
             end: { value: 3, isInclusive: false },
             type: "byScore",
          });
console.log(result); // Output: 5 - Stores 5 members with scores within the range of negative infinity to 3, in ascending order, in "destination_key".
```

***

### zrangeWithScores()

> **zrangeWithScores**(`key`, `rangeQuery`, `options`?): `Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

Returns the specified range of elements with their scores in the sorted set stored at `key`.
Similar to ZRange but with a `WITHSCORE` flag.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `rangeQuery` | [`RangeByScore`](../../Commands/type-aliases/RangeByScore.md) \| [`RangeByIndex`](../../Commands/interfaces/RangeByIndex.md) | The range query object representing the type of range query to perform. - For range queries by index (rank), use [RangeByIndex](../../Commands/interfaces/RangeByIndex.md). - For range queries by score, use [RangeByScore](../../Commands/type-aliases/RangeByScore.md). |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `reverse`: if `true`, reverses the sorted set, with index `0` as the element with the highest score. - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

A list of elements and their scores within the specified range.
If `key` does not exist, it is treated as an empty sorted set, and the command returns an empty list.

#### See

[https://valkey.io/commands/zrange/\|valkey.io](https://valkey.io/commands/zrange/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of zrangeWithScores method to retrieve members within a score range with their scores
const result = await client.zrangeWithScores("my_sorted_set", {
             start: { value: 10, isInclusive: false },
             end: { value: 20, isInclusive: false },
             type: "byScore",
          });
console.log(result); // Output: members with scores between 10 and 20 with their scores
// [{ element: 'member1', score: 10.5 }, { element: 'member2', score: 15.2 }]
```

```typescript
// Example usage of zrangeWithScores method to retrieve members within a score range with their scores
const result = await client.zrangeWithScores("my_sorted_set", {
             start: { value: 3, isInclusive: false },
             end: InfBoundary.NegativeInfinity,
             type: "byScore",
          }, { reverse: true });
console.log(result); // Output: members with scores within the range of negative infinity to 3, with their scores
// [{ element: 'member7', score: 1.5 }, { element: 'member4', score: -2.0 }]
```

***

### zrank()

> **zrank**(`key`, `member`): `Promise`\<`null` \| `number`\>

Returns the rank of `member` in the sorted set stored at `key`, with scores ordered from low to high.
To get the rank of `member` with its score, see [zrankWithScore](BaseClient.md#zrankwithscore).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../type-aliases/GlideString.md) | The member whose rank is to be retrieved. |

#### Returns

`Promise`\<`null` \| `number`\>

The rank of `member` in the sorted set.
If `key` doesn't exist, or if `member` is not present in the set, null will be returned.

#### See

[https://valkey.io/commands/zrank/\|valkey.io](https://valkey.io/commands/zrank/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of zrank method to retrieve the rank of a member in a sorted set
const result = await client.zrank("my_sorted_set", "member2");
console.log(result); // Output: 1 - Indicates that "member2" has the second-lowest score in the sorted set "my_sorted_set".
```

```typescript
// Example usage of zrank method with a non-existing member
const result = await client.zrank("my_sorted_set", "non_existing_member");
console.log(result); // Output: null - Indicates that "non_existing_member" is not present in the sorted set "my_sorted_set".
```

***

### zrankWithScore()

> **zrankWithScore**(`key`, `member`): `Promise`\<`null` \| \[`number`, `number`\]\>

Returns the rank of `member` in the sorted set stored at `key` with its score, where scores are ordered from the lowest to highest.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../type-aliases/GlideString.md) | The member whose rank is to be retrieved. |

#### Returns

`Promise`\<`null` \| \[`number`, `number`\]\>

A list containing the rank and score of `member` in the sorted set.
If `key` doesn't exist, or if `member` is not present in the set, null will be returned.

#### See

[https://valkey.io/commands/zrank/\|valkey.io](https://valkey.io/commands/zrank/|valkey.io) for more details.

#### Remarks

Since Valkey version 7.2.0.

#### Examples

```typescript
// Example usage of zrank_withscore method to retrieve the rank and score of a member in a sorted set
const result = await client.zrank_withscore("my_sorted_set", "member2");
console.log(result); // Output: [1, 6.0] - Indicates that "member2" with score 6.0 has the second-lowest score in the sorted set "my_sorted_set".
```

```typescript
// Example usage of zrank_withscore method with a non-existing member
const result = await client.zrank_withscore("my_sorted_set", "non_existing_member");
console.log(result); // Output: null - Indicates that "non_existing_member" is not present in the sorted set "my_sorted_set".
```

***

### zrem()

> **zrem**(`key`, `members`): `Promise`\<`number`\>

Removes the specified members from the sorted set stored at `key`.
Specified members that are not a member of this set are ignored.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `members` | [`GlideString`](../type-aliases/GlideString.md)[] | A list of members to remove from the sorted set. |

#### Returns

`Promise`\<`number`\>

The number of members that were removed from the sorted set, not including non-existing members.
If `key` does not exist, it is treated as an empty sorted set, and this command returns 0.

#### See

[https://valkey.io/commands/zrem/\|valkey.io](https://valkey.io/commands/zrem/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of the zrem function to remove members from a sorted set
const result = await client.zrem("my_sorted_set", ["member1", "member2"]);
console.log(result); // Output: 2 - Indicates that two members have been removed from the sorted set "my_sorted_set."
```

```typescript
// Example usage of the zrem function when the sorted set does not exist
const result = await client.zrem("non_existing_sorted_set", ["member1", "member2"]);
console.log(result); // Output: 0 - Indicates that no members were removed as the sorted set "non_existing_sorted_set" does not exist.
```

***

### zremRangeByLex()

> **zremRangeByLex**(`key`, `minLex`, `maxLex`): `Promise`\<`number`\>

Removes all elements in the sorted set stored at `key` with lexicographical order between `minLex` and `maxLex`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `minLex` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<[`GlideString`](../type-aliases/GlideString.md)\> | The minimum lex to count from. Can be negative infinity, or a specific lex and inclusivity. |
| `maxLex` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<[`GlideString`](../type-aliases/GlideString.md)\> | The maximum lex to count up to. Can be positive infinity, or a specific lex and inclusivity. |

#### Returns

`Promise`\<`number`\>

The number of members removed.
If `key` does not exist, it is treated as an empty sorted set, and the command returns 0.
If `minLex` is greater than `maxLex`, 0 is returned.

#### See

[https://valkey.io/commands/zremrangebylex/\|valkey.io](https://valkey.io/commands/zremrangebylex/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of zremRangeByLex method to remove members from a sorted set based on lexicographical order range
const result = await client.zremRangeByLex("my_sorted_set", { value: "a", isInclusive: false }, { value: "e" });
console.log(result); // Output: 4 - Indicates that 4 members, with lexicographical values ranging from "a" (exclusive) to "e" (inclusive), have been removed from "my_sorted_set".
```

```typescript
// Example usage of zremRangeByLex method when the sorted set does not exist
const result = await client.zremRangeByLex("non_existing_sorted_set", InfBoundary.NegativeInfinity, { value: "e" });
console.log(result); // Output: 0 - Indicates that no elements were removed.
```

***

### zremRangeByRank()

> **zremRangeByRank**(`key`, `start`, `end`): `Promise`\<`number`\>

Removes all elements in the sorted set stored at `key` with rank between `start` and `end`.
Both `start` and `end` are zero-based indexes with 0 being the element with the lowest score.
These indexes can be negative numbers, where they indicate offsets starting at the element with the highest score.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `start` | `number` | The starting point of the range. |
| `end` | `number` | The end of the range. |

#### Returns

`Promise`\<`number`\>

The number of members removed.
If `start` exceeds the end of the sorted set, or if `start` is greater than `end`, 0 returned.
If `end` exceeds the actual end of the sorted set, the range will stop at the actual end of the sorted set.
If `key` does not exist 0 will be returned.

#### See

[https://valkey.io/commands/zremrangebyrank/\|valkey.io](https://valkey.io/commands/zremrangebyrank/|valkey.io) for more details.

#### Example

```typescript
// Example usage of zremRangeByRank method
const result = await client.zremRangeByRank("my_sorted_set", 0, 2);
console.log(result); // Output: 3 - Indicates that three elements have been removed from the sorted set "my_sorted_set" between ranks 0 and 2.
```

***

### zremRangeByScore()

> **zremRangeByScore**(`key`, `minScore`, `maxScore`): `Promise`\<`number`\>

Removes all elements in the sorted set stored at `key` with a score between `minScore` and `maxScore`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `minScore` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`number`\> | The minimum score to remove from. Can be negative infinity, or specific score and inclusivity. |
| `maxScore` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`number`\> | The maximum score to remove to. Can be positive infinity, or specific score and inclusivity. |

#### Returns

`Promise`\<`number`\>

The number of members removed.
If `key` does not exist, it is treated as an empty sorted set, and the command returns 0.
If `minScore` is greater than `maxScore`, 0 is returned.

#### See

[https://valkey.io/commands/zremrangebyscore/\|valkey.io](https://valkey.io/commands/zremrangebyscore/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of zremRangeByScore method to remove members from a sorted set based on score range
const result = await client.zremRangeByScore("my_sorted_set", { value: 5.0, isInclusive: true }, InfBoundary.PositiveInfinity);
console.log(result); // Output: 2 - Indicates that 2 members with scores between 5.0 (inclusive) and +inf have been removed from the sorted set "my_sorted_set".
```

```typescript
// Example usage of zremRangeByScore method when the sorted set does not exist
const result = await client.zremRangeByScore("non_existing_sorted_set", { value: 5.0, isInclusive: true }, { value: 10.0, isInclusive: false });
console.log(result); // Output: 0 - Indicates that no members were removed as the sorted set "non_existing_sorted_set" does not exist.
```

***

### zrevrank()

> **zrevrank**(`key`, `member`): `Promise`\<`null` \| `number`\>

Returns the rank of `member` in the sorted set stored at `key`, where
scores are ordered from the highest to lowest, starting from `0`.
To get the rank of `member` with its score, see [zrevrankWithScore](BaseClient.md#zrevrankwithscore).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../type-aliases/GlideString.md) | The member whose rank is to be retrieved. |

#### Returns

`Promise`\<`null` \| `number`\>

The rank of `member` in the sorted set, where ranks are ordered from high to low based on scores.
    If `key` doesn't exist, or if `member` is not present in the set, `null` will be returned.

#### See

[https://valkey.io/commands/zrevrank/\|valkey.io](https://valkey.io/commands/zrevrank/|valkey.io) for more details.

#### Example

```typescript
const result = await client.zrevrank("my_sorted_set", "member2");
console.log(result); // Output: 1 - Indicates that "member2" has the second-highest score in the sorted set "my_sorted_set".
```

***

### zrevrankWithScore()

> **zrevrankWithScore**(`key`, `member`): `Promise`\<`null` \| \[`number`, `number`\]\>

Returns the rank of `member` in the sorted set stored at `key` with its
score, where scores are ordered from the highest to lowest, starting from `0`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../type-aliases/GlideString.md) | The member whose rank is to be retrieved. |

#### Returns

`Promise`\<`null` \| \[`number`, `number`\]\>

A list containing the rank and score of `member` in the sorted set, where ranks
    are ordered from high to low based on scores.
    If `key` doesn't exist, or if `member` is not present in the set, `null` will be returned.

#### See

[https://valkey.io/commands/zrevrank/\|valkey.io](https://valkey.io/commands/zrevrank/|valkey.io) for more details.

#### Remarks

Since Valkey version 7.2.0.

#### Example

```typescript
const result = await client.zrevankWithScore("my_sorted_set", "member2");
console.log(result); // Output: [1, 6.0] - Indicates that "member2" with score 6.0 has the second-highest score in the sorted set "my_sorted_set".
```

***

### zscan()

> **zscan**(`key`, `cursor`, `options`?): `Promise`\<\[`string`, [`GlideString`](../type-aliases/GlideString.md)[]\]\>

Iterates incrementally over a sorted set.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `cursor` | `string` | The cursor that points to the next iteration of results. A value of `"0"` indicates the start of the search. |
| `options`? | [`BaseScanOptions`](../../Commands/interfaces/BaseScanOptions.md) & `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) The `zscan` options - see [ZScanOptions](../../Commands/type-aliases/ZScanOptions.md) and [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<\[`string`, [`GlideString`](../type-aliases/GlideString.md)[]\]\>

An `Array` of the `cursor` and the subset of the sorted set held by `key`.
     The first element is always the `cursor` for the next iteration of results. `0` will be the `cursor`
     returned on the last iteration of the sorted set. The second element is always an `Array` of the subset
     of the sorted set held in `key`. The `Array` in the second element is a flattened series of
     `string` pairs, where the value is at even indices and the score is at odd indices.
     If `options.noScores` is to `true`, the second element will only contain the members without scores.

#### See

[https://valkey.io/commands/zscan/\|valkey.io](https://valkey.io/commands/zscan/|valkey.io) for more details.

#### Examples

```typescript
// Assume "key1" contains a sorted set with multiple members
let cursor = "0";
do {
     const result = await client.zscan(key1, cursor, {
         match: "*",
         count: 5,
     });
     cursor = result[0];
     console.log("Cursor: ", cursor);
     console.log("Members: ", result[1]);
} while (cursor !== "0");
// The output of the code above is something similar to:
// Cursor:  123
// Members:  ['value 163', '163', 'value 114', '114', 'value 25', '25', 'value 82', '82', 'value 64', '64']
// Cursor:  47
// Members:  ['value 39', '39', 'value 127', '127', 'value 43', '43', 'value 139', '139', 'value 211', '211']
// Cursor:  0
// Members:  ['value 55', '55', 'value 24', '24', 'value 90', '90', 'value 113', '113']
```

```typescript
// Zscan with no scores
let newCursor = "0";
let result = [];

do {
     result = await client.zscan(key1, newCursor, {
         match: "*",
         count: 5,
         noScores: true,
     });
     newCursor = result[0];
     console.log("Cursor: ", newCursor);
     console.log("Members: ", result[1]);
} while (newCursor !== "0");
// The output of the code above is something similar to:
// Cursor:  123
// Members:  ['value 163', 'value 114', 'value 25', 'value 82', 'value 64']
// Cursor:  47
// Members:  ['value 39', 'value 127', 'value 43', 'value 139', 'value 211']
// Cursor:  0
// Members:  ['value 55', 'value 24' 'value 90', 'value 113']
```

***

### zscore()

> **zscore**(`key`, `member`): `Promise`\<`null` \| `number`\>

Returns the score of `member` in the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../type-aliases/GlideString.md) | The member whose score is to be retrieved. |

#### Returns

`Promise`\<`null` \| `number`\>

The score of the member.
If `member` does not exist in the sorted set, null is returned.
If `key` does not exist, null is returned.

#### See

[https://valkey.io/commands/zscore/\|valkey.io](https://valkey.io/commands/zscore/|valkey.io) for more details.

#### Examples

```typescript
// Example usage of the zscore method∂∂ to get the score of a member in a sorted set
const result = await client.zscore("my_sorted_set", "member");
console.log(result); // Output: 10.5 - Indicates that the score of "member" in the sorted set "my_sorted_set" is 10.5.
```

```typescript
// Example usage of the zscore method when the member does not exist in the sorted set
const result = await client.zscore("my_sorted_set", "non_existing_member");
console.log(result); // Output: null
```

```typescript
// Example usage of the zscore method with non existimng key
const result = await client.zscore("non_existing_set", "member");
console.log(result); // Output: null
```

***

### zunion()

> **zunion**(`keys`, `options`?): `Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

Computes the union of sorted sets given by the specified `keys` and returns a list of union elements.

To get the scores as well, see [zunionWithScores](BaseClient.md#zunionwithscores).
To store the result in a key as a sorted set, see zunionStore.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `options`? | [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) See [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`GlideString`](../type-aliases/GlideString.md)[]\>

The resulting array of union elements.

#### See

[https://valkey.io/commands/zunion/\|valkey.io](https://valkey.io/commands/zunion/|valkey.io) for details.

#### Remarks

When in cluster mode, all keys in `keys` must map to the same hash slot.

#### Example

```typescript
await client.zadd("key1", {"member1": 10.5, "member2": 8.2});
await client.zadd("key2", {"member1": 9.5});
const result = await client.zunion(["key1", "key2"]);
console.log(result); // Output: ['member1', 'member2']
```

***

### zunionstore()

> **zunionstore**(`destination`, `keys`, `options`?): `Promise`\<`number`\>

Computes the union of sorted sets given by the specified `keys` and stores the result in `destination`.
If `destination` already exists, it is overwritten. Otherwise, a new sorted set will be created.
To get the result directly, see [zunionWithScores](BaseClient.md#zunionwithscores).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../type-aliases/GlideString.md) | The key of the destination sorted set. |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] \| [`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[] | The keys of the sorted sets with possible formats: - `GlideString[]` - for keys only. - `KeyWeight[]` - for weighted keys with their score multipliers. |
| `options`? | \{ `aggregationType`: [`AggregationType`](../../Commands/type-aliases/AggregationType.md); \} | (Optional) Additional parameters: - (Optional) `aggregationType`: the aggregation strategy to apply when combining the scores of elements. See [AggregationType](../../Commands/type-aliases/AggregationType.md). If `aggregationType` is not specified, defaults to `AggregationType.SUM`. |
| `options.aggregationType`? | [`AggregationType`](../../Commands/type-aliases/AggregationType.md) | - |

#### Returns

`Promise`\<`number`\>

The number of elements in the resulting sorted set stored at `destination`.

#### See

[https://valkey.io/commands/zunionstore/\|valkey.io](https://valkey.io/commands/zunionstore/|valkey.io) for details.

#### Remarks

When in cluster mode, `destination` and all keys in `keys` both must map to the same hash slot.

#### Examples

```typescript
await client.zadd("key1", {"member1": 10.5, "member2": 8.2})
await client.zadd("key2", {"member1": 9.5})

// use `zunionstore` with default aggregation and weights
console.log(await client.zunionstore("my_sorted_set", ["key1", "key2"]))
// Output: 2 - Indicates that the sorted set "my_sorted_set" contains two elements.
console.log(await client.zrangeWithScores("my_sorted_set", {start: 0, stop: -1}))
// Output: {'member1': 20, 'member2': 8.2} - "member1" is now stored in "my_sorted_set" with score of 20 and "member2" with score of 8.2.
```

```typescript
// use `zunionstore` with default weights
console.log(await client.zunionstore("my_sorted_set", ["key1", "key2"], { aggregationType: AggregationType.MAX }))
// Output: 2 - Indicates that the sorted set "my_sorted_set" contains two elements, and each score is the maximum score between the sets.
console.log(await client.zrangeWithScores("my_sorted_set", {start: 0, stop: -1}))
// Output: {'member1': 10.5, 'member2': 8.2} - "member1" is now stored in "my_sorted_set" with score of 10.5 and "member2" with score of 8.2.
```

```typescript
// use `zunionstore` with default aggregation
console.log(await client.zunionstore("my_sorted_set", [["key1", 2], ["key2", 1]])) // Output: 2
console.log(await client.zrangeWithScores("my_sorted_set", {start: 0, stop: -1})) // Output: { member2: 16.4, member1: 30.5 }
```

***

### zunionWithScores()

> **zunionWithScores**(`keys`, `options`?): `Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

Computes the intersection of sorted sets given by the specified `keys` and returns a list of union elements with scores.
To get the elements only, see [zunion](BaseClient.md#zunion).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../type-aliases/GlideString.md)[] \| [`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[] | The keys of the sorted sets with possible formats: - string[] - for keys only. - KeyWeight[] - for weighted keys with score multipliers. |
| `options`? | `object` & [`DecoderOption`](../interfaces/DecoderOption.md) | (Optional) Additional parameters: - (Optional) `aggregationType`: the aggregation strategy to apply when combining the scores of elements. If `aggregationType` is not specified, defaults to `AggregationType.SUM`. See [AggregationType](../../Commands/type-aliases/AggregationType.md). - (Optional) `decoder`: see [DecoderOption](../interfaces/DecoderOption.md). |

#### Returns

`Promise`\<[`SortedSetDataType`](../type-aliases/SortedSetDataType.md)\>

A list of elements and their scores representing the intersection of the sorted sets.

#### Remarks

When in cluster mode, all keys in `keys` must map to the same hash slot.

#### See

[https://valkey.io/commands/zunion/\|valkey.io](https://valkey.io/commands/zunion/|valkey.io) for details.

#### Example

```typescript
await client.zadd("key1", {"member1": 10.5, "member2": 8.2});
await client.zadd("key2", {"member1": 9.5});
const result1 = await client.zunionWithScores(["key1", "key2"]);
console.log(result1); // Output:
// [{ element: 'member1', score: 20 }, { element: 'member2', score: 8.2 }]
const result2 = await client.zunionWithScores(["key1", "key2"], "MAX");
console.log(result2); // Output:
// [{ element: 'member1', score: 10.5}, { element: 'member2', score: 8.2 }]
```

***

### \_\_createClientInternal()

> `protected` `static` **\_\_createClientInternal**\<`TConnection`\>(`options`, `connectedSocket`, `constructor`): `Promise`\<`TConnection`\>

**`Internal`**

#### Type Parameters

| Type Parameter |
| ------ |
| `TConnection` *extends* [`BaseClient`](BaseClient.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`BaseClientConfiguration`](../interfaces/BaseClientConfiguration.md) |
| `connectedSocket` | `Socket` |
| `constructor` | (`socket`, `options`?) => `TConnection` |

#### Returns

`Promise`\<`TConnection`\>

***

### createClientInternal()

> `protected` `static` **createClientInternal**\<`TConnection`\>(`options`, `constructor`): `Promise`\<`TConnection`\>

**`Internal`**

#### Type Parameters

| Type Parameter |
| ------ |
| `TConnection` *extends* [`BaseClient`](BaseClient.md) |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`BaseClientConfiguration`](../interfaces/BaseClientConfiguration.md) |
| `constructor` | (`socket`, `options`?) => `TConnection` |

#### Returns

`Promise`\<`TConnection`\>

***

### GetSocket()

> `protected` `static` **GetSocket**(`path`): `Promise`\<`Socket`\>

**`Internal`**

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

#### Returns

`Promise`\<`Socket`\>
