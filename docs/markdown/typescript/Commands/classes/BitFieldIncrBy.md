[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BitFieldIncrBy

# Class: BitFieldIncrBy

Represents the "INCRBY" subcommand for increasing or decreasing bits in the binary representation of the string
stored in `key`.

## Implements

- [`BitFieldSubCommands`](../interfaces/BitFieldSubCommands.md)

## Constructors

### new BitFieldIncrBy()

> **new BitFieldIncrBy**(`encoding`, `offset`, `increment`): [`BitFieldIncrBy`](BitFieldIncrBy.md)

Creates an instance of BitFieldIncrBy

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encoding` | [`BitEncoding`](../interfaces/BitEncoding.md) | The bit encoding for the subcommand. |
| `offset` | [`BitFieldOffset`](../interfaces/BitFieldOffset.md) | The offset in the array of bits where the value will be incremented. |
| `increment` | `number` | The value to increment the bits in the binary value by. |

#### Returns

[`BitFieldIncrBy`](BitFieldIncrBy.md)

## Methods

### toArgs()

> **toArgs**(): `string`[]

Returns the subcommand as a list of string arguments to be used in the [bitfield](../../BaseClient/classes/BaseClient.md#bitfield) or
[bitfieldReadOnly](../../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands.

#### Returns

`string`[]

The subcommand as a list of string arguments.

#### Implementation of

[`BitFieldSubCommands`](../interfaces/BitFieldSubCommands.md).[`toArgs`](../interfaces/BitFieldSubCommands.md#toargs)
