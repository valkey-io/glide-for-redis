[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BitmapIndexType

# Enumeration: BitmapIndexType

Enumeration specifying if index arguments are BYTE indexes or BIT indexes.
Can be specified in [BitOffsetOptions](../interfaces/BitOffsetOptions.md), which is an optional argument to the [bitcount](../../BaseClient/classes/BaseClient.md#bitcount) command.
Can also be specified as an optional argument to the BaseClient.bitposInverval\|bitposInterval command.

since - Valkey version 7.0.0.

## Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| <a id="bit"></a> `BIT` | `"BIT"` | Specifies that provided indexes are bit indexes. |
| <a id="byte"></a> `BYTE` | `"BYTE"` | Specifies that provided indexes are byte indexes. |
