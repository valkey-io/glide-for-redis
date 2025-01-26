[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / BaseScanOptions

# Interface: BaseScanOptions

This base class represents the common set of optional arguments for the SCAN family of commands.
Concrete implementations of this class are tied to specific SCAN commands (`SCAN`, `SSCAN`).

## Extended by

- [`ScanOptions`](ScanOptions.md)

## Properties

| Property | Modifier | Type | Description |
| ------ | ------ | ------ | ------ |
| <a id="count"></a> `count?` | `readonly` | `number` | `COUNT` is a just a hint for the command for how many elements to fetch from the sorted set. `COUNT` could be ignored until the sorted set is large enough for the `SCAN` commands to represent the results as compact single-allocation packed encoding. |
| <a id="match"></a> `match?` | `public` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | The match filter is applied to the result of the command and will only include strings that match the pattern specified. If the sorted set is large enough for scan commands to return only a subset of the sorted set then there could be a case where the result is empty although there are items that match the pattern specified. This is due to the default `COUNT` being `10` which indicates that it will only fetch and match `10` items from the list. |
