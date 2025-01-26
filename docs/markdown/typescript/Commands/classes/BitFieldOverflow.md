[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BitFieldOverflow

# Class: BitFieldOverflow

Represents the "OVERFLOW" subcommand that determines the result of the "SET" or "INCRBY"
[bitfield](../../BaseClient/classes/BaseClient.md#bitfield) subcommands when an underflow or overflow occurs.

## Implements

- [`BitFieldSubCommands`](../interfaces/BitFieldSubCommands.md)

## Constructors

### new BitFieldOverflow()

> **new BitFieldOverflow**(`overflowControl`): [`BitFieldOverflow`](BitFieldOverflow.md)

Creates an instance of BitFieldOverflow.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `overflowControl` | [`BitOverflowControl`](../enumerations/BitOverflowControl.md) | The desired overflow behavior. |

#### Returns

[`BitFieldOverflow`](BitFieldOverflow.md)

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
