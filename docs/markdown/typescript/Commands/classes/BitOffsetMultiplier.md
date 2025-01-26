[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BitOffsetMultiplier

# Class: BitOffsetMultiplier

Represents an offset in an array of bits for the [bitfield](../../BaseClient/classes/BaseClient.md#bitfield) or
[bitfieldReadOnly](../../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands. The bit offset index is calculated as the numerical
value of the offset multiplied by the encoding value.

For example, if we have the binary 01101001 with offset multiplier of 1 for an unsigned encoding of size 4, then the
value is 9 from `0110(1001)`.

## Implements

- [`BitFieldOffset`](../interfaces/BitFieldOffset.md)

## Constructors

### new BitOffsetMultiplier()

> **new BitOffsetMultiplier**(`offset`): [`BitOffsetMultiplier`](BitOffsetMultiplier.md)

Creates an instance of BitOffsetMultiplier.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `offset` | `number` | The offset in the array of bits, which will be multiplied by the encoding value to get the final bit index offset. |

#### Returns

[`BitOffsetMultiplier`](BitOffsetMultiplier.md)

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
