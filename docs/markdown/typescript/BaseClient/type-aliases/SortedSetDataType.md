[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [BaseClient](../README.md) / SortedSetDataType

# Type Alias: SortedSetDataType

> **SortedSetDataType**: `object`[]

Data type which represents sorted sets data, including elements and their respective scores.
Similar to `Record<GlideString, number>` - see [GlideRecord](GlideRecord.md).

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `element` | [`GlideString`](GlideString.md) | The sorted set element name. |
| `score` | `number` | The element score. |
