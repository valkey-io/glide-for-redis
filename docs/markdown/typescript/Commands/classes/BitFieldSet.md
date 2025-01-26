[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BitFieldSet

# Class: BitFieldSet

Represents the "SET" subcommand for setting bits in the binary representation of the string stored in `key`.

## Implements

- [`BitFieldSubCommands`](../interfaces/BitFieldSubCommands.md)

## Constructors

### new BitFieldSet()

> **new BitFieldSet**(`encoding`, `offset`, `value`): [`BitFieldSet`](BitFieldSet.md)

Creates an instance of BitFieldSet

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encoding` | [`BitEncoding`](../interfaces/BitEncoding.md) | The bit encoding for the subcommand. |
| `offset` | [`BitFieldOffset`](../interfaces/BitFieldOffset.md) | The offset in the array of bits where the value will be set. |
| `value` | `number` | The value to set the bits in the binary value to. |

#### Returns

[`BitFieldSet`](BitFieldSet.md)

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
