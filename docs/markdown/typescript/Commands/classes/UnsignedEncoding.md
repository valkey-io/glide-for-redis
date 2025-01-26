[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / UnsignedEncoding

# Class: UnsignedEncoding

Represents an unsigned argument encoding.

## Implements

- [`BitEncoding`](../interfaces/BitEncoding.md)

## Constructors

### new UnsignedEncoding()

> **new UnsignedEncoding**(`encodingLength`): [`UnsignedEncoding`](UnsignedEncoding.md)

Creates an instance of UnsignedEncoding.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encodingLength` | `number` | The bit size of the encoding. Must be less than 64 bits long. |

#### Returns

[`UnsignedEncoding`](UnsignedEncoding.md)

## Methods

### toArg()

> **toArg**(): `string`

Returns the encoding as a string argument to be used in the [bitfield](../../BaseClient/classes/BaseClient.md#bitfield) or
[bitfieldReadOnly](../../BaseClient/classes/BaseClient.md#bitfieldreadonly) commands.

#### Returns

`string`

The encoding as a string argument.

#### Implementation of

[`BitEncoding`](../interfaces/BitEncoding.md).[`toArg`](../interfaces/BitEncoding.md#toarg)
