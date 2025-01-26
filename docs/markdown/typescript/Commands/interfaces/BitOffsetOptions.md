[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BitOffsetOptions

# Interface: BitOffsetOptions

Represents offsets specifying a string interval to analyze in the [bitcount](../../BaseClient/classes/BaseClient.md#bitcount) and [bitpos](../../BaseClient/classes/BaseClient.md#bitpos) commands.
The offsets are zero-based indexes, with `0` being the first index of the string, `1` being the next index and so on.
The offsets can also be negative numbers indicating offsets starting at the end of the string, with `-1` being
the last index of the string, `-2` being the penultimate, and so on.

If you are using Valkey 7.0.0 or above, the optional `indexType` can also be provided to specify whether the
`start` and `end` offsets specify `BIT` or `BYTE` offsets. If `indexType` is not provided, `BYTE` offsets
are assumed. If `BIT` is specified, `start=0` and `end=2` means to look at the first three bits. If `BYTE` is
specified, `start=0` and `end=2` means to look at the first three bytes.

## See

[bitcount](https://valkey.io/commands/bitcount/) and [bitpos](https://valkey.io/commands/bitpos/) for more details.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="end"></a> `end?` | `number` | The ending offset index. Optional since Valkey version 8.0 and above for the BITCOUNT command. If not provided, it will default to the end of the string. Could be defined only if `start` is defined. |
| <a id="indextype"></a> `indexType?` | [`BitmapIndexType`](../enumerations/BitmapIndexType.md) | The index offset type. This option can only be specified if you are using server version 7.0.0 or above. Could be either [BitmapIndexType.BYTE](../enumerations/BitmapIndexType.md#byte) or [BitmapIndexType.BIT](../enumerations/BitmapIndexType.md#bit). If no index type is provided, the indexes will be assumed to be byte indexes. |
| <a id="start"></a> `start` | `number` | The starting offset index. |
