[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Transaction](../README.md) / BaseTransaction

# Class: BaseTransaction\<T\>

Base class encompassing shared commands for both standalone and cluster mode implementations in a transaction.
Transactions allow the execution of a group of commands in a single step.

Command Response:
 An array of command responses is returned by the client exec command, in the order they were given.
 Each element in the array represents a command given to the transaction.
 The response for each command depends on the executed Valkey command.
 Specific response types are documented alongside each method.

## Example

```typescript
const transaction = new BaseTransaction()
   .set("key", "value")
   .get("key");
const result = await client.exec(transaction);
console.log(result); // Output: ['OK', 'value']
```

## Extended by

- [`Transaction`](Transaction.md)
- [`ClusterTransaction`](ClusterTransaction.md)

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* [`BaseTransaction`](BaseTransaction.md)\<`T`\> |

## Constructors

### new BaseTransaction()

> **new BaseTransaction**\<`T`\>(): [`BaseTransaction`](BaseTransaction.md)\<`T`\>

#### Returns

[`BaseTransaction`](BaseTransaction.md)\<`T`\>

## Properties

| Property | Modifier | Type | Default value | Description |
| ------ | ------ | ------ | ------ | ------ |
| <a id="commands"></a> `commands` | `readonly` | `Command`[] | `[]` | **`Internal`** |
| <a id="setcommandsindexes"></a> `setCommandsIndexes` | `readonly` | `number`[] | `[]` | **`Internal`** Array of command indexes indicating commands that need to be converted into a `Set` within the transaction. |

## Methods

### addAndReturn()

> `protected` **addAndReturn**(`command`, `shouldConvertToSet`): `T`

Adds a command to the transaction and returns the transaction instance.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `command` | `Command` | `undefined` | The command to add. |
| `shouldConvertToSet` | `boolean` | `false` | Indicates if the command should be converted to a `Set`. |

#### Returns

`T`

The updated transaction instance.

***

### append()

> **append**(`key`, `value`): `T`

