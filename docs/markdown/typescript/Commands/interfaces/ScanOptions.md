[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / ScanOptions

# Interface: ScanOptions

Options for the SCAN command.
`match`: The match filter is applied to the result of the command and will only include keys that match the pattern specified.
`count`: `COUNT` is a just a hint for the command for how many elements to fetch from the server, the default is 10.
`type`: The type of the object to scan.
 Types are the data types of Valkey: `string`, `list`, `set`, `zset`, `hash`, `stream`.

## Extends

- [`BaseScanOptions`](BaseScanOptions.md)

## Extended by

- [`ClusterScanOptions`](ClusterScanOptions.md)

## Properties

| Property | Modifier | Type | Description | Inherited from |
| ------ | ------ | ------ | ------ | ------ |
| <a id="count"></a> `count?` | `readonly` | `number` | `COUNT` is a just a hint for the command for how many elements to fetch from the sorted set. `COUNT` could be ignored until the sorted set is large enough for the `SCAN` commands to represent the results as compact single-allocation packed encoding. | [`BaseScanOptions`](BaseScanOptions.md).[`count`](BaseScanOptions.md#count) |
| <a id="match"></a> `match?` | `public` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The match filter is applied to the result of the command and will only include strings that match the pattern specified. If the sorted set is large enough for scan commands to return only a subset of the sorted set then there could be a case where the result is empty although there are items that match the pattern specified. This is due to the default `COUNT` being `10` which indicates that it will only fetch and match `10` items from the list. | [`BaseScanOptions`](BaseScanOptions.md).[`match`](BaseScanOptions.md#match) |
| <a id="type"></a> `type?` | `public` | [`ObjectType`](../../BaseClient/enumerations/ObjectType.md) | - | - |
