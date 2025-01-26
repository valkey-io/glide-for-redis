[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BitOffset

# Class: BitOffset

Represents an offset in an array of bits for the [bitfield](../../BaseClient/classes/BaseClient.md#bitfield) or
[bitfieldReadOnly](../../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands.

For example, if we have the binary `01101001` with offset of 1 for an unsigned encoding of size 4, then the value
is 13 from `0(1101)001`.

## Implements

- [`BitFieldOffset`](../interfaces/BitFieldOffset.md)

## Constructors

### new BitOffset()

> **new BitOffset**(`offset`): [`BitOffset`](BitOffset.md)

Creates an instance of BitOffset.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `offset` | `number` | The bit index offset in the array of bits. Must be greater than or equal to 0. |

#### Returns

[`BitOffset`](BitOffset.md)

## Methods

### toArg()

> **toArg**(): `string`

Returns the offset as a string argument to be used in the [bitfield](../../BaseClient/classes/BaseClient.md#bitfield) or
[bitfieldReadOnly](../../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands.

#### Returns

`string`

The offset as a string argument.

#### Implementation of

[`BitFieldOffset`](../interfaces/BitFieldOffset.md).[`toArg`](../interfaces/BitFieldOffset.md#toarg)