Appends a `value` to a `key`. If `key` does not exist it is created and set as an empty string,
so `APPEND` will be similar to [set](BaseTransaction.md#set) in this special case.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the string. |
| `value` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the string. Command Response - The length of the string after appending the value. |

#### Returns

`T`

#### See

[https://valkey.io/commands/append/\|valkey.io](https://valkey.io/commands/append/|valkey.io) for details.

***

### bitcount()

> **bitcount**(`key`, `options`?): `T`

Counts the number of set bits (population counting) in the string stored at `key`. The `options` argument can
optionally be provided to count the number of bits in a specific string interval.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key for the string to count the set bits of. |
| `options`? | [`BitOffsetOptions`](../../Commands/interfaces/BitOffsetOptions.md) | The offset options - see [BitOffsetOptions](../../Commands/interfaces/BitOffsetOptions.md). Command Response - If `options` is provided, returns the number of set bits in the string interval specified by `options`. If `options` is not provided, returns the number of set bits in the string stored at `key`. Otherwise, if `key` is missing, returns `0` as it is treated as an empty string. |

#### Returns

`T`

#### See

[https://valkey.io/commands/bitcount/\|valkey.io](https://valkey.io/commands/bitcount/|valkey.io) for more details.

***

### bitfield()

> **bitfield**(`key`, `subcommands`): `T`

Reads or modifies the array of bits representing the string that is held at `key` based on the specified
`subcommands`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the string. |
| `subcommands` | [`BitFieldSubCommands`](../../Commands/interfaces/BitFieldSubCommands.md)[] | The subcommands to be performed on the binary value of the string at `key`, which could be any of the following: - [BitFieldGet](../../Commands/classes/BitFieldGet.md) - [BitFieldSet](../../Commands/classes/BitFieldSet.md) - [BitFieldIncrBy](../../Commands/classes/BitFieldIncrBy.md) - [BitFieldOverflow](../../Commands/classes/BitFieldOverflow.md) Command Response - An array of results from the executed subcommands: - [BitFieldGet](../../Commands/classes/BitFieldGet.md) returns the value in [BitOffset](../../Commands/classes/BitOffset.md) or [BitOffsetMultiplier](../../Commands/classes/BitOffsetMultiplier.md). - [BitFieldSet](../../Commands/classes/BitFieldSet.md) returns the old value in [BitOffset](../../Commands/classes/BitOffset.md) or [BitOffsetMultiplier](../../Commands/classes/BitOffsetMultiplier.md). - [BitFieldIncrBy](../../Commands/classes/BitFieldIncrBy.md) returns the new value in [BitOffset](../../Commands/classes/BitOffset.md) or [BitOffsetMultiplier](../../Commands/classes/BitOffsetMultiplier.md). - [BitFieldOverflow](../../Commands/classes/BitFieldOverflow.md) determines the behavior of the [BitFieldSet](../../Commands/classes/BitFieldSet.md) and [BitFieldIncrBy](../../Commands/classes/BitFieldIncrBy.md) subcommands when an overflow or underflow occurs. [BitFieldOverflow](../../Commands/classes/BitFieldOverflow.md) does not return a value and does not contribute a value to the array response. |

#### Returns

`T`

#### See

[https://valkey.io/commands/bitfield/\|valkey.io](https://valkey.io/commands/bitfield/|valkey.io) for details.

***

### bitfieldReadOnly()

> **bitfieldReadOnly**(`key`, `subcommands`): `T`

Reads the array of bits representing the string that is held at `key` based on the specified `subcommands`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the string. |
| `subcommands` | [`BitFieldGet`](../../Commands/classes/BitFieldGet.md)[] | The [BitFieldGet](../../Commands/classes/BitFieldGet.md) subcommands to be performed. Command Response - An array of results from the [BitFieldGet](../../Commands/classes/BitFieldGet.md) subcommands. |

#### Returns

`T`

#### See

[https://valkey.io/commands/bitfield\_ro/\|valkey.io](https://valkey.io/commands/bitfield_ro/|valkey.io) for details.

#### Remarks

Since Valkey version 6.0.0.

***

### bitop()

> **bitop**(`operation`, `destination`, `keys`): `T`

Perform a bitwise operation between multiple keys (containing string values) and store the result in the
`destination`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `operation` | [`BitwiseOperation`](../../Commands/enumerations/BitwiseOperation.md) | The bitwise operation to perform. |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key that will store the resulting string. |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The list of keys to perform the bitwise operation on. Command Response - The size of the string stored in `destination`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/bitop/\|valkey.io](https://valkey.io/commands/bitop/|valkey.io) for details.

***

### bitpos()

> **bitpos**(`key`, `bit`, `options`?): `T`

Returns the position of the first bit matching the given `bit` value. The optional starting offset
`start` is a zero-based index, with `0` being the first byte of the list, `1` being the next byte and so on.
The offset can also be a negative number indicating an offset starting at the end of the list, with `-1` being
the last byte of the list, `-2` being the penultimate, and so on.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the string. |
| `bit` | `number` | The bit value to match. Must be `0` or `1`. |
| `options`? | [`BitOffsetOptions`](../../Commands/interfaces/BitOffsetOptions.md) | (Optional) The [BitOffsetOptions](../../Commands/interfaces/BitOffsetOptions.md). Command Response - The position of the first occurrence of `bit` in the binary value of the string held at `key`. If `start` was provided, the search begins at the offset indicated by `start`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/bitpos/\|valkey.io](https://valkey.io/commands/bitpos/|valkey.io) for details.

***

### blmove()

> **blmove**(`source`, `destination`, `whereFrom`, `whereTo`, `timeout`): `T`

Blocks the connection until it pops atomically and removes the left/right-most element to the
list stored at `source` depending on `whereFrom`, and pushes the element at the first/last element
of the list stored at `destination` depending on `whereTo`.
`BLMOVE` is the blocking variant of [lmove](BaseTransaction.md#lmove).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `source` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to the source list. |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to the destination list. |
| `whereFrom` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The [ListDirection](../../Commands/enumerations/ListDirection.md) to remove the element from. |
| `whereTo` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The [ListDirection](../../Commands/enumerations/ListDirection.md) to add the element to. |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely. Command Response - The popped element, or `null` if `source` does not exist or if the operation timed-out. |

#### Returns

`T`

#### See

[https://valkey.io/commands/blmove/\|valkey.io](https://valkey.io/commands/blmove/|valkey.io) for details.

#### Remarks

When in cluster mode, both `source` and `destination` must map to the same hash slot.

***

### blmpop()

> **blmpop**(`keys`, `direction`, `timeout`, `count`?): `T`

Blocks the connection until it pops one or more elements from the first non-empty list from the
provided `key`. `BLMPOP` is the blocking variant of [lmpop](BaseTransaction.md#lmpop).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | An array of keys to lists. |
| `direction` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The direction based on which elements are popped from - see [ListDirection](../../Commands/enumerations/ListDirection.md). |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely. |
| `count`? | `number` | (Optional) The maximum number of popped elements. Command Response - A `Record` which stores the key name where elements were popped out and the array of popped elements. If no member could be popped and the timeout expired, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/blmpop/\|valkey.io](https://valkey.io/commands/blmpop/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### blpop()

> **blpop**(`keys`, `timeout`): `T`

Blocking list pop primitive.
Pop an element from the head of the first list that is non-empty,
with the given `keys` being checked in the order that they are given.
Blocks the connection when there are no elements to pop from any of the given lists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The `keys` of the lists to pop from. |
| `timeout` | `number` | The `timeout` in seconds. Command Response - An `array` containing the `key` from which the element was popped and the value of the popped element, formatted as [key, value]. If no element could be popped and the timeout expired, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/blpop/\|valkey.io](https://valkey.io/commands/blpop/|valkey.io) for details.

#### Remarks

`BLPOP` is a blocking command, see [Blocking Commands](https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands) for more details and best practices.

***

### brpop()

> **brpop**(`keys`, `timeout`): `T`

Blocking list pop primitive.
Pop an element from the tail of the first list that is non-empty,
with the given `keys` being checked in the order that they are given.
Blocks the connection when there are no elements to pop from any of the given lists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The `keys` of the lists to pop from. |
| `timeout` | `number` | The `timeout` in seconds. Command Response - An `array` containing the `key` from which the element was popped and the value of the popped element, formatted as [key, value]. If no element could be popped and the timeout expired, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/brpop/\|valkey.io](https://valkey.io/commands/brpop/|valkey.io) for details.

#### Remarks

`BRPOP` is a blocking command, see [Blocking Commands](https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands) for more details and best practices.

***

### bzmpop()

> **bzmpop**(`keys`, `modifier`, `timeout`, `count`?): `T`

Pops a member-score pair from the first non-empty sorted set, with the given `keys` being
checked in the order they are provided. Blocks the connection when there are no members
to pop from any of the given sorted sets. `BZMPOP` is the blocking variant of [zmpop](BaseTransaction.md#zmpop).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `modifier` | [`ScoreFilter`](../../Commands/enumerations/ScoreFilter.md) | The element pop criteria - either [ScoreFilter.MIN](../../Commands/enumerations/ScoreFilter.md#min) or [ScoreFilter.MAX](../../Commands/enumerations/ScoreFilter.md#max) to pop the member with the lowest/highest score accordingly. |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely. |
| `count`? | `number` | (Optional) The number of elements to pop. If not supplied, only one element will be popped. Command Response - A two-element `array` containing the key name of the set from which the element was popped, and a `GlideRecord<number>` of the popped elements - see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). If no member could be popped, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/bzmpop/\|valkey.io](https://valkey.io/commands/bzmpop/|valkey.io) for details.

#### Remarks

`BZMPOP` is a client blocking command, see [Valkey Glide Wiki](https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#blocking-commands) for more details and best practices.

***

### bzpopmax()

> **bzpopmax**(`keys`, `timeout`): `T`

Blocks the connection until it removes and returns a member with the highest score from the
first non-empty sorted set, with the given `key` being checked in the order they
are provided.
`BZPOPMAX` is the blocking variant of [zpopmax](BaseTransaction.md#zpopmax).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely. Since 6.0.0: timeout is interpreted as a double instead of an integer. Command Response - An `array` containing the key where the member was popped out, the member, itself, and the member score. If no member could be popped and the `timeout` expired, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/bzpopmax/\|valkey.io](https://valkey.io/commands/bzpopmax/|valkey.io) for details.

***

### bzpopmin()

> **bzpopmin**(`keys`, `timeout`): `T`

Blocks the connection until it removes and returns a member with the lowest score from the
first non-empty sorted set, with the given `key` being checked in the order they
are provided.
`BZPOPMIN` is the blocking variant of [zpopmin](BaseTransaction.md#zpopmin).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `timeout` | `number` | The number of seconds to wait for a blocking operation to complete. A value of `0` will block indefinitely. Since Valkey version 6.0.0: timeout is interpreted as a double instead of an integer. Command Response - An `array` containing the key where the member was popped out, the member, itself, and the member score. If no member could be popped and the `timeout` expired, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/bzpopmin/\|valkey.io](https://valkey.io/commands/bzpopmin/|valkey.io) for details.

***

### clientGetName()

> **clientGetName**(): `T`

Gets the name of the connection on which the transaction is being executed.

#### Returns

`T`

#### See

[https://valkey.io/commands/client-getname/\|valkey.io](https://valkey.io/commands/client-getname/|valkey.io) for details.

Command Response - The name of the client connection as a string if a name is set, or null if no name is assigned.

***

### clientId()

> **clientId**(): `T`

Returns the current connection ID.

#### Returns

`T`

#### See

[https://valkey.io/commands/client-id/\|valkey.io](https://valkey.io/commands/client-id/|valkey.io) for details.

Command Response - The ID of the connection.

***

### configGet()

> **configGet**(`parameters`): `T`

Reads the configuration parameters of the running server.
Starting from server version 7, command supports multiple parameters.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `parameters` | `string`[] | A list of configuration parameter names to retrieve values for. Command Response - A map of values corresponding to the configuration parameters. |

#### Returns

`T`

#### See

[https://valkey.io/commands/config-get/\|valkey.io](https://valkey.io/commands/config-get/|valkey.io) for details.

***

### configResetStat()

> **configResetStat**(): `T`

Resets the statistics reported by Valkey using the `INFO` and `LATENCY HISTOGRAM` commands.

#### Returns

`T`

#### See

[https://valkey.io/commands/config-resetstat/\|valkey.io](https://valkey.io/commands/config-resetstat/|valkey.io) for details.

Command Response - always "OK".

***

### configRewrite()

> **configRewrite**(): `T`

Rewrites the configuration file with the current configuration.

#### Returns

`T`

#### See

[https://valkey.io/commands/select/\|valkey.io](https://valkey.io/commands/select/|valkey.io) for details.

Command Response - "OK" when the configuration was rewritten properly. Otherwise, the transaction fails with an error.

***

### configSet()

> **configSet**(`parameters`): `T`

Sets configuration parameters to the specified values.
Starting from server version 7, command supports multiple parameters.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `parameters` | `Record`\<`string`, [`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> | A map consisting of configuration parameters and their respective values to set. Command Response - "OK" when the configuration was set properly. Otherwise, the transaction fails with an error. |

#### Returns

`T`

#### See

[https://valkey.io/commands/config-set/\|valkey.io](https://valkey.io/commands/config-set/|valkey.io) for details.

***

### customCommand()

> **customCommand**(`args`): `T`

Executes a single command, without checking inputs. Every part of the command, including subcommands,
 should be added as a separate value in args.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `args` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] |

#### Returns

`T`

#### See

[Glide Wiki](https://github.com/valkey-io/valkey-glide/wiki/General-Concepts#custom-command|Valkey) for details on the restrictions and limitations of the custom command API.

Command Response - A response from Valkey with an `Object`.

***

### dbsize()

> **dbsize**(): `T`

Returns the number of keys in the currently selected database.

#### Returns

`T`

#### See

[https://valkey.io/commands/dbsize/\|valkey.io](https://valkey.io/commands/dbsize/|valkey.io) for details.

Command Response - The number of keys in the currently selected database.

***

### decr()

> **decr**(`key`): `T`

Decrements the number stored at `key` by one. If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to decrement its value. Command Response - the value of `key` after the decrement. |

#### Returns

`T`

#### See

[https://valkey.io/commands/decr/\|valkey.io](https://valkey.io/commands/decr/|valkey.io) for details.

***

### decrBy()

> **decrBy**(`key`, `amount`): `T`

Decrements the number stored at `key` by `amount`. If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to decrement its value. |
| `amount` | `number` | The amount to decrement. Command Response - the value of `key` after the decrement. |

#### Returns

`T`

#### See

[https://valkey.io/commands/decrby/\|valkey.io](https://valkey.io/commands/decrby/|valkey.io) for details.

***

### del()

> **del**(`keys`): `T`

Removes the specified keys. A key is ignored if it does not exist.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of keys to be deleted from the database. Command Response - The number of keys that were removed. |

#### Returns

`T`

#### See

[https://valkey.io/commands/del/\|valkey.io](https://valkey.io/commands/del/|valkey.io) for details.

***

### dump()

> **dump**(`key`): `T`

Serialize the value stored at `key` in a Valkey-specific format and return it to the user.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The `key` to serialize. Command Response - The serialized value of the data stored at `key`. If `key` does not exist, `null` will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/dump/\|valkey.io](https://valkey.io/commands/dump/|valkey.io) for details.

#### Remarks

To execute a transaction with a `dump` command, the `exec` command requires `Decoder.Bytes` to handle the response.

***

### echo()

> **echo**(`message`): `T`

Echoes the provided `message` back

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The message to be echoed back. Command Response - The provided `message`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/echo/\|valkey.io](https://valkey.io/commands/echo/|valkey.io) for more details.

***

### exists()

> **exists**(`keys`): `T`

Returns the number of keys in `keys` that exist in the database.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys list to check. Command Response - the number of keys that exist. If the same existing key is mentioned in `keys` multiple times, it will be counted multiple times. |

#### Returns

`T`

#### See

[https://valkey.io/commands/exists/\|valkey.io](https://valkey.io/commands/exists/|valkey.io) for details.

***

### expire()

> **expire**(`key`, `seconds`, `options`?): `T`

Sets a timeout on `key` in seconds. After the timeout has expired, the key will automatically be deleted.
If `key` already has an existing expire set, the time to live is updated to the new value.
If `seconds` is non-positive number, the key will be deleted rather than expired.
The timeout will only be cleared by commands that delete or overwrite the contents of `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to set timeout on it. |
| `seconds` | `number` | The timeout in seconds. |
| `options`? | \{ `expireOption`: [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md); \} | (Optional) Additional parameters: - (Optional) `expireOption`: the expire option - see [ExpireOptions](../../Commands/enumerations/ExpireOptions.md). Command Response - `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist, or operation skipped due to the provided arguments. |
| `options.expireOption`? | [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/expire/\|valkey.io](https://valkey.io/commands/expire/|valkey.io) for details.

***

### expireAt()

> **expireAt**(`key`, `unixSeconds`, `options`?): `T`

Sets a timeout on `key`. It takes an absolute Unix timestamp (seconds since January 1, 1970) instead of specifying the number of seconds.
A timestamp in the past will delete the key immediately. After the timeout has expired, the key will automatically be deleted.
If `key` already has an existing expire set, the time to live is updated to the new value.
The timeout will only be cleared by commands that delete or overwrite the contents of `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to set timeout on it. |
| `unixSeconds` | `number` | The timeout in an absolute Unix timestamp. |
| `options`? | \{ `expireOption`: [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md); \} | (Optional) Additional parameters: - (Optional) `expireOption`: the expire option - see [ExpireOptions](../../Commands/enumerations/ExpireOptions.md). Command Response - `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist, or operation skipped due to the provided arguments. |
| `options.expireOption`? | [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/expireat/\|valkey.io](https://valkey.io/commands/expireat/|valkey.io) for details.

***

### expireTime()

> **expireTime**(`key`): `T`

Returns the absolute Unix timestamp (since January 1, 1970) at which the given `key` will expire, in seconds.
To get the expiration with millisecond precision, use pexpiretime.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The `key` to determine the expiration value of. Command Response - The expiration Unix timestamp in seconds, `-2` if `key` does not exist or `-1` if `key` exists but has no associated expire. |

#### Returns

`T`

#### See

[https://valkey.io/commands/expiretime/\|valkey.io](https://valkey.io/commands/expiretime/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### fcall()

> **fcall**(`func`, `keys`, `args`): `T`

Invokes a previously loaded function.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `func` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The function name. |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of `keys` accessed by the function. To ensure the correct execution of functions, all names of keys that a function accesses must be explicitly provided as `keys`. |
| `args` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of `function` arguments and it should not represent names of keys. Command Response - The invoked function's return value. |

#### Returns

`T`

#### See

[https://valkey.io/commands/fcall/\|valkey.io](https://valkey.io/commands/fcall/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### fcallReadonly()

> **fcallReadonly**(`func`, `keys`, `args`): `T`

Invokes a previously loaded read-only function.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `func` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The function name. |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of `keys` accessed by the function. To ensure the correct execution of functions, all names of keys that a function accesses must be explicitly provided as `keys`. |
| `args` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of `function` arguments and it should not represent names of keys. Command Response - The invoked function's return value. |

#### Returns

`T`

#### See

[https://valkey.io/commands/fcall/\|valkey.io](https://valkey.io/commands/fcall/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### flushall()

> **flushall**(`mode`?): `T`

Deletes all the keys of all the existing databases. This command never fails.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `mode`? | [`FlushMode`](../../Commands/enumerations/FlushMode.md) | (Optional) The flushing mode, could be either [FlushMode.SYNC](../../Commands/enumerations/FlushMode.md#sync) or [FlushMode.ASYNC](../../Commands/enumerations/FlushMode.md#async). Command Response - `"OK"`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/flushall/\|valkey.io](https://valkey.io/commands/flushall/|valkey.io) for details.

***

### flushdb()

> **flushdb**(`mode`?): `T`

Deletes all the keys of the currently selected database. This command never fails.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `mode`? | [`FlushMode`](../../Commands/enumerations/FlushMode.md) | (Optional) The flushing mode, could be either [FlushMode.SYNC](../../Commands/enumerations/FlushMode.md#sync) or [FlushMode.ASYNC](../../Commands/enumerations/FlushMode.md#async). Command Response - `"OK"`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/flushdb/\|valkey.io](https://valkey.io/commands/flushdb/|valkey.io) for details.

***

### functionDelete()

> **functionDelete**(`libraryCode`): `T`

Deletes a library and all its functions.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `libraryCode` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The library name to delete. Command Response - `"OK"`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/function-delete/\|valkey.io](https://valkey.io/commands/function-delete/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### functionDump()

> **functionDump**(): `T`

Returns the serialized payload of all loaded libraries.

#### Returns

`T`

#### See

[https://valkey.io/commands/function-dump/\|valkey.io](https://valkey.io/commands/function-dump/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### functionFlush()

> **functionFlush**(`mode`?): `T`

Deletes all function libraries.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `mode`? | [`FlushMode`](../../Commands/enumerations/FlushMode.md) | (Optional) The flushing mode, could be either [FlushMode.SYNC](../../Commands/enumerations/FlushMode.md#sync) or [FlushMode.ASYNC](../../Commands/enumerations/FlushMode.md#async). Command Response - `"OK"`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/function-flush/\|valkey.io](https://valkey.io/commands/function-flush/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### functionList()

> **functionList**(`options`?): `T`

Returns information about the functions and libraries.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options`? | [`FunctionListOptions`](../../Commands/interfaces/FunctionListOptions.md) | (Optional) Parameters to filter and request additional info. Command Response - Info about all or selected libraries and their functions in [FunctionListResponse](../../Commands/type-aliases/FunctionListResponse.md) format. |

#### Returns

`T`

#### See

[https://valkey.io/commands/function-list/\|valkey.io](https://valkey.io/commands/function-list/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### functionLoad()

> **functionLoad**(`libraryCode`, `replace`?): `T`

Loads a library to Valkey.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `libraryCode` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The source code that implements the library. |
| `replace`? | `boolean` | (Optional) Whether the given library should overwrite a library with the same name if it already exists. Command Response - The library name that was loaded. |

#### Returns

`T`

#### See

[https://valkey.io/commands/function-load/\|valkey.io](https://valkey.io/commands/function-load/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### functionRestore()

> **functionRestore**(`payload`, `policy`?): `T`

Restores libraries from the serialized payload returned by [functionDump](BaseTransaction.md#functiondump).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `payload` | `Buffer` | The serialized data from [functionDump](BaseTransaction.md#functiondump). |
| `policy`? | [`FunctionRestorePolicy`](../../Commands/enumerations/FunctionRestorePolicy.md) | (Optional) A policy for handling existing libraries. Command Response - `"OK"`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/function-restore/\|valkey.io](https://valkey.io/commands/function-restore/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### functionStats()

> **functionStats**(): `T`

Returns information about the function that's currently running and information about the
available execution engines.

#### Returns

`T`

#### See

[https://valkey.io/commands/function-stats/\|valkey.io](https://valkey.io/commands/function-stats/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

Command Response - A `Record` of type [FunctionStatsSingleResponse](../../Commands/type-aliases/FunctionStatsSingleResponse.md) with two keys:

- `"running_script"` with information about the running script.
- `"engines"` with information about available engines and their stats.

***

### geoadd()

> **geoadd**(`key`, `membersToGeospatialData`, `options`?): `T`

Adds geospatial members with their positions to the specified sorted set stored at `key`.
If a member is already a part of the sorted set, its position is updated.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `membersToGeospatialData` | `Map`\<[`GlideString`](../../BaseClient/type-aliases/GlideString.md), [`GeospatialData`](../../Commands/interfaces/GeospatialData.md)\> | A mapping of member names to their corresponding positions - see [GeospatialData](../../Commands/interfaces/GeospatialData.md). The command will report an error when the user attempts to index coordinates outside the specified ranges. |
| `options`? | [`GeoAddOptions`](../../Commands/interfaces/GeoAddOptions.md) | The GeoAdd options - see [GeoAddOptions](../../Commands/interfaces/GeoAddOptions.md). Command Response - The number of elements added to the sorted set. If `changed` is set to `true` in the options, returns the number of elements updated in the sorted set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/geoadd/\|valkey.io](https://valkey.io/commands/geoadd/|valkey.io) for details.

***

### geodist()

> **geodist**(`key`, `member1`, `member2`, `options`?): `T`

Returns the distance between `member1` and `member2` saved in the geospatial index stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `member1` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The name of the first member. |
| `member2` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The name of the second member. |
| `options`? | \{ `unit`: [`GeoUnit`](../../Commands/enumerations/GeoUnit.md); \} | (Optional) Additional parameters: - (Optional) `unit`: the unit of distance measurement - see [GeoUnit](../../Commands/enumerations/GeoUnit.md). If not specified, the [GeoUnit.METERS](../../Commands/enumerations/GeoUnit.md#meters) is used as a default unit. Command Response - The distance between `member1` and `member2`. Returns `null`, if one or both members do not exist, or if the key does not exist. |
| `options.unit`? | [`GeoUnit`](../../Commands/enumerations/GeoUnit.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/geodist/\|valkey.io](https://valkey.io/commands/geodist/|valkey.io) for details.

***

### geohash()

> **geohash**(`key`, `members`): `T`

Returns the `GeoHash` strings representing the positions of all the specified `members` in the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `members` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The array of members whose `GeoHash` strings are to be retrieved. Command Response - An array of `GeoHash` strings representing the positions of the specified members stored at `key`. If a member does not exist in the sorted set, a `null` value is returned for that member. |

#### Returns

`T`

#### See

[https://valkey.io/commands/geohash/\|valkey.io](https://valkey.io/commands/geohash/|valkey.io) for details.

***

### geopos()

> **geopos**(`key`, `members`): `T`

Returns the positions (longitude, latitude) of all the specified `members` of the
geospatial index represented by the sorted set at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `members` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The members for which to get the positions. Command Response - A 2D `Array` which represents positions (longitude and latitude) corresponding to the given members. The order of the returned positions matches the order of the input members. If a member does not exist, its position will be `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/geopos/\|valkey.io](https://valkey.io/commands/geopos/|valkey.io) for more details.

***

### geosearch()

> **geosearch**(`key`, `searchFrom`, `searchBy`, `resultOptions`?): `T`

Returns the members of a sorted set populated with geospatial information using [geoadd](BaseTransaction.md#geoadd),
which are within the borders of the area specified by a given shape.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `searchFrom` | [`SearchOrigin`](../../Commands/type-aliases/SearchOrigin.md) | The query's center point options, could be one of: - [MemberOrigin](../../Commands/interfaces/MemberOrigin.md) to use the position of the given existing member in the sorted set. - [CoordOrigin](../../Commands/interfaces/CoordOrigin.md) to use the given longitude and latitude coordinates. |
| `searchBy` | [`GeoSearchShape`](../../Commands/type-aliases/GeoSearchShape.md) | The query's shape options, could be one of: - [GeoCircleShape](../../Commands/interfaces/GeoCircleShape.md) to search inside circular area according to given radius. - [GeoBoxShape](../../Commands/interfaces/GeoBoxShape.md) to search inside an axis-aligned rectangle, determined by height and width. |
| `resultOptions`? | [`GeoSearchResultOptions`](../../Commands/type-aliases/GeoSearchResultOptions.md) | The optional inputs to request additional information and configure sorting/limiting the results, see [GeoSearchResultOptions](../../Commands/type-aliases/GeoSearchResultOptions.md). Command Response - By default, returns an `Array` of members (locations) names. If any of `withCoord`, `withDist` or `withHash` are set to `true` in [GeoSearchResultOptions](../../Commands/type-aliases/GeoSearchResultOptions.md), a 2D `Array` returned, where each sub-array represents a single item in the following order: - The member (location) name. - The distance from the center as a floating point `number`, in the same unit specified for `searchBy`. - The geohash of the location as a integer `number`. - The coordinates as a two item `array` of floating point `number`s. |

#### Returns

`T`

#### See

[https://valkey.io/commands/geosearch/\|valkey.io](https://valkey.io/commands/geosearch/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### geosearchstore()

> **geosearchstore**(`destination`, `source`, `searchFrom`, `searchBy`, `resultOptions`?): `T`

Searches for members in a sorted set stored at `source` representing geospatial data
within a circular or rectangular area and stores the result in `destination`.

If `destination` already exists, it is overwritten. Otherwise, a new sorted set will be created.

To get the result directly, see [geosearch](BaseTransaction.md#geosearch).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the destination sorted set. |
| `source` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `searchFrom` | [`SearchOrigin`](../../Commands/type-aliases/SearchOrigin.md) | The query's center point options, could be one of: - [MemberOrigin](../../Commands/interfaces/MemberOrigin.md) to use the position of the given existing member in the sorted set. - [CoordOrigin](../../Commands/interfaces/CoordOrigin.md) to use the given longitude and latitude coordinates. |
| `searchBy` | [`GeoSearchShape`](../../Commands/type-aliases/GeoSearchShape.md) | The query's shape options, could be one of: - [GeoCircleShape](../../Commands/interfaces/GeoCircleShape.md) to search inside circular area according to given radius. - [GeoBoxShape](../../Commands/interfaces/GeoBoxShape.md) to search inside an axis-aligned rectangle, determined by height and width. |
| `resultOptions`? | [`GeoSearchStoreResultOptions`](../../Commands/type-aliases/GeoSearchStoreResultOptions.md) | (Optional) Parameters to request additional information and configure sorting/limiting the results, see [GeoSearchStoreResultOptions](../../Commands/type-aliases/GeoSearchStoreResultOptions.md). Command Response - The number of elements in the resulting sorted set stored at `destination`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/geosearchstore/\|valkey.io](https://valkey.io/commands/geosearchstore/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### get()

> **get**(`key`): `T`

Get the value associated with the given key, or null if no such value exists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to retrieve from the database. Command Response - If `key` exists, returns the value of `key`. Otherwise, return null. |

#### Returns

`T`

#### See

[https://valkey.io/commands/get/\|valkey.io](https://valkey.io/commands/get/|valkey.io) for details.

***

### getbit()

> **getbit**(`key`, `offset`): `T`

Returns the bit value at `offset` in the string value stored at `key`. `offset` must be greater than or equal
to zero.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the string. |
| `offset` | `number` | The index of the bit to return. Command Response - The bit at the given `offset` of the string. Returns `0` if the key is empty or if the `offset` exceeds the length of the string. |

#### Returns

`T`

#### See

[https://valkey.io/commands/getbit/\|valkey.io](https://valkey.io/commands/getbit/|valkey.io) for details.

***

### getdel()

> **getdel**(`key`): `T`

Gets a string value associated with the given `key`and deletes the key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to retrieve from the database. Command Response - If `key` exists, returns the `value` of `key`. Otherwise, return `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/getdel/\|valkey.io](https://valkey.io/commands/getdel/|valkey.io) for details.

***

### getex()

> **getex**(`key`, `options`?): `T`

Get the value of `key` and optionally set its expiration. `GETEX` is similar to [get](BaseTransaction.md#get).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to retrieve from the database. |
| `options`? | \{ `duration`: `number`; `type`: [`TimeUnit`](../../Commands/enumerations/TimeUnit.md); \} \| `"persist"` | (Optional) set expiriation to the given key. "persist" will retain the time to live associated with the key. Equivalent to `PERSIST` in the VALKEY API. Otherwise, a [TimeUnit](../../Commands/enumerations/TimeUnit.md) and duration of the expire time should be specified. Command Response - If `key` exists, returns the value of `key` as a `string`. Otherwise, return `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/getex/\|valkey.io](https://valkey.io/commands/getex/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

***

### getrange()

> **getrange**(`key`, `start`, `end`): `T`

Returns the substring of the string value stored at `key`, determined by the byte offsets
`start` and `end` (both are inclusive). Negative offsets can be used in order to provide
an offset starting from the end of the string. So `-1` means the last character, `-2` the
penultimate and so forth. If `key` does not exist, an empty string is returned. If `start`
or `end` are out of range, returns the substring within the valid range of the string.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the string. |
| `start` | `number` | The starting byte offset. |
| `end` | `number` | The ending byte offset. Command Response - substring extracted from the value stored at `key`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/getrange/\|valkey.io](https://valkey.io/commands/getrange/|valkey.io) for details.

***

### hdel()

> **hdel**(`key`, `fields`): `T`

Removes the specified fields from the hash stored at `key`.
Specified fields that do not exist within this hash are ignored.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `fields` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The fields to remove from the hash stored at `key`. Command Response - the number of fields that were removed from the hash, not including specified but non existing fields. If `key` does not exist, it is treated as an empty hash and it returns 0. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hdel/\|valkey.io](https://valkey.io/commands/hdel/|valkey.io) for details.

***

### hexists()

> **hexists**(`key`, `field`): `T`

Returns if `field` is an existing field in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The field to check in the hash stored at `key`. Command Response - `true` if the hash contains `field`. If the hash does not contain `field`, or if `key` does not exist, the command response will be `false`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hexists/\|valkey.io](https://valkey.io/commands/hexists/|valkey.io) for details.

***

### hget()

> **hget**(`key`, `field`): `T`

Retrieve the value associated with `field` in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The field in the hash stored at `key` to retrieve from the database. Command Response - the value associated with `field`, or null when `field` is not present in the hash or `key` does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hget/\|valkey.io](https://valkey.io/commands/hget/|valkey.io) for details.

***

### hgetall()

> **hgetall**(`key`): `T`

Returns all fields and values of the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. Command Response - A list of fields and their values stored in the hash. If `key` does not exist, it returns an empty list. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hgetall/\|valkey.io](https://valkey.io/commands/hgetall/|valkey.io) for details.

***

### hincrBy()

> **hincrBy**(`key`, `field`, `amount`): `T`

Increments the number stored at `field` in the hash stored at `key` by `increment`.
By using a negative increment value, the value stored at `field` in the hash stored at `key` is decremented.
If `field` or `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The field in the hash stored at `key` to increment its value. Command Response - the value of `field` in the hash stored at `key` after the increment. |
| `amount` | `number` | The amount to increment. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hincrby/\|valkey.io](https://valkey.io/commands/hincrby/|valkey.io) for details.

***

### hincrByFloat()

> **hincrByFloat**(`key`, `field`, `amount`): `T`

Increment the string representing a floating point number stored at `field` in the hash stored at `key` by `increment`.
By using a negative increment value, the value stored at `field` in the hash stored at `key` is decremented.
If `field` or `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The field in the hash stored at `key` to increment its value. Command Response - the value of `field` in the hash stored at `key` after the increment. |
| `amount` | `number` | The amount to increment. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hincrbyfloat/\|valkey.io](https://valkey.io/commands/hincrbyfloat/|valkey.io) for details.

***

### hkeys()

> **hkeys**(`key`): `T`

Returns all field names in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. Command Response - A list of field names for the hash, or an empty list when the key does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hkeys/\|valkey.io](https://valkey.io/commands/hkeys/|valkey.io) for details.

***

### hlen()

> **hlen**(`key`): `T`

Returns the number of fields contained in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. Command Response - The number of fields in the hash, or 0 when the key does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hlen/\|valkey.io](https://valkey.io/commands/hlen/|valkey.io) for details.

***

### hmget()

> **hmget**(`key`, `fields`): `T`

Returns the values associated with the specified fields in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `fields` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The fields in the hash stored at `key` to retrieve from the database. Command Response - a list of values associated with the given fields, in the same order as they are requested. For every field that does not exist in the hash, a null value is returned. If `key` does not exist, it is treated as an empty hash and it returns a list of null values. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hmget/\|valkey.io](https://valkey.io/commands/hmget/|valkey.io) for details.

***

### hrandfield()

> **hrandfield**(`key`): `T`

Returns a random field name from the hash value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. Command Response - A random field name from the hash stored at `key`, or `null` when the key does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hrandfield/\|valkey.io](https://valkey.io/commands/hrandfield/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### hrandfieldCount()

> **hrandfieldCount**(`key`, `count`): `T`

Retrieves up to `count` random field names from the hash value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `count` | `number` | The number of field names to return. If `count` is positive, returns unique elements. If negative, allows for duplicates. Command Response - An `array` of random field names from the hash stored at `key`, or an `empty array` when the key does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hrandfield/\|valkey.io](https://valkey.io/commands/hrandfield/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### hrandfieldWithValues()

> **hrandfieldWithValues**(`key`, `count`): `T`

Retrieves up to `count` random field names along with their values from the hash
value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `count` | `number` | The number of field names to return. If `count` is positive, returns unique elements. If negative, allows for duplicates. Command Response - A 2D `array` of `[fieldName, value]` `arrays`, where `fieldName` is a random field name from the hash and `value` is the associated value of the field name. If the hash does not exist or is empty, the response will be an empty `array`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hrandfield/\|valkey.io](https://valkey.io/commands/hrandfield/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### hscan()

> **hscan**(`key`, `cursor`, `options`?): `T`

Iterates incrementally over a hash.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the set. |
| `cursor` | `string` | The cursor that points to the next iteration of results. A value of `"0"` indicates the start of the search. |
| `options`? | [`HScanOptions`](../../Commands/type-aliases/HScanOptions.md) | (Optional) The [HScanOptions](../../Commands/type-aliases/HScanOptions.md). Command Response - An array of the `cursor` and the subset of the hash held by `key`. The first element is always the `cursor` for the next iteration of results. `"0"` will be the `cursor` returned on the last iteration of the hash. The second element is always an array of the subset of the hash held in `key`. The array in the second element is a flattened series of string pairs, where the value is at even indices and the value is at odd indices. If `options.noValues` is set to `true`, the second element will only contain the fields without the values. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hscan/\|valkey.io](https://valkey.io/commands/hscan/|valkey.io) for more details.

***

### hset()

> **hset**(`key`, `fieldsAndValues`): `T`

Sets the specified fields to their respective values in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `fieldsAndValues` | `Record`\<`string`, [`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> \| [`HashDataType`](../../BaseClient/type-aliases/HashDataType.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/hset/\|valkey.io](https://valkey.io/commands/hset/|valkey.io) for details.

***

### hsetnx()

> **hsetnx**(`key`, `field`, `value`): `T`

Sets `field` in the hash stored at `key` to `value`, only if `field` does not yet exist.
If `key` does not exist, a new key holding a hash is created.
If `field` already exists, this operation has no effect.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The field to set the value for. |
| `value` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The value to set. Command Response - `true` if the field was set, `false` if the field already existed and was not set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hsetnx/\|valkey.io](https://valkey.io/commands/hsetnx/|valkey.io) for details.

***

### hstrlen()

> **hstrlen**(`key`, `field`): `T`

Returns the string length of the value associated with `field` in the hash stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. |
| `field` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The field in the hash. Command Response - The string length or `0` if `field` or `key` does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hstrlen/\|valkey.io](https://valkey.io/commands/hstrlen/|valkey.io) for details.

***

### hvals()

> **hvals**(`key`): `T`

Returns all values in the hash stored at key.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the hash. Command Response - a list of values in the hash, or an empty list when the key does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/hvals/\|valkey.io](https://valkey.io/commands/hvals/|valkey.io) for details.

***

### incr()

> **incr**(`key`): `T`

Increments the number stored at `key` by one. If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to increment its value. Command Response - the value of `key` after the increment. |

#### Returns

`T`

#### See

[https://valkey.io/commands/incr/\|valkey.io](https://valkey.io/commands/incr/|valkey.io) for details.

***

### incrBy()

> **incrBy**(`key`, `amount`): `T`

Increments the number stored at `key` by `amount`. If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to increment its value. |
| `amount` | `number` | The amount to increment. Command Response - the value of `key` after the increment. |

#### Returns

`T`

#### See

[https://valkey.io/commands/incrby/\|valkey.io](https://valkey.io/commands/incrby/|valkey.io) for details.

***

### incrByFloat()

> **incrByFloat**(`key`, `amount`): `T`

Increment the string representing a floating point number stored at `key` by `amount`.
By using a negative amount value, the result is that the value stored at `key` is decremented.
If `key` does not exist, it is set to 0 before performing the operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to increment its value. |
| `amount` | `number` | The amount to increment. Command Response - the value of `key` after the increment. |

#### Returns

`T`

#### See

[https://valkey.io/commands/incrbyfloat/\|valkey.io](https://valkey.io/commands/incrbyfloat/|valkey.io) for details.

***

### info()

> **info**(`sections`?): `T`

Gets information and statistics about the server.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `sections`? | [`InfoOptions`](../../Commands/enumerations/InfoOptions.md)[] | (Optional) A list of [InfoOptions](../../Commands/enumerations/InfoOptions.md) values specifying which sections of information to retrieve. When no parameter is provided, [Default](../../Commands/enumerations/InfoOptions.md#default) is assumed. Command Response - A string containing the information for the sections requested. |

#### Returns

`T`

#### See

[https://valkey.io/commands/info/\|valkey.io](https://valkey.io/commands/info/|valkey.io) for details.

***

### lastsave()

> **lastsave**(): `T`

Returns `UNIX TIME` of the last DB save timestamp or startup timestamp if no save
was made since then.

#### Returns

`T`

#### See

[https://valkey.io/commands/lastsave/\|valkey.io](https://valkey.io/commands/lastsave/|valkey.io) for details.

Command Response - `UNIX TIME` of the last DB save executed with success.

***

### lcs()

> **lcs**(`key1`, `key2`): `T`

Returns all the longest common subsequences combined between strings stored at `key1` and `key2`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key1` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key that stores the first string. |
| `key2` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key that stores the second string. Command Response - A `String` containing all the longest common subsequence combined between the 2 strings. An empty `String` is returned if the keys do not exist or have no common subsequences. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lcs/\|valkey.io](https://valkey.io/commands/lcs/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### lcsIdx()

> **lcsIdx**(`key1`, `key2`, `options`?): `T`

Returns the indices and lengths of the longest common subsequences between strings stored at
`key1` and `key2`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key1` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key that stores the first string. |
| `key2` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key that stores the second string. |
| `options`? | \{ `minMatchLen`: `number`; `withMatchLen`: `boolean`; \} | (Optional) Additional parameters: - (Optional) `withMatchLen`: if `true`, include the length of the substring matched for the each match. - (Optional) `minMatchLen`: the minimum length of matches to include in the result. Command Response - A [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md) containing the indices of the longest common subsequences between the 2 strings and the lengths of the longest common subsequences. The resulting map contains two keys, "matches" and "len": - `"len"` is mapped to the total length of the all longest common subsequences between the 2 strings stored as an integer. This value doesn't count towards the `minMatchLen` filter. - `"matches"` is mapped to a three dimensional array of integers that stores pairs of indices that represent the location of the common subsequences in the strings held by `key1` and `key2`. See example of [lcsIdx](../../BaseClient/classes/BaseClient.md#lcsidx) for more details. |
| `options.minMatchLen`? | `number` | - |
| `options.withMatchLen`? | `boolean` | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/lcs/\|valkey.io](https://valkey.io/commands/lcs/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### lcsLen()

> **lcsLen**(`key1`, `key2`): `T`

Returns the total length of all the longest common subsequences between strings stored at `key1` and `key2`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key1` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key that stores the first string. |
| `key2` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key that stores the second string. Command Response - The total length of all the longest common subsequences between the 2 strings. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lcs/\|valkey.io](https://valkey.io/commands/lcs/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### lindex()

> **lindex**(`key`, `index`): `T`

Returns the element at index `index` in the list stored at `key`.
The index is zero-based, so 0 means the first element, 1 the second element and so on.
Negative indices can be used to designate elements starting at the tail of the list.
Here, -1 means the last element, -2 means the penultimate and so forth.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The `key` of the list. |
| `index` | `number` | The `index` of the element in the list to retrieve. Command Response - The element at index in the list stored at `key`. If `index` is out of range or if `key` does not exist, null is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lindex/\|valkey.io](https://valkey.io/commands/lindex/|valkey.io) for details.

***

### linsert()

> **linsert**(`key`, `position`, `pivot`, `element`): `T`

Inserts `element` in the list at `key` either before or after the `pivot`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `position` | [`InsertPosition`](../../Commands/enumerations/InsertPosition.md) | The relative position to insert into - either `InsertPosition.Before` or `InsertPosition.After` the `pivot`. |
| `pivot` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | An element of the list. |
| `element` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The new element to insert. Command Response - The list length after a successful insert operation. If the `key` doesn't exist returns `-1`. If the `pivot` wasn't found, returns `0`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/linsert/\|valkey.io](https://valkey.io/commands/linsert/|valkey.io) for details.

***

### llen()

> **llen**(`key`): `T`

Returns the length of the list stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. Command Response - the length of the list at `key`. If `key` does not exist, it is interpreted as an empty list and 0 is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/llen/\|valkey.io](https://valkey.io/commands/llen/|valkey.io) for details.

***

### lmove()

> **lmove**(`source`, `destination`, `whereFrom`, `whereTo`): `T`

Atomically pops and removes the left/right-most element to the list stored at `source`
depending on `whereFrom`, and pushes the element at the first/last element of the list
stored at `destination` depending on `whereTo`, see [ListDirection](../../Commands/enumerations/ListDirection.md).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `source` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to the source list. |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to the destination list. |
| `whereFrom` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The [ListDirection](../../Commands/enumerations/ListDirection.md) to remove the element from. |
| `whereTo` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The [ListDirection](../../Commands/enumerations/ListDirection.md) to add the element to. Command Response - The popped element, or `null` if `source` does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lmove/\|valkey.io](https://valkey.io/commands/lmove/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### lmpop()

> **lmpop**(`keys`, `direction`, `count`?): `T`

Pops one or more elements from the first non-empty list from the provided `keys`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | An array of keys to lists. |
| `direction` | [`ListDirection`](../../Commands/enumerations/ListDirection.md) | The direction based on which elements are popped from - see [ListDirection](../../Commands/enumerations/ListDirection.md). |
| `count`? | `number` | (Optional) The maximum number of popped elements. Command Response - A `Record` which stores the key name where elements were popped out and the array of popped elements. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lmpop/\|valkey.io](https://valkey.io/commands/lmpop/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### lolwut()

> **lolwut**(`options`?): `T`

Displays a piece of generative computer art and the server version.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options`? | [`LolwutOptions`](../../Commands/interfaces/LolwutOptions.md) | (Optional) The LOLWUT options - see [LolwutOptions](../../Commands/interfaces/LolwutOptions.md). Command Response - A piece of generative computer art along with the current server version. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lolwut/\|valkey.io](https://valkey.io/commands/lolwut/|valkey.io) for details.

***

### lpop()

> **lpop**(`key`): `T`

Removes and returns the first elements of the list stored at `key`.
The command pops a single element from the beginning of the list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. Command Response - The value of the first element. If `key` does not exist null will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lpop/\|valkey.io](https://valkey.io/commands/lpop/|valkey.io) for details.

***

### lpopCount()

> **lpopCount**(`key`, `count`): `T`

Removes and returns up to `count` elements of the list stored at `key`, depending on the list's length.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `count` | `number` | The count of the elements to pop from the list. Command Response - A list of the popped elements will be returned depending on the list's length. If `key` does not exist null will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lpop/\|valkey.io](https://valkey.io/commands/lpop/|valkey.io) for details.

***

### lpos()

> **lpos**(`key`, `element`, `options`?): `T`

Returns the index of the first occurrence of `element` inside the list specified by `key`. If no
match is found, `null` is returned. If the `count` option is specified, then the function returns
an `array` of indices of matching elements within the list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The name of the list. |
| `element` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The value to search for within the list. |
| `options`? | [`LPosOptions`](../../Commands/interfaces/LPosOptions.md) | (Optional) The LPOS options - see [LPosOptions](../../Commands/interfaces/LPosOptions.md). Command Response - The index of `element`, or `null` if `element` is not in the list. If the `count` option is specified, then the function returns an `array` of indices of matching elements within the list. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lpos/\|valkey.io](https://valkey.io/commands/lpos/|valkey.io) for details.

#### Remarks

Since Valkey version 6.0.6.

***

### lpush()

> **lpush**(`key`, `elements`): `T`

Inserts all the specified values at the head of the list stored at `key`.
`elements` are inserted one after the other to the head of the list, from the leftmost element to the rightmost element.
If `key` does not exist, it is created as empty list before performing the push operations.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `elements` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The elements to insert at the head of the list stored at `key`. Command Response - the length of the list after the push operations. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lpush/\|valkey.io](https://valkey.io/commands/lpush/|valkey.io) for details.

***

### lpushx()

> **lpushx**(`key`, `elements`): `T`

Inserts specified values at the head of the `list`, only if `key` already
exists and holds a list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `elements` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The elements to insert at the head of the list stored at `key`. Command Response - The length of the list after the push operation. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lpushx/\|valkey.io](https://valkey.io/commands/lpushx/|valkey.io) for details.

***

### lrange()

> **lrange**(`key`, `start`, `end`): `T`

Returns the specified elements of the list stored at `key`.
The offsets `start` and `end` are zero-based indexes, with 0 being the first element of the list, 1 being the next element and so on.
These offsets can also be negative numbers indicating offsets starting at the end of the list,
with -1 being the last element of the list, -2 being the penultimate, and so on.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `start` | `number` | The starting point of the range. |
| `end` | `number` | The end of the range. Command Response - list of elements in the specified range. If `start` exceeds the end of the list, or if `start` is greater than `end`, an empty list will be returned. If `end` exceeds the actual end of the list, the range will stop at the actual end of the list. If `key` does not exist an empty list will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/lrange/\|valkey.io](https://valkey.io/commands/lrange/|valkey.io) for details.

***

### lrem()

> **lrem**(`key`, `count`, `element`): `T`

Removes the first `count` occurrences of elements equal to `element` from the list stored at `key`.
If `count` is positive : Removes elements equal to `element` moving from head to tail.
If `count` is negative : Removes elements equal to `element` moving from tail to head.
If `count` is 0 or `count` is greater than the occurrences of elements equal to `element`: Removes all elements equal to `element`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `count` | `number` | The count of the occurrences of elements equal to `element` to remove. |
| `element` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The element to remove from the list. Command Response - the number of the removed elements. If `key` does not exist, 0 is returned. |

#### Returns

`T`

***

### lset()

> **lset**(`key`, `index`, `element`): `T`

Sets the list element at `index` to `element`.
The index is zero-based, so `0` means the first element, `1` the second element and so on.
Negative indices can be used to designate elements starting at the tail of
the list. Here, `-1` means the last element, `-2` means the penultimate and so forth.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `index` | `number` | The index of the element in the list to be set. |
| `element` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The new element to set at the specified index. Command Response - Always "OK". |

#### Returns

`T`

#### See

[https://valkey.io/commands/lset/\|valkey.io](https://valkey.io/commands/lset/|valkey.io) for details.

***

### ltrim()

> **ltrim**(`key`, `start`, `end`): `T`

Trim an existing list so that it will contain only the specified range of elements specified.
The offsets `start` and `end` are zero-based indexes, with 0 being the first element of the list, 1 being the next element and so on.
These offsets can also be negative numbers indicating offsets starting at the end of the list,
with -1 being the last element of the list, -2 being the penultimate, and so on.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `start` | `number` | The starting point of the range. |
| `end` | `number` | The end of the range. Command Response - always "OK". If `start` exceeds the end of the list, or if `start` is greater than `end`, the result will be an empty list (which causes key to be removed). If `end` exceeds the actual end of the list, it will be treated like the last element of the list. If `key` does not exist the command will be ignored. |

#### Returns

`T`

#### See

[https://valkey.io/commands/ltrim/\|valkey.io](https://valkey.io/commands/ltrim/|valkey.io) for details.

***

### mget()

> **mget**(`keys`): `T`

Retrieve the values of multiple keys.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of keys to retrieve values for. Command Response - A list of values corresponding to the provided keys. If a key is not found, its corresponding value in the list will be null. |

#### Returns

`T`

#### See

[https://valkey.io/commands/mget/\|valkey.io](https://valkey.io/commands/mget/|valkey.io) for details.

***

### mset()

> **mset**(`keysAndValues`): `T`

Set multiple keys to multiple values in a single atomic operation.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keysAndValues` | `Record`\<`string`, [`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> \| [`GlideRecord`](../../BaseClient/type-aliases/GlideRecord.md)\<[`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> | A list of key-value pairs to set. Command Response - always "OK". |

#### Returns

`T`

#### See

[https://valkey.io/commands/mset/\|valkey.io](https://valkey.io/commands/mset/|valkey.io) for details.

***

### msetnx()

> **msetnx**(`keysAndValues`): `T`

Sets multiple keys to values if the key does not exist. The operation is atomic, and if one or
more keys already exist, the entire operation fails.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keysAndValues` | `Record`\<`string`, [`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> \| [`GlideRecord`](../../BaseClient/type-aliases/GlideRecord.md)\<[`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> | A list of key-value pairs to set. Command Response - `true` if all keys were set. `false` if no key was set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/msetnx/\|valkey.io](https://valkey.io/commands/msetnx/|valkey.io) for details.

***

### objectEncoding()

> **objectEncoding**(`key`): `T`

Returns the internal encoding for the Valkey object stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The `key` of the object to get the internal encoding of. Command Response - If `key` exists, returns the internal encoding of the object stored at `key` as a string. Otherwise, returns None. |

#### Returns

`T`

#### See

[https://valkey.io/commands/object-encoding/\|valkey.io](https://valkey.io/commands/object-encoding/|valkey.io) for more details.

***

### objectFreq()

> **objectFreq**(`key`): `T`

Returns the logarithmic access frequency counter of a Valkey object stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The `key` of the object to get the logarithmic access frequency counter of. Command Response - If `key` exists, returns the logarithmic access frequency counter of the object stored at `key` as a `number`. Otherwise, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/object-freq/\|valkey.io](https://valkey.io/commands/object-freq/|valkey.io) for more details.

***

### objectIdletime()

> **objectIdletime**(`key`): `T`

Returns the time in seconds since the last access to the value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the object to get the idle time of. Command Response - If `key` exists, returns the idle time in seconds. Otherwise, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/object-idletime/\|valkey.io](https://valkey.io/commands/object-idletime/|valkey.io) for details.

***

### objectRefcount()

> **objectRefcount**(`key`): `T`

Returns the reference count of the object stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The `key` of the object to get the reference count of. Command Response - If `key` exists, returns the reference count of the object stored at `key` as a `number`. Otherwise, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/object-refcount/\|valkey.io](https://valkey.io/commands/object-refcount/|valkey.io) for details.

***

### persist()

> **persist**(`key`): `T`

Removes the existing timeout on `key`, turning the key from volatile (a key with an expire set) to
persistent (a key that will never expire as no timeout is associated).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to remove the existing timeout on. Command Response - `false` if `key` does not exist or does not have an associated timeout, `true` if the timeout has been removed. |

#### Returns

`T`

#### See

[https://valkey.io/commands/persist/\|valkey.io](https://valkey.io/commands/persist/|valkey.io) for details.

***

### pexpire()

> **pexpire**(`key`, `milliseconds`, `options`?): `T`

Sets a timeout on `key` in milliseconds. After the timeout has expired, the key will automatically be deleted.
If `key` already has an existing expire set, the time to live is updated to the new value.
If `milliseconds` is non-positive number, the key will be deleted rather than expired.
The timeout will only be cleared by commands that delete or overwrite the contents of `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to set timeout on it. |
| `milliseconds` | `number` | The timeout in milliseconds. |
| `options`? | \{ `expireOption`: [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md); \} | (Optional) Additional parameters: - (Optional) `expireOption`: the expire option - see [ExpireOptions](../../Commands/enumerations/ExpireOptions.md). Command Response - `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist, or operation skipped due to the provided arguments. |
| `options.expireOption`? | [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/pexpire/\|valkey.io](https://valkey.io/commands/pexpire/|valkey.io) for details.

***

### pexpireAt()

> **pexpireAt**(`key`, `unixMilliseconds`, `options`?): `T`

Sets a timeout on `key`. It takes an absolute Unix timestamp (milliseconds since January 1, 1970) instead of specifying the number of milliseconds.
A timestamp in the past will delete the key immediately. After the timeout has expired, the key will automatically be deleted.
If `key` already has an existing expire set, the time to live is updated to the new value.
The timeout will only be cleared by commands that delete or overwrite the contents of `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to set timeout on it. |
| `unixMilliseconds` | `number` | The timeout in an absolute Unix timestamp. |
| `options`? | \{ `expireOption`: [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md); \} | (Optional) Additional parameters: - (Optional) `expireOption`: the expire option - see [ExpireOptions](../../Commands/enumerations/ExpireOptions.md). Command Response - `true` if the timeout was set. `false` if the timeout was not set. e.g. key doesn't exist, or operation skipped due to the provided arguments. |
| `options.expireOption`? | [`ExpireOptions`](../../Commands/enumerations/ExpireOptions.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/pexpireat/\|valkey.io](https://valkey.io/commands/pexpireat/|valkey.io) for details.

***

### pexpireTime()

> **pexpireTime**(`key`): `T`

Returns the absolute Unix timestamp (since January 1, 1970) at which the given `key` will expire, in milliseconds.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The `key` to determine the expiration value of. Command Response - The expiration Unix timestamp in seconds, `-2` if `key` does not exist or `-1` if `key` exists but has no associated expire. |

#### Returns

`T`

#### See

[https://valkey.io/commands/pexpiretime/\|valkey.io](https://valkey.io/commands/pexpiretime/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### pfadd()

> **pfadd**(`key`, `elements`): `T`

Adds all elements to the HyperLogLog data structure stored at the specified `key`.
Creates a new structure if the `key` does not exist.
When no elements are provided, and `key` exists and is a HyperLogLog, then no operation is performed.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the HyperLogLog data structure to add elements into. |
| `elements` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | An array of members to add to the HyperLogLog stored at `key`. Command Response - If the HyperLogLog is newly created, or if the HyperLogLog approximated cardinality is altered, then returns `1`. Otherwise, returns `0`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/pfadd/\|valkey.io](https://valkey.io/commands/pfadd/|valkey.io) for details.

***

### pfcount()

> **pfcount**(`keys`): `T`

Estimates the cardinality of the data stored in a HyperLogLog structure for a single key or
calculates the combined cardinality of multiple keys by merging their HyperLogLogs temporarily.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the HyperLogLog data structures to be analyzed. Command Response - The approximated cardinality of given HyperLogLog data structures. The cardinality of a key that does not exist is `0`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/pfcount/\|valkey.io](https://valkey.io/commands/pfcount/|valkey.io) for details.

***

### pfmerge()

> **pfmerge**(`destination`, `sourceKeys`): `T`

Merges multiple HyperLogLog values into a unique value. If the destination variable exists, it is
treated as one of the source HyperLogLog data sets, otherwise a new HyperLogLog is created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the destination HyperLogLog where the merged data sets will be stored. |
| `sourceKeys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the HyperLogLog structures to be merged. Command Response - A simple "OK" response. |

#### Returns

`T`

#### See

[https://valkey.io/commands/pfmerge/\|valkey.io](https://valkey.io/commands/pfmerge/|valkey.io) for details.

***

### ping()

> **ping**(`message`?): `T`

Pings the server.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message`? | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | (Optional) A message to include in the PING command. - If not provided, the server will respond with `"PONG"`. - If provided, the server will respond with a copy of the message. Command Response - `"PONG"` if `message` is not provided, otherwise return a copy of `message`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/ping/\|valkey.io](https://valkey.io/commands/ping/|valkey.io) for details.

***

### pttl()

> **pttl**(`key`): `T`

Returns the remaining time to live of `key` that has a timeout, in milliseconds.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to return its timeout. Command Response - TTL in milliseconds, `-2` if `key` does not exist, `-1` if `key` exists but has no associated expire. |

#### Returns

`T`

#### See

[https://valkey.io/commands/pttl/\|valkey.io](https://valkey.io/commands/pttl/|valkey.io) for more details.

***

### pubsubChannels()

> **pubsubChannels**(`pattern`?): `T`

Lists the currently active channels.
The command is routed to all nodes, and aggregates the response to a single array.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pattern`? | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | A glob-style pattern to match active channels. If not provided, all active channels are returned. Command Response - A list of currently active channels matching the given pattern. If no pattern is specified, all active channels are returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/pubsub-channels/\|valkey.io](https://valkey.io/commands/pubsub-channels/|valkey.io) for more details.

***

### pubsubNumPat()

> **pubsubNumPat**(): `T`

Returns the number of unique patterns that are subscribed to by clients.

Note: This is the total number of unique patterns all the clients are subscribed to,
not the count of clients subscribed to patterns.
The command is routed to all nodes, and aggregates the response to the sum of all pattern subscriptions.

#### Returns

`T`

#### See

[https://valkey.io/commands/pubsub-numpat/\|valkey.io](https://valkey.io/commands/pubsub-numpat/|valkey.io) for more details.

Command Response - The number of unique patterns.

***

### pubsubNumSub()

> **pubsubNumSub**(`channels`): `T`

Returns the number of subscribers (exclusive of clients subscribed to patterns) for the specified channels.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `channels` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The list of channels to query for the number of subscribers. Command Response - A list of the channel names and their numbers of subscribers. |

#### Returns

`T`

#### See

[https://valkey.io/commands/pubsub-numsub/\|valkey.io](https://valkey.io/commands/pubsub-numsub/|valkey.io) for more details.

***

### randomKey()

> **randomKey**(): `T`

Returns a random existing key name from the currently selected database.

#### Returns

`T`

#### See

[https://valkey.io/commands/randomkey/\|valkey.io](https://valkey.io/commands/randomkey/|valkey.io) for details.

Command Response - A random existing key name from the currently selected database.

***

### rename()

> **rename**(`key`, `newKey`): `T`

Renames `key` to `newkey`.
If `newkey` already exists it is overwritten.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to rename. |
| `newKey` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The new name of the key. Command Response - If the `key` was successfully renamed, return "OK". If `key` does not exist, an error is thrown. |

#### Returns

`T`

#### See

[https://valkey.io/commands/rename/\|valkey.io](https://valkey.io/commands/rename/|valkey.io) for details.

***

### renamenx()

> **renamenx**(`key`, `newKey`): `T`

Renames `key` to `newkey` if `newkey` does not yet exist.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to rename. |
| `newKey` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The new name of the key. Command Response - If the `key` was successfully renamed, returns `true`. Otherwise, returns `false`. If `key` does not exist, an error is thrown. |

#### Returns

`T`

#### See

[https://valkey.io/commands/renamenx/\|valkey.io](https://valkey.io/commands/renamenx/|valkey.io) for details.

***

### restore()

> **restore**(`key`, `ttl`, `value`, `options`?): `T`

Create a `key` associated with a `value` that is obtained by deserializing the provided
serialized `value` (obtained via [dump](BaseTransaction.md#dump)).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The `key` to create. |
| `ttl` | `number` | The expiry time (in milliseconds). If `0`, the `key` will persist. |
| `value` | `Buffer` | The serialized value to deserialize and assign to `key`. |
| `options`? | [`RestoreOptions`](../../Commands/interfaces/RestoreOptions.md) | (Optional) Restore options [RestoreOptions](../../Commands/interfaces/RestoreOptions.md). Command Response - Return "OK" if the `key` was successfully restored with a `value`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/restore/\|valkey.io](https://valkey.io/commands/restore/|valkey.io) for details.

#### Remarks

`options.idletime` and `options.frequency` modifiers cannot be set at the same time.

***

### rpop()

> **rpop**(`key`): `T`

Removes and returns the last elements of the list stored at `key`.
The command pops a single element from the end of the list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. Command Response - The value of the last element. If `key` does not exist null will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/rpop/\|valkey.io](https://valkey.io/commands/rpop/|valkey.io) for details.

***

### rpopCount()

> **rpopCount**(`key`, `count`): `T`

Removes and returns up to `count` elements from the list stored at `key`, depending on the list's length.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `count` | `number` | The count of the elements to pop from the list. Command Response - A list of popped elements will be returned depending on the list's length. If `key` does not exist null will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/rpop/\|valkey.io](https://valkey.io/commands/rpop/|valkey.io) for details.

***

### rpush()

> **rpush**(`key`, `elements`): `T`

Inserts all the specified values at the tail of the list stored at `key`.
`elements` are inserted one after the other to the tail of the list, from the leftmost element to the rightmost element.
If `key` does not exist, it is created as empty list before performing the push operations.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `elements` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The elements to insert at the tail of the list stored at `key`. Command Response - the length of the list after the push operations. |

#### Returns

`T`

#### See

[https://valkey.io/commands/rpush/\|valkey.io](https://valkey.io/commands/rpush/|valkey.io) for details.

***

### rpushx()

> **rpushx**(`key`, `elements`): `T`

Inserts specified values at the tail of the `list`, only if `key` already
exists and holds a list.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list. |
| `elements` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The elements to insert at the tail of the list stored at `key`. Command Response - The length of the list after the push operation. |

#### Returns

`T`

#### See

[https://valkey.io/commands/rpushx/\|valkey.io](https://valkey.io/commands/rpushx/|valkey.io) for details.

***

### sadd()

> **sadd**(`key`, `members`): `T`

Adds the specified members to the set stored at `key`. Specified members that are already a member of this set are ignored.
If `key` does not exist, a new set is created before adding `members`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to store the members to its set. |
| `members` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of members to add to the set stored at `key`. Command Response - the number of members that were added to the set, not including all the members already present in the set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sadd/\|valkey.io](https://valkey.io/commands/sadd/|valkey.io) for details.

***

### scard()

> **scard**(`key`): `T`

Returns the set cardinality (number of elements) of the set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to return the number of its members. Command Response - the cardinality (number of elements) of the set, or 0 if key does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/scard/\|valkey.io](https://valkey.io/commands/scard/|valkey.io) for details.

***

### sdiff()

> **sdiff**(`keys`): `T`

Computes the difference between the first set and all the successive sets in `keys`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sets to diff. Command Response - A `Set` of elements representing the difference between the sets. If a key in `keys` does not exist, it is treated as an empty set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sdiff/\|valkey.io](https://valkey.io/commands/sdiff/|valkey.io) for details.

***

### sdiffstore()

> **sdiffstore**(`destination`, `keys`): `T`

Stores the difference between the first set and all the successive sets in `keys` into a new set at `destination`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the destination set. |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sets to diff. Command Response - The number of elements in the resulting set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sdiffstore/\|valkey.io](https://valkey.io/commands/sdiffstore/|valkey.io) for details.

***

### set()

> **set**(`key`, `value`, `options`?): `T`

Set the given key with the given value. Return value is dependent on the passed options.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to store. |
| `value` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The value to store with the given key. |
| `options`? | [`SetOptions`](../../Commands/type-aliases/SetOptions.md) | The set options. Command Response - If the value is successfully set, return OK. If `value` isn't set because of `onlyIfExists` or `onlyIfDoesNotExist` conditions, return null. If `returnOldValue` is set, return the old value as a string. |

#### Returns

`T`

#### See

[https://valkey.io/commands/set/\|valkey.io](https://valkey.io/commands/set/|valkey.io) for details.

***

### setbit()

> **setbit**(`key`, `offset`, `value`): `T`

Sets or clears the bit at `offset` in the string value stored at `key`. The `offset` is a zero-based index, with
`0` being the first element of the list, `1` being the next element, and so on. The `offset` must be less than
`2^32` and greater than or equal to `0`. If a key is non-existent then the bit at `offset` is set to `value` and
the preceding bits are set to `0`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the string. |
| `offset` | `number` | The index of the bit to be set. |
| `value` | `number` | The bit value to set at `offset`. The value must be `0` or `1`. Command Response - The bit value that was previously stored at `offset`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/setbit/\|valkey.io](https://valkey.io/commands/setbit/|valkey.io) for details.

***

### setrange()

> **setrange**(`key`, `offset`, `value`): `T`

Overwrites part of the string stored at `key`, starting at the specified byte `offset`,
for the entire length of `value`. If the `offset` is larger than the current length of the string at `key`,
the string is padded with zero bytes to make `offset` fit. Creates the `key` if it doesn't exist.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the string to update. |
| `offset` | `number` | The byte position in the string where `value` should be written. |
| `value` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The string written with `offset`. Command Response - The length of the string stored at `key` after it was modified. |

#### Returns

`T`

#### See

[https://valkey.io/commands/setrange/\|valkey.io](https://valkey.io/commands/setrange/|valkey.io) for details.

***

### sinter()

> **sinter**(`keys`): `T`

Gets the intersection of all the given sets.
When in cluster mode, all `keys` must map to the same hash slot.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The `keys` of the sets to get the intersection. Command Response - A set of members which are present in all given sets. If one or more sets do not exist, an empty set will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sinter/\|valkey.io](https://valkey.io/commands/sinter/|valkey.io) for details.

***

### sintercard()

> **sintercard**(`keys`, `options`?): `T`

Gets the cardinality of the intersection of all the given sets.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sets. |
| `options`? | \{ `limit`: `number`; \} | (Optional) Additional parameters: - (Optional) `limit`: the limit for the intersection cardinality value. If not specified, or set to `0`, no limit is used. Command Response - The cardinality of the intersection result. If one or more sets do not exist, `0` is returned. |
| `options.limit`? | `number` | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/sintercard/\|valkey.io](https://valkey.io/commands/sintercard/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### sinterstore()

> **sinterstore**(`destination`, `keys`): `T`

Stores the members of the intersection of all given sets specified by `keys` into a new set at `destination`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the destination set. |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys from which to retrieve the set members. Command Response - The number of elements in the resulting set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sinterstore/\|valkey.io](https://valkey.io/commands/sinterstore/|valkey.io) for details.

***

### sismember()

> **sismember**(`key`, `member`): `T`

Returns if `member` is a member of the set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the set. |
| `member` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The member to check for existence in the set. Command Response - `true` if the member exists in the set, `false` otherwise. If `key` doesn't exist, it is treated as an empty set and the command returns `false`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sismember/\|valkey.io](https://valkey.io/commands/sismember/|valkey.io) for details.

***

### smembers()

> **smembers**(`key`): `T`

Returns all the members of the set value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to return its members. Command Response - all members of the set. If `key` does not exist, it is treated as an empty set and this command returns empty list. |

#### Returns

`T`

#### See

[https://valkey.io/commands/smembers/\|valkey.io](https://valkey.io/commands/smembers/|valkey.io) for details.

***

### smismember()

> **smismember**(`key`, `members`): `T`

Checks whether each member is contained in the members of the set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the set to check. |
| `members` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of members to check for existence in the set. Command Response - An `array` of `boolean` values, each indicating if the respective member exists in the set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/smismember/\|valkey.io](https://valkey.io/commands/smismember/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### smove()

> **smove**(`source`, `destination`, `member`): `T`

Moves `member` from the set at `source` to the set at `destination`, removing it from the source set.
Creates a new destination set if needed. The operation is atomic.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `source` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the set to remove the element from. |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the set to add the element to. |
| `member` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The set element to move. Command Response - `true` on success, or `false` if the `source` set does not exist or the element is not a member of the source set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/smove/\|valkey.io](https://valkey.io/commands/smove/|valkey.io) for more details.

***

### sort()

> **sort**(`key`, `options`?): `T`

Sorts the elements in the list, set, or sorted set at `key` and returns the result.

The `sort` command can be used to sort elements based on different criteria and
apply transformations on sorted elements.

To store the result into a new key, see [sortStore](BaseTransaction.md#sortstore).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list, set, or sorted set to be sorted. |
| `options`? | [`SortOptions`](../../Commands/interfaces/SortOptions.md) | (Optional) [SortOptions](../../Commands/interfaces/SortOptions.md). Command Response - An `Array` of sorted elements. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sort/\|valkey.io](https://valkey.io/commands/sort/|valkey.io) for more details.

#### Remarks

When in cluster mode, both `key` and the patterns specified in [SortOptions.byPattern](../../Commands/interfaces/SortOptions.md#bypattern)
and [SortOptions.getPatterns](../../Commands/interfaces/SortOptions.md#getpatterns) must map to the same hash slot. The use of [SortOptions.byPattern](../../Commands/interfaces/SortOptions.md#bypattern)
and [SortOptions.getPatterns](../../Commands/interfaces/SortOptions.md#getpatterns) in cluster mode is supported since Valkey version 8.0.

***

### sortReadOnly()

> **sortReadOnly**(`key`, `options`?): `T`

Sorts the elements in the list, set, or sorted set at `key` and returns the result.

The `sortReadOnly` command can be used to sort elements based on different criteria and
apply transformations on sorted elements.

This command is routed depending on the client's [ReadFrom](../../BaseClient/type-aliases/ReadFrom.md) strategy.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list, set, or sorted set to be sorted. |
| `options`? | [`SortOptions`](../../Commands/interfaces/SortOptions.md) | (Optional) [SortOptions](../../Commands/interfaces/SortOptions.md). Command Response - An `Array` of sorted elements |

#### Returns

`T`

#### Remarks

Since Valkey version 7.0.0.

***

### sortStore()

> **sortStore**(`key`, `destination`, `options`?): `T`

Sorts the elements in the list, set, or sorted set at `key` and stores the result in
`destination`.

The `sort` command can be used to sort elements based on different criteria and
apply transformations on sorted elements, and store the result in a new key.

To get the sort result without storing it into a key, see [sort](BaseTransaction.md#sort) or [sortReadOnly](BaseTransaction.md#sortreadonly).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the list, set, or sorted set to be sorted. |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key where the sorted result will be stored. |
| `options`? | [`SortOptions`](../../Commands/interfaces/SortOptions.md) | (Optional) [SortOptions](../../Commands/interfaces/SortOptions.md). Command Response - The number of elements in the sorted key stored at `destination`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sort/\|valkey.io](https://valkey.io/commands/sort/|valkey.io) for more details.

#### Remarks

When in cluster mode, `key`, `destination` and the patterns specified in [SortOptions.byPattern](../../Commands/interfaces/SortOptions.md#bypattern)
and [SortOptions.getPatterns](../../Commands/interfaces/SortOptions.md#getpatterns) must map to the same hash slot. The use of [SortOptions.byPattern](../../Commands/interfaces/SortOptions.md#bypattern)
and [SortOptions.getPatterns](../../Commands/interfaces/SortOptions.md#getpatterns) in cluster mode is supported since Valkey version 8.0.

***

### spop()

> **spop**(`key`): `T`

Removes and returns one random member from the set value store at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the set. Command Response - the value of the popped member. If `key` does not exist, null will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/spop/\|valkey.io](https://valkey.io/commands/spop/|valkey.io) for details.
To pop multiple members, see `spopCount`.

***

### spopCount()

> **spopCount**(`key`, `count`): `T`

Removes and returns up to `count` random members from the set value store at `key`, depending on the set's length.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the set. |
| `count` | `number` | The count of the elements to pop from the set. Command Response - A list of popped elements will be returned depending on the set's length. If `key` does not exist, empty list will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/spop/\|valkey.io](https://valkey.io/commands/spop/|valkey.io) for details.

***

### srandmember()

> **srandmember**(`key`): `T`

Returns a random element from the set value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key from which to retrieve the set member. Command Response - A random element from the set, or null if `key` does not exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/srandmember/\|valkey.io](https://valkey.io/commands/srandmember/|valkey.io) for more details.

***

### srandmemberCount()

> **srandmemberCount**(`key`, `count`): `T`

Returns one or more random elements from the set value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `count` | `number` | The number of members to return. If `count` is positive, returns unique members. If `count` is negative, allows for duplicates members. Command Response - A list of members from the set. If the set does not exist or is empty, an empty list will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/srandmember/\|valkey.io](https://valkey.io/commands/srandmember/|valkey.io) for more details.

***

### srem()

> **srem**(`key`, `members`): `T`

Removes the specified members from the set stored at `key`. Specified members that are not a member of this set are ignored.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to remove the members from its set. |
| `members` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of members to remove from the set stored at `key`. Command Response - the number of members that were removed from the set, not including non existing members. If `key` does not exist, it is treated as an empty set and this command returns 0. |

#### Returns

`T`

#### See

[https://valkey.io/commands/srem/\|valkey.io](https://valkey.io/commands/srem/|valkey.io) for details.

***

### sscan()

> **sscan**(`key`, `cursor`, `options`?): `T`

Iterates incrementally over a set.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the set. |
| `cursor` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The cursor that points to the next iteration of results. A value of `"0"` indicates the start of the search. |
| `options`? | [`BaseScanOptions`](../../Commands/interfaces/BaseScanOptions.md) | The (Optional) [BaseScanOptions](../../Commands/interfaces/BaseScanOptions.md). Command Response - An array of the cursor and the subset of the set held by `key`. The first element is always the `cursor` and for the next iteration of results. The `cursor` will be `"0"` on the last iteration of the set. The second element is always an array of the subset of the set held in `key`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sscan](https://valkey.io/commands/sscan) for details.

***

### strlen()

> **strlen**(`key`): `T`

Returns the length of the string value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The `key` to check its length. Command Response - The length of the string value stored at `key` If `key` does not exist, it is treated as an empty string, and the command returns `0`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/strlen/\|valkey.io](https://valkey.io/commands/strlen/|valkey.io) for details.

***

### sunion()

> **sunion**(`keys`): `T`

Gets the union of all the given sets.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sets. Command Response - A `Set` of members which are present in at least one of the given sets. If none of the sets exist, an empty `Set` will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sunion/\|valkey.io](https://valkey.io/commands/sunion/|valkey.io) for details.

***

### sunionstore()

> **sunionstore**(`destination`, `keys`): `T`

Stores the members of the union of all given sets specified by `keys` into a new set
at `destination`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the destination set. |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys from which to retrieve the set members. Command Response - The number of elements in the resulting set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/sunionstore/\|valkey.io](https://valkey.io/commands/sunionstore/|valkey.io) for details.

***

### time()

> **time**(): `T`

Returns the server time.

#### Returns

`T`

#### See

[https://valkey.io/commands/time/\|valkey.io](https://valkey.io/commands/time/|valkey.io) for details.

Command Response - The current server time as an `array` with two items:
- A Unix timestamp,
- The amount of microseconds already elapsed in the current second.

***

### touch()

> **touch**(`keys`): `T`

Updates the last access time of the specified keys.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys to update the last access time of. Command Response - The number of keys that were updated. A key is ignored if it doesn't exist. |

#### Returns

`T`

#### See

[https://valkey.io/commands/touch/\|valkey.io](https://valkey.io/commands/touch/|valkey.io) for details.

***

### ttl()

> **ttl**(`key`): `T`

Returns the remaining time to live of `key` that has a timeout.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to return its timeout. Command Response - TTL in seconds, `-2` if `key` does not exist or `-1` if `key` exists but has no associated expire. |

#### Returns

`T`

#### See

[https://valkey.io/commands/ttl/\|valkey.io](https://valkey.io/commands/ttl/|valkey.io) for details.

***

### type()

> **type**(`key`): `T`

Returns the string representation of the type of the value stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key to check its data type. Command Response - If the key exists, the type of the stored value is returned. Otherwise, a "none" string is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/type/\|valkey.io](https://valkey.io/commands/type/|valkey.io) for details.

***

### unlink()

> **unlink**(`keys`): `T`

Removes the specified keys. A key is ignored if it does not exist.
This command, similar to [del](BaseTransaction.md#del), removes specified keys and ignores non-existent ones.
However, this command does not block the server, while [https://valkey.io/commands/del\|\`DEL\`](https://valkey.io/commands/del|`DEL`) does.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys we wanted to unlink. Command Response - The number of keys that were unlinked. |

#### Returns

`T`

#### See

[https://valkey.io/commands/unlink/\|valkey.io](https://valkey.io/commands/unlink/|valkey.io) for details.

***

### wait()

> **wait**(`numreplicas`, `timeout`): `T`

Blocks the current client until all the previous write commands are successfully transferred and
acknowledged by at least `numreplicas` of replicas. If `timeout` is reached, the command returns
the number of replicas that were not yet reached.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `numreplicas` | `number` | The number of replicas to reach. |
| `timeout` | `number` | The timeout value specified in milliseconds. A value of 0 will block indefinitely. Command Response - The number of replicas reached by all the writes performed in the context of the current connection. |

#### Returns

`T`

#### See

[https://valkey.io/commands/wait/\|valkey.io](https://valkey.io/commands/wait/|valkey.io) for more details.

***

### xack()

> **xack**(`key`, `group`, `ids`): `T`

Returns the number of messages that were successfully acknowledged by the consumer group member of a stream.
This command should be called on a pending message so that such message does not get processed again.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `ids` | `string`[] | An array of entry ids. Command Response - The number of messages that were successfully acknowledged. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xack/\|valkey.io](https://valkey.io/commands/xack/|valkey.io) for details.

***

### xadd()

> **xadd**(`key`, `values`, `options`?): `T`

Adds an entry to the specified stream stored at `key`. If the `key` doesn't exist, the stream is created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `values` | \[[`GlideString`](../../BaseClient/type-aliases/GlideString.md), [`GlideString`](../../BaseClient/type-aliases/GlideString.md)\][] | field-value pairs to be added to the entry. |
| `options`? | [`StreamAddOptions`](../../Commands/interfaces/StreamAddOptions.md) | (Optional) Stream add options. Command Response - The id of the added entry, or `null` if `options.makeStream` is set to `false` and no stream with the matching `key` exists. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xadd/\|valkey.io](https://valkey.io/commands/xadd/|valkey.io) for details.

***

### xautoclaim()

> **xautoclaim**(`key`, `group`, `consumer`, `minIdleTime`, `start`, `options`?): `T`

Transfers ownership of pending stream entries that match the specified criteria.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The group consumer. |
| `minIdleTime` | `number` | The minimum idle time for the message to be claimed. |
| `start` | `string` | Filters the claimed entries to those that have an ID equal or greater than the specified value. |
| `options`? | \{ `count`: `number`; \} | (Optional) Additional parameters: - (Optional) `count`: the number of claimed entries. Command Response - An `array` containing the following elements: - A stream ID to be used as the start argument for the next call to `XAUTOCLAIM`. This ID is equivalent to the next ID in the stream after the entries that were scanned, or "0-0" if the entire stream was scanned. - A mapping of the claimed entries. - If you are using Valkey 7.0.0 or above, the response list will also include a list containing the message IDs that were in the Pending Entries List but no longer exist in the stream. These IDs are deleted from the Pending Entries List. The response comes in format `[GlideString, GlideRecord<[GlideString, GlideString][]>, GlideString[]?]`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |
| `options.count`? | `number` | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/xautoclaim/\|valkey.io](https://valkey.io/commands/xautoclaim/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

***

### xautoclaimJustId()

> **xautoclaimJustId**(`key`, `group`, `consumer`, `minIdleTime`, `start`, `options`?): `T`

Transfers ownership of pending stream entries that match the specified criteria.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The group consumer. |
| `minIdleTime` | `number` | The minimum idle time for the message to be claimed. |
| `start` | `string` | Filters the claimed entries to those that have an ID equal or greater than the specified value. |
| `options`? | \{ `count`: `number`; \} | (Optional) Additional parameters: - (Optional) `count`: limits the number of claimed entries to the specified value. Command Response - An `array` containing the following elements: - A stream ID to be used as the start argument for the next call to `XAUTOCLAIM`. This ID is equivalent to the next ID in the stream after the entries that were scanned, or "0-0" if the entire stream was scanned. - A list of the IDs for the claimed entries. - If you are using Valkey 7.0.0 or above, the response list will also include a list containing the message IDs that were in the Pending Entries List but no longer exist in the stream. These IDs are deleted from the Pending Entries List. |
| `options.count`? | `number` | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/xautoclaim/\|valkey.io](https://valkey.io/commands/xautoclaim/|valkey.io) for more details.

#### Remarks

Since Valkey version 6.2.0.

***

### xclaim()

> **xclaim**(`key`, `group`, `consumer`, `minIdleTime`, `ids`, `options`?): `T`

Changes the ownership of a pending message.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The group consumer. |
| `minIdleTime` | `number` | The minimum idle time for the message to be claimed. |
| `ids` | `string`[] | An array of entry ids. |
| `options`? | [`StreamClaimOptions`](../../Commands/interfaces/StreamClaimOptions.md) | (Optional) Stream claim options [StreamClaimOptions](../../Commands/interfaces/StreamClaimOptions.md). Command Response - Message entries that are claimed by the consumer. The response comes in format `GlideRecord<[GlideString, GlideString][]>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/xclaim/\|valkey.io](https://valkey.io/commands/xclaim/|valkey.io) for details.

***

### xclaimJustId()

> **xclaimJustId**(`key`, `group`, `consumer`, `minIdleTime`, `ids`, `options`?): `T`

Changes the ownership of a pending message. This function returns an `array` with
only the message/entry IDs, and is equivalent to using `JUSTID` in the Valkey API.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The group consumer. |
| `minIdleTime` | `number` | The minimum idle time for the message to be claimed. |
| `ids` | `string`[] | An array of entry ids. |
| `options`? | [`StreamClaimOptions`](../../Commands/interfaces/StreamClaimOptions.md) | (Optional) Stream claim options [StreamClaimOptions](../../Commands/interfaces/StreamClaimOptions.md). Command Response - An `array` of message ids claimed by the consumer. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xclaim/\|valkey.io](https://valkey.io/commands/xclaim/|valkey.io) for details.

***

### xdel()

> **xdel**(`key`, `ids`): `T`

Removes the specified entries by id from a stream, and returns the number of entries deleted.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `ids` | `string`[] | An array of entry ids. Command Response - The number of entries removed from the stream. This number may be less than the number of entries in `ids`, if the specified `ids` don't exist in the stream. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xdel/\|valkey.io](https://valkey.io/commands/xdel/|valkey.io) for more details.

***

### xgroupCreate()

> **xgroupCreate**(`key`, `groupName`, `id`, `options`?): `T`

Creates a new consumer group uniquely identified by `groupname` for the stream
stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The newly created consumer group name. |
| `id` | `string` | Stream entry ID that specifies the last delivered entry in the stream from the new group’s perspective. The special ID `"$"` can be used to specify the last entry in the stream. Command Response - `"OK"`. |
| `options`? | [`StreamGroupOptions`](../../Commands/interfaces/StreamGroupOptions.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/xgroup-create/\|valkey.io](https://valkey.io/commands/xgroup-create/|valkey.io) for details.

***

### xgroupCreateConsumer()

> **xgroupCreateConsumer**(`key`, `groupName`, `consumerName`): `T`

Creates a consumer named `consumerName` in the consumer group `groupName` for the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `consumerName` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The newly created consumer. Command Response - `true` if the consumer is created. Otherwise, returns `false`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xgroup-createconsumer/\|valkey.io](https://valkey.io/commands/xgroup-createconsumer/|valkey.io) for more details.

***

### xgroupDelConsumer()

> **xgroupDelConsumer**(`key`, `groupName`, `consumerName`): `T`

Deletes a consumer named `consumerName` in the consumer group `groupName` for the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `consumerName` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer to delete. Command Response - The number of pending messages the `consumer` had before it was deleted. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xgroup-delconsumer/\|valkey.io](https://valkey.io/commands/xgroup-delconsumer/|valkey.io) for more details.

***

### xgroupDestroy()

> **xgroupDestroy**(`key`, `groupName`): `T`

Destroys the consumer group `groupname` for the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/xgroup-destroy/\|valkey.io](https://valkey.io/commands/xgroup-destroy/|valkey.io) for details.

***

### xgroupSetId()

> **xgroupSetId**(`key`, `groupName`, `id`, `options`?): `T`

Sets the last delivered ID for a consumer group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `groupName` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `id` | `string` | The stream entry ID that should be set as the last delivered ID for the consumer group. |
| `options`? | \{ `entriesRead`: `number`; \} | (Optional) Additional parameters: - (Optional) `entriesRead`: the number of stream entries already read by the group. This option can only be specified if you are using Valkey version 7.0.0 or above. Command Response - `"OK"`. |
| `options.entriesRead`? | `number` | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/xgroup-setid\|valkey.io](https://valkey.io/commands/xgroup-setid|valkey.io) for more details.

***

### xinfoConsumers()

> **xinfoConsumers**(`key`, `group`): `T`

Returns the list of all consumers and their attributes for the given consumer group of the
stream stored at `key`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |

#### Returns

`T`

#### See

[https://valkey.io/commands/xinfo-consumers/\|valkey.io](https://valkey.io/commands/xinfo-consumers/|valkey.io) for details.

Command Response - An `Array` of `Records`, where each mapping contains the attributes
    of a consumer for the given consumer group of the stream at `key`.
    The response comes in format `GlideRecord<GlideString | number>[]`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md).

***

### xinfoGroups()

> **xinfoGroups**(`key`): `T`

Returns the list of all consumer groups and their attributes for the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. Command Response - An `Array` of `Records`, where each mapping represents the attributes of a consumer group for the stream at `key`. The response comes in format `GlideRecord<GlideString | number | null>[]`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/xinfo-groups/\|valkey.io](https://valkey.io/commands/xinfo-groups/|valkey.io) for details.

***

### xinfoStream()

> **xinfoStream**(`key`, `fullOptions`?): `T`

Returns information about the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `fullOptions`? | `number` \| `boolean` | If `true`, returns verbose information with a limit of the first 10 PEL entries. If `number` is specified, returns verbose information limiting the returned PEL entries. If `0` is specified, returns verbose information with no limit. Command Response - Detailed stream information for the given `key`. See example of [BaseClient.xinfoStream](../../BaseClient/classes/BaseClient.md#xinfostream) for more details. The response comes in format `GlideRecord<StreamEntries | GlideRecord<StreamEntries | GlideRecord<StreamEntries>[]>[]>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

***

### xlen()

> **xlen**(`key`): `T`

Returns the number of entries in the stream stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. Command Response - The number of entries in the stream. If `key` does not exist, returns `0`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xlen/\|valkey.io](https://valkey.io/commands/xlen/|valkey.io) for details.

***

### xpending()

> **xpending**(`key`, `group`): `T`

Returns stream message summary information for pending messages matching a given range of IDs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. Command Response - An `array` that includes the summary of the pending messages. See example of [xpending](../../BaseClient/classes/BaseClient.md#xpending) for more details. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xpending/\|valkey.io](https://valkey.io/commands/xpending/|valkey.io) for details.

***

### xpendingWithOptions()

> **xpendingWithOptions**(`key`, `group`, `options`): `T`

Returns stream message summary information for pending messages matching a given range of IDs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `options` | [`StreamPendingOptions`](../../Commands/interfaces/StreamPendingOptions.md) | Additional options to filter entries, see [StreamPendingOptions](../../Commands/interfaces/StreamPendingOptions.md). Command Response - A 2D-`array` of 4-tuples containing extended message information. See example of [xpendingWithOptions](../../BaseClient/classes/BaseClient.md#xpendingwithoptions) for more details. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xpending/\|valkey.io](https://valkey.io/commands/xpending/|valkey.io) for details.

***

### xrange()

> **xrange**(`key`, `start`, `end`, `count`?): `T`

Returns stream entries matching a given range of entry IDs.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `start` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`string`\> | The starting stream entry ID bound for the range. - Use `value` to specify a stream entry ID. - Use `isInclusive: false` to specify an exclusive bounded stream entry ID. This is only available starting with Valkey version 6.2.0. - Use `InfBoundary.NegativeInfinity` to start with the minimum available ID. |
| `end` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`string`\> | The ending stream ID bound for the range. - Use `value` to specify a stream entry ID. - Use `isInclusive: false` to specify an exclusive bounded stream entry ID. This is only available starting with Valkey version 6.2.0. - Use `InfBoundary.PositiveInfinity` to end with the maximum available ID. |
| `count`? | `number` | An optional argument specifying the maximum count of stream entries to return. If `count` is not provided, all stream entries in the range will be returned. Command Response - A list of stream entry ids, to an array of entries, or `null` if `count` is non-positive. The response comes in format `GlideRecord<[GlideString, GlideString][]> | null`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/xrange/\|valkey.io](https://valkey.io/commands/xrange/|valkey.io) for more details.

***

### xread()

> **xread**(`keys_and_ids`, `options`?): `T`

Reads entries from the given streams.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys_and_ids` | `Record`\<`string`, `string`\> \| [`GlideRecord`](../../BaseClient/type-aliases/GlideRecord.md)\<`string`\> | An object of stream keys and entry IDs to read from. |
| `options`? | [`StreamReadOptions`](../../Commands/interfaces/StreamReadOptions.md) | (Optional) Parameters detailing how to read the stream - see [StreamReadOptions](../../Commands/interfaces/StreamReadOptions.md). Command Response - A list of stream keys with a `Record` of stream IDs mapped to an `Array` of entries or `null` if key does not exist. The response comes in format `GlideRecord<GlideRecord<[GlideString, GlideString][]>>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/xread/\|valkey.io](https://valkey.io/commands/xread/|valkey.io) for details.

***

### xreadgroup()

> **xreadgroup**(`group`, `consumer`, `keys_and_ids`, `options`?): `T`

Reads entries from the given streams owned by a consumer group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The consumer group name. |
| `consumer` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The group consumer. |
| `keys_and_ids` | `Record`\<`string`, `string`\> \| [`GlideRecord`](../../BaseClient/type-aliases/GlideRecord.md)\<`string`\> | An object of stream keys and entry IDs to read from. Use the special ID of `">"` to receive only new messages. |
| `options`? | [`StreamReadGroupOptions`](../../Commands/type-aliases/StreamReadGroupOptions.md) | (Optional) Parameters detailing how to read the stream - see [StreamReadGroupOptions](../../Commands/type-aliases/StreamReadGroupOptions.md). Command Response - A list of stream keys with a `Record` of stream IDs mapped to an `Array` of entries. Returns `null` if there is no stream that can be served. The response comes in format `GlideRecord<GlideRecord<[GlideString, GlideString][]>>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/xreadgroup/\|valkey.io](https://valkey.io/commands/xreadgroup/|valkey.io) for details.

***

### xrevrange()

> **xrevrange**(`key`, `end`, `start`, `count`?): `T`

Returns stream entries matching a given range of entry IDs in reverse order. Equivalent to [xrange](BaseTransaction.md#xrange) but returns the
entries in reverse order.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the stream. |
| `end` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`string`\> | The ending stream entry ID bound for the range. - Use `value` to specify a stream entry ID. - Use `isInclusive: false` to specify an exclusive bounded stream entry ID. This is only available starting with Valkey version 6.2.0. - Use `InfBoundary.PositiveInfinity` to end with the maximum available ID. |
| `start` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`string`\> | The ending stream ID bound for the range. - Use `value` to specify a stream entry ID. - Use `isInclusive: false` to specify an exclusive bounded stream entry ID. This is only available starting with Valkey version 6.2.0. - Use `InfBoundary.NegativeInfinity` to start with the minimum available ID. |
| `count`? | `number` | An optional argument specifying the maximum count of stream entries to return. If `count` is not provided, all stream entries in the range will be returned. Command Response - A list of stream entry ids, to an array of entries, or `null` if `count` is non-positive. The response comes in format `GlideRecord<[GlideString, GlideString][]> | null`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/xrevrange/\|valkey.io](https://valkey.io/commands/xrevrange/|valkey.io) for more details.

***

### xtrim()

> **xtrim**(`key`, `options`): `T`

Trims the stream stored at `key` by evicting older entries.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | the key of the stream |
| `options` | [`StreamTrimOptions`](../../Commands/type-aliases/StreamTrimOptions.md) | options detailing how to trim the stream. Command Response - The number of entries deleted from the stream. If `key` doesn't exist, 0 is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/xtrim/\|valkey.io](https://valkey.io/commands/xtrim/|valkey.io) for details.

***

### zadd()

> **zadd**(`key`, `membersAndScores`, `options`?): `T`

Adds members with their scores to the sorted set stored at `key`.
If a member is already a part of the sorted set, its score is updated.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `membersAndScores` | [`SortedSetDataType`](../../BaseClient/type-aliases/SortedSetDataType.md) \| `Record`\<`string`, `number`\> | A list of members and their corresponding scores or a mapping of members to their corresponding scores. |
| `options`? | [`ZAddOptions`](../../Commands/interfaces/ZAddOptions.md) | (Optional) The `ZADD` options - see [ZAddOptions](../../Commands/interfaces/ZAddOptions.md). Command Response - The number of elements added to the sorted set. If [ZAddOptions.changed](../../Commands/interfaces/ZAddOptions.md#changed) is set to `true`, returns the number of elements updated in the sorted set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zadd/\|valkey.io](https://valkey.io/commands/zadd/|valkey.io) for details.

***

### zaddIncr()

> **zaddIncr**(`key`, `member`, `increment`, `options`?): `T`

Increments the score of member in the sorted set stored at `key` by `increment`.
If `member` does not exist in the sorted set, it is added with `increment` as its score (as if its previous score was 0.0).
If `key` does not exist, a new sorted set with the specified member as its sole member is created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | A member in the sorted set to increment. |
| `increment` | `number` | The score to increment the member. |
| `options`? | [`ZAddOptions`](../../Commands/interfaces/ZAddOptions.md) | (Optional) The `ZADD` options - see [ZAddOptions](../../Commands/interfaces/ZAddOptions.md). Command Response - The score of the member. If there was a conflict with the options, the operation aborts and `null` is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zadd/\|valkey.io](https://valkey.io/commands/zadd/|valkey.io) for details.

***

### zcard()

> **zcard**(`key`): `T`

Returns the cardinality (number of elements) of the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. Command Response - The number of elements in the sorted set. If `key` does not exist, it is treated as an empty sorted set, and this command returns `0`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zcard/\|valkey.io](https://valkey.io/commands/zcard/|valkey.io) for details.

***

### zcount()

> **zcount**(`key`, `minScore`, `maxScore`): `T`

Returns the number of members in the sorted set stored at `key` with scores between `minScore` and `maxScore`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `minScore` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`number`\> | The minimum score to count from. Can be positive/negative infinity, or specific score and inclusivity. |
| `maxScore` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`number`\> | The maximum score to count up to. Can be positive/negative infinity, or specific score and inclusivity. Command Response - The number of members in the specified score range. If `key` does not exist, it is treated as an empty sorted set, and the command returns `0`. If `minScore` is greater than `maxScore`, `0` is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zcount/\|valkey.io](https://valkey.io/commands/zcount/|valkey.io) for details.

***

### zdiff()

> **zdiff**(`keys`): `T`

Returns the difference between the first sorted set and all the successive sorted sets.
To get the elements with their scores, see [zdiffWithScores](BaseTransaction.md#zdiffwithscores).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets. Command Response - An `array` of elements representing the difference between the sorted sets. If the first key does not exist, it is treated as an empty sorted set, and the command returns an empty `array`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zdiff/\|valkey.io](https://valkey.io/commands/zdiff/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### zdiffstore()

> **zdiffstore**(`destination`, `keys`): `T`

Calculates the difference between the first sorted set and all the successive sorted sets in `keys` and stores
the difference as a sorted set to `destination`, overwriting it if it already exists. Non-existent keys are
treated as empty sets.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key for the resulting sorted set. |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets to compare. Command Response - The number of members in the resulting sorted set stored at `destination`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zdiffstore/\|valkey.io](https://valkey.io/commands/zdiffstore/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### zdiffWithScores()

> **zdiffWithScores**(`keys`): `T`

Returns the difference between the first sorted set and all the successive sorted sets, with the associated
scores.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets. Command Response - A list of elements and their scores representing the difference between the sorted sets. If the first key does not exist, it is treated as an empty sorted set, and the command returns an empty `array`. The response comes in format `GlideRecord<number>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/zdiff/\|valkey.io](https://valkey.io/commands/zdiff/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### zincrby()

> **zincrby**(`key`, `increment`, `member`): `T`

Increments the score of `member` in the sorted set stored at `key` by `increment`.
If `member` does not exist in the sorted set, it is added with `increment` as its score.
If `key` does not exist, a new sorted set is created with the specified member as its sole member.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `increment` | `number` | The score increment. |
| `member` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | A member of the sorted set. Command Response - The new score of `member`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zincrby/\|valkey.io](https://valkey.io/commands/zincrby/|valkey.io) for details.

***

### zinter()

> **zinter**(`keys`): `T`

Computes the intersection of sorted sets given by the specified `keys` and returns a list of intersecting elements.
To get the scores as well, see [zinterWithScores](BaseTransaction.md#zinterwithscores).
To store the result in a key as a sorted set, see zinterStore.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets. Command Response - The resulting array of intersecting elements. |

#### Returns

`T`

#### Remarks

Since Valkey version 6.2.0.

#### See

[https://valkey.io/commands/zinter/\|valkey.io](https://valkey.io/commands/zinter/|valkey.io) for details.

***

### zintercard()

> **zintercard**(`keys`, `options`?): `T`

Returns the cardinality of the intersection of the sorted sets specified by `keys`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets to intersect. |
| `options`? | \{ `limit`: `number`; \} | (Optional) Additional parameters: - (Optional) `limit`: the limit for the intersection cardinality value. If not specified, or set to `0`, no limit is used. Command Response - The cardinality of the intersection of the given sorted sets. |
| `options.limit`? | `number` | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/zintercard/\|valkey.io](https://valkey.io/commands/zintercard/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### zinterstore()

> **zinterstore**(`destination`, `keys`, `options`?): `T`

Computes the intersection of sorted sets given by the specified `keys` and stores the result in `destination`.
If `destination` already exists, it is overwritten. Otherwise, a new sorted set will be created.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the destination sorted set. |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] \| [`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[] | The keys of the sorted sets with possible formats: - `GlideString[]` - for keys only. - `KeyWeight[]` - for weighted keys with score multipliers. |
| `options`? | \{ `aggregationType`: [`AggregationType`](../../Commands/type-aliases/AggregationType.md); \} | (Optional) Additional parameters: - (Optional) `aggregationType`: the aggregation strategy to apply when combining the scores of elements. See [AggregationType](../../Commands/type-aliases/AggregationType.md). If `aggregationType` is not specified, defaults to `AggregationType.SUM`. Command Response - The number of elements in the resulting sorted set stored at `destination`. |
| `options.aggregationType`? | [`AggregationType`](../../Commands/type-aliases/AggregationType.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/zinterstore/\|valkey.io](https://valkey.io/commands/zinterstore/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### zinterWithScores()

> **zinterWithScores**(`keys`, `options`?): `T`

Computes the intersection of sorted sets given by the specified `keys` and returns a list of intersecting elements with scores.
To get the elements only, see [zinter](BaseTransaction.md#zinter).
To store the result in a key as a sorted set, see zinterStore.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] \| [`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[] | The keys of the sorted sets with possible formats: - `GlideString[]` - for keys only. - `KeyWeight[]` - for weighted keys with score multipliers. |
| `options`? | \{ `aggregationType`: [`AggregationType`](../../Commands/type-aliases/AggregationType.md); \} | (Optional) Additional parameters: - (Optional) `aggregationType`: the aggregation strategy to apply when combining the scores of elements. See [AggregationType](../../Commands/type-aliases/AggregationType.md). If `aggregationType` is not specified, defaults to `AggregationType.SUM`. Command Response - A list of elements and their scores representing the intersection of the sorted sets. If a key does not exist, it is treated as an empty sorted set, and the command returns an empty result. The response comes in format `GlideRecord<number>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |
| `options.aggregationType`? | [`AggregationType`](../../Commands/type-aliases/AggregationType.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/zinter/\|valkey.io](https://valkey.io/commands/zinter/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### zlexcount()

> **zlexcount**(`key`, `minLex`, `maxLex`): `T`

Returns the number of members in the sorted set stored at 'key' with scores between 'minLex' and 'maxLex'.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `minLex` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<[`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> | The minimum lex to count from. Can be negative infinity, or a specific lex and inclusivity. |
| `maxLex` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<[`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> | The maximum lex to count up to. Can be positive infinity, or a specific lex and inclusivity. Command Response - The number of members in the specified lex range. If 'key' does not exist, it is treated as an empty sorted set, and the command returns '0'. If maxLex is less than minLex, '0' is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zlexcount/\|valkey.io](https://valkey.io/commands/zlexcount/|valkey.io) for details.

***

### zmpop()

> **zmpop**(`keys`, `modifier`, `count`?): `T`

Pops member-score pairs from the first non-empty sorted set, with the given `keys`
being checked in the order they are provided.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets. |
| `modifier` | [`ScoreFilter`](../../Commands/enumerations/ScoreFilter.md) | The element pop criteria - either [ScoreFilter.MIN](../../Commands/enumerations/ScoreFilter.md#min) or [ScoreFilter.MAX](../../Commands/enumerations/ScoreFilter.md#max) to pop the member with the lowest/highest score accordingly. |
| `count`? | `number` | (Optional) The number of elements to pop. If not supplied, only one element will be popped. Command Response - A two-element `array` containing the key name of the set from which the was popped, and a `GlideRecord<number>` of the popped elements - see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). If no member could be popped, returns `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zmpop/\|valkey.io](https://valkey.io/commands/zmpop/|valkey.io) for details.

#### Remarks

Since Valkey version 7.0.0.

***

### zmscore()

> **zmscore**(`key`, `members`): `T`

Returns the scores associated with the specified `members` in the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `members` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of members in the sorted set. Command Response - An `array` of scores corresponding to `members`. If a member does not exist in the sorted set, the corresponding value in the list will be `null`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zmscore/\|valkey.io](https://valkey.io/commands/zmscore/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### zpopmax()

> **zpopmax**(`key`, `count`?): `T`

Removes and returns the members with the highest scores from the sorted set stored at `key`.
If `count` is provided, up to `count` members with the highest scores are removed and returned.
Otherwise, only one member with the highest score is removed and returned.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `count`? | `number` | Specifies the quantity of members to pop. If not specified, pops one member. Command Response - A list of the removed members and their scores, ordered from the one with the lowest score to the one with the highest. If `key` doesn't exist, it will be treated as an empty sorted set and the command returns an empty map. If `count` is higher than the sorted set's cardinality, returns all members and their scores. The response comes in format `GlideRecord<number>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/zpopmax/\|valkey.io](https://valkey.io/commands/zpopmax/|valkey.io) for more details.

***

### zpopmin()

> **zpopmin**(`key`, `count`?): `T`

Removes and returns the members with the lowest scores from the sorted set stored at `key`.
If `count` is provided, up to `count` members with the lowest scores are removed and returned.
Otherwise, only one member with the lowest score is removed and returned.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `count`? | `number` | Specifies the quantity of members to pop. If not specified, pops one member. Command Response - A list of the removed members and their scores, ordered from the one with the lowest score to the one with the highest. If `key` doesn't exist, it will be treated as an empty sorted set and the command returns an empty map. If `count` is higher than the sorted set's cardinality, returns all members and their scores. The response comes in format `GlideRecord<number>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/zpopmin/\|valkey.io](https://valkey.io/commands/zpopmin/|valkey.io) for more details.

***

### zrandmember()

> **zrandmember**(`key`): `T`

Returns a random member from the sorted set stored at `key`.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrandmember/\|valkey.io](https://valkey.io/commands/zrandmember/|valkey.io) for details.

***

### zrandmemberWithCount()

> **zrandmemberWithCount**(`key`, `count`): `T`

Returns random members from the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | - |
| `count` | `number` | The number of members to return. If `count` is positive, returns unique members. If negative, allows for duplicates. Command Response - An `array` of members from the sorted set. If the sorted set does not exist or is empty, the response will be an empty `array`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrandmember/\|valkey.io](https://valkey.io/commands/zrandmember/|valkey.io) for details.

***

### zrandmemberWithCountWithScores()

> **zrandmemberWithCountWithScores**(`key`, `count`): `T`

Returns random members with scores from the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | - |
| `count` | `number` | The number of members to return. If `count` is positive, returns unique members. If negative, allows for duplicates. Command Response - A list of [KeyWeight](../../Commands/type-aliases/KeyWeight.md) tuples, which store member names and their respective scores. If the sorted set does not exist or is empty, the response will be an empty `array`. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrandmember/\|valkey.io](https://valkey.io/commands/zrandmember/|valkey.io) for details.

***

### zrange()

> **zrange**(`key`, `rangeQuery`, `reverse`): `T`

Returns the specified range of elements in the sorted set stored at `key`.
`ZRANGE` can perform different types of range queries: by index (rank), by the score, or by lexicographical order.

To get the elements with their scores, see [zrangeWithScores](BaseTransaction.md#zrangewithscores).

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | `undefined` | The key of the sorted set. |
| `rangeQuery` | [`RangeByScore`](../../Commands/type-aliases/RangeByScore.md) \| [`RangeByLex`](../../Commands/type-aliases/RangeByLex.md) \| [`RangeByIndex`](../../Commands/interfaces/RangeByIndex.md) | `undefined` | The range query object representing the type of range query to perform. - For range queries by index (rank), use [RangeByIndex](../../Commands/interfaces/RangeByIndex.md). - For range queries by lexicographical order, use [RangeByLex](../../Commands/type-aliases/RangeByLex.md). - For range queries by score, use [RangeByScore](../../Commands/type-aliases/RangeByScore.md). |
| `reverse` | `boolean` | `false` | If `true`, reverses the sorted set, with index `0` as the element with the highest score. Command Response - A list of elements within the specified range. If `key` does not exist, it is treated as an empty sorted set, and the command returns an empty array. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrange/\|valkey.io](https://valkey.io/commands/zrange/|valkey.io) for details.

***

### zrangeStore()

> **zrangeStore**(`destination`, `source`, `rangeQuery`, `reverse`): `T`

Stores a specified range of elements from the sorted set at `source`, into a new
sorted set at `destination`. If `destination` doesn't exist, a new sorted
set is created; if it exists, it's overwritten.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | `undefined` | The key for the destination sorted set. |
| `source` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | `undefined` | The key of the source sorted set. |
| `rangeQuery` | [`RangeByScore`](../../Commands/type-aliases/RangeByScore.md) \| [`RangeByLex`](../../Commands/type-aliases/RangeByLex.md) \| [`RangeByIndex`](../../Commands/interfaces/RangeByIndex.md) | `undefined` | The range query object representing the type of range query to perform. - For range queries by index (rank), use [RangeByIndex](../../Commands/interfaces/RangeByIndex.md). - For range queries by lexicographical order, use [RangeByLex](../../Commands/type-aliases/RangeByLex.md). - For range queries by score, use [RangeByScore](../../Commands/type-aliases/RangeByScore.md). |
| `reverse` | `boolean` | `false` | If `true`, reverses the sorted set, with index `0` as the element with the highest score. Command Response - The number of elements in the resulting sorted set. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrangestore/\|valkey.io](https://valkey.io/commands/zrangestore/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### zrangeWithScores()

> **zrangeWithScores**(`key`, `rangeQuery`, `reverse`): `T`

Returns the specified range of elements with their scores in the sorted set stored at `key`.
Similar to ZRange but with a `WITHSCORE` flag.

#### Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | `undefined` | The key of the sorted set. |
| `rangeQuery` | [`RangeByScore`](../../Commands/type-aliases/RangeByScore.md) \| [`RangeByIndex`](../../Commands/interfaces/RangeByIndex.md) | `undefined` | The range query object representing the type of range query to perform. - For range queries by index (rank), use [RangeByIndex](../../Commands/interfaces/RangeByIndex.md). - For range queries by score, use [RangeByScore](../../Commands/type-aliases/RangeByScore.md). |
| `reverse` | `boolean` | `false` | If `true`, reverses the sorted set, with index `0` as the element with the highest score. Command Response - A list of elements and their scores within the specified range. If `key` does not exist, it is treated as an empty sorted set, and the command returns an empty list. The response comes in format `GlideRecord<number>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrange/\|valkey.io](https://valkey.io/commands/zrange/|valkey.io) for details.

***

### zrank()

> **zrank**(`key`, `member`): `T`

Returns the rank of `member` in the sorted set stored at `key`, with scores ordered from low to high.
To get the rank of `member` with its score, see [zrankWithScore](BaseTransaction.md#zrankwithscore).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The member whose rank is to be retrieved. Command Response - The rank of `member` in the sorted set. If `key` doesn't exist, or if `member` is not present in the set, null will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrank/\|valkey.io](https://valkey.io/commands/zrank/|valkey.io) for more details.

***

### zrankWithScore()

> **zrankWithScore**(`key`, `member`): `T`

Returns the rank of `member` in the sorted set stored at `key` with its score, where scores are ordered from the lowest to highest.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The member whose rank is to be retrieved. Command Response - A list containing the rank and score of `member` in the sorted set. If `key` doesn't exist, or if `member` is not present in the set, null will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrank/\|valkey.io](https://valkey.io/commands/zrank/|valkey.io) for more details.

#### Remarks

Since Valkey version 7.2.0.

***

### zrem()

> **zrem**(`key`, `members`): `T`

Removes the specified members from the sorted set stored at `key`.
Specified members that are not a member of this set are ignored.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `members` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | A list of members to remove from the sorted set. Command Response - The number of members that were removed from the sorted set, not including non-existing members. If `key` does not exist, it is treated as an empty sorted set, and this command returns 0. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrem/\|valkey.io](https://valkey.io/commands/zrem/|valkey.io) for details.

***

### zremRangeByLex()

> **zremRangeByLex**(`key`, `minLex`, `maxLex`): `T`

Removes all elements in the sorted set stored at `key` with lexicographical order between `minLex` and `maxLex`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `minLex` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<[`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> | The minimum lex to count from. Can be negative infinity, or a specific lex and inclusivity. |
| `maxLex` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<[`GlideString`](../../BaseClient/type-aliases/GlideString.md)\> | The maximum lex to count up to. Can be positive infinity, or a specific lex and inclusivity. Command Response - The number of members removed. If `key` does not exist, it is treated as an empty sorted set, and the command returns 0. If `minLex` is greater than `maxLex`, 0 is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zremrangebylex/\|valkey.io](https://valkey.io/commands/zremrangebylex/|valkey.io) for details.

***

### zremRangeByRank()

> **zremRangeByRank**(`key`, `start`, `end`): `T`

Removes all elements in the sorted set stored at `key` with rank between `start` and `end`.
Both `start` and `end` are zero-based indexes with 0 being the element with the lowest score.
These indexes can be negative numbers, where they indicate offsets starting at the element with the highest score.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `start` | `number` | The starting point of the range. |
| `end` | `number` | The end of the range. Command Response - The number of members removed. If `start` exceeds the end of the sorted set, or if `start` is greater than `end`, 0 returned. If `end` exceeds the actual end of the sorted set, the range will stop at the actual end of the sorted set. If `key` does not exist 0 will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zremrangebyrank/\|valkey.io](https://valkey.io/commands/zremrangebyrank/|valkey.io) for details.

***

### zremRangeByScore()

> **zremRangeByScore**(`key`, `minScore`, `maxScore`): `T`

Removes all elements in the sorted set stored at `key` with a score between `minScore` and `maxScore`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `minScore` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`number`\> | The minimum score to remove from. Can be negative infinity, or specific score and inclusivity. |
| `maxScore` | [`Boundary`](../../Commands/type-aliases/Boundary.md)\<`number`\> | The maximum score to remove to. Can be positive infinity, or specific score and inclusivity. Command Response - the number of members removed. If `key` does not exist, it is treated as an empty sorted set, and the command returns 0. If `minScore` is greater than `maxScore`, 0 is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zremrangebyscore/\|valkey.io](https://valkey.io/commands/zremrangebyscore/|valkey.io) for details.

***

### zrevrank()

> **zrevrank**(`key`, `member`): `T`

Returns the rank of `member` in the sorted set stored at `key`, where
scores are ordered from the highest to lowest, starting from `0`.
To get the rank of `member` with its score, see [zrevrankWithScore](BaseTransaction.md#zrevrankwithscore).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The member whose rank is to be retrieved. Command Response - The rank of `member` in the sorted set, where ranks are ordered from high to low based on scores. If `key` doesn't exist, or if `member` is not present in the set, `null` will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrevrank/\|valkey.io](https://valkey.io/commands/zrevrank/|valkey.io) for details.

***

### zrevrankWithScore()

> **zrevrankWithScore**(`key`, `member`): `T`

Returns the rank of `member` in the sorted set stored at `key` with its
score, where scores are ordered from the highest to lowest, starting from `0`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The member whose rank is to be retrieved. Command Response - A list containing the rank and score of `member` in the sorted set, where ranks are ordered from high to low based on scores. If `key` doesn't exist, or if `member` is not present in the set, `null` will be returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zrevrank/\|valkey.io](https://valkey.io/commands/zrevrank/|valkey.io) for details.

#### Remarks

Since Valkey version 7.2.0.

***

### zscan()

> **zscan**(`key`, `cursor`, `options`?): `T`

Iterates incrementally over a sorted set.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `cursor` | `string` | The cursor that points to the next iteration of results. A value of `"0"` indicates the start of the search. |
| `options`? | [`ZScanOptions`](../../Commands/type-aliases/ZScanOptions.md) | (Optional) The `zscan` options - see [ZScanOptions](../../Commands/type-aliases/ZScanOptions.md) Command Response - An `Array` of the `cursor` and the subset of the sorted set held by `key`. The first element is always the `cursor` for the next iteration of results. `0` will be the `cursor` returned on the last iteration of the sorted set. The second element is always an `Array` of the subset of the sorted set held in `key`. The `Array` in the second element is a flattened series of `String` pairs, where the value is at even indices and the score is at odd indices. If `options.noScores` is to `true`, the second element will only contain the members without scores. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zscan/\|valkey.io](https://valkey.io/commands/zscan/|valkey.io) for more details.

***

### zscore()

> **zscore**(`key`, `member`): `T`

Returns the score of `member` in the sorted set stored at `key`.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the sorted set. |
| `member` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The member whose score is to be retrieved. Command Response - The score of the member. If `member` does not exist in the sorted set, null is returned. If `key` does not exist, null is returned. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zscore/\|valkey.io](https://valkey.io/commands/zscore/|valkey.io) for details.

***

### zunion()

> **zunion**(`keys`): `T`

Computes the union of sorted sets given by the specified `keys` and returns a list of union elements.

To get the scores as well, see [zunionWithScores](BaseTransaction.md#zunionwithscores).
To store the result in a key as a sorted set, see [zunionstore](BaseTransaction.md#zunionstore).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] | The keys of the sorted sets. Command Response - The resulting array with a union of sorted set elements. |

#### Returns

`T`

#### See

[https://valkey.io/commands/zunion/\|valkey.io](https://valkey.io/commands/zunion/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.

***

### zunionstore()

> **zunionstore**(`destination`, `keys`, `options`?): `T`

Computes the union of sorted sets given by the specified `keys` and stores the result in `destination`.
If `destination` already exists, it is overwritten. Otherwise, a new sorted set will be created.
To get the result directly, see [zunionWithScores](BaseTransaction.md#zunionwithscores).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The key of the destination sorted set. |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] \| [`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[] | The keys of the sorted sets with possible formats: - `GlideString[]` - for keys only. - `KeyWeight[]` - for weighted keys with their score multipliers. |
| `options`? | \{ `aggregationType`: [`AggregationType`](../../Commands/type-aliases/AggregationType.md); \} | (Optional) Additional parameters: - (Optional) `aggregationType`: the aggregation strategy to apply when combining the scores of elements. See [AggregationType](../../Commands/type-aliases/AggregationType.md). If `aggregationType` is not specified, defaults to `AggregationType.SUM`. Command Response - The number of elements in the resulting sorted set stored at `destination`. |
| `options.aggregationType`? | [`AggregationType`](../../Commands/type-aliases/AggregationType.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/zunionstore/\|valkey.io](https://valkey.io/commands/zunionstore/|valkey.io) for details.

***

### zunionWithScores()

> **zunionWithScores**(`keys`, `options`?): `T`

Computes the intersection of sorted sets given by the specified `keys` and returns a list of union elements with scores.
To get the elements only, see [zunion](BaseTransaction.md#zunion).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `keys` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] \| [`KeyWeight`](../../Commands/type-aliases/KeyWeight.md)[] | The keys of the sorted sets with possible formats: - `GlideString[]` - for keys only. - `KeyWeight[]` - for weighted keys with their score multipliers. |
| `options`? | \{ `aggregationType`: [`AggregationType`](../../Commands/type-aliases/AggregationType.md); \} | (Optional) Additional parameters: - (Optional) `aggregationType`: the aggregation strategy to apply when combining the scores of elements. See [AggregationType](../../Commands/type-aliases/AggregationType.md). If `aggregationType` is not specified, defaults to `AggregationType.SUM`. Command Response - A list of elements and their scores representing the intersection of the sorted sets. The response comes in format `GlideRecord<number>`, see [GlideRecord](../../BaseClient/type-aliases/GlideRecord.md). |
| `options.aggregationType`? | [`AggregationType`](../../Commands/type-aliases/AggregationType.md) | - |

#### Returns

`T`

#### See

[https://valkey.io/commands/zunion/\|valkey.io](https://valkey.io/commands/zunion/|valkey.io) for details.

#### Remarks

Since Valkey version 6.2.0.
