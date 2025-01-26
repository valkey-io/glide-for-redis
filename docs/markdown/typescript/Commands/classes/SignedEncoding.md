[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / SignedEncoding

# Class: SignedEncoding

Represents a signed argument encoding.

## Implements

- [`BitEncoding`](../interfaces/BitEncoding.md)

## Constructors

### new SignedEncoding()

> **new SignedEncoding**(`encodingLength`): [`SignedEncoding`](SignedEncoding.md)

Creates an instance of SignedEncoding.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `encodingLength` | `number` | The bit size of the encoding. Must be less than 65 bits long. |

#### Returns

[`SignedEncoding`](SignedEncoding.md)

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
