[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BitFieldGet

# Class: BitFieldGet

Represents the "GET" subcommand for getting a value in the binary representation of the string stored in `key`.

## Implements

- [`BitFieldSubCommands`](../interfaces/BitFieldSubCommands.md)

## Constructors

### new BitFieldGet()

> **new BitFieldGet**(`encoding`, `offset`): [`BitFieldGet`](BitFieldGet.md)

Creates an instance of BitFieldGet.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encoding` | [`BitEncoding`](../interfaces/BitEncoding.md) | The bit encoding for the subcommand. |
| `offset` | [`BitFieldOffset`](../interfaces/BitFieldOffset.md) | The offset in the array of bits from which to get the value. |

#### Returns

[`BitFieldGet`](BitFieldGet.md)

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
