[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / Limit

# Interface: Limit

The `LIMIT` argument is commonly used to specify a subset of results from the
matching elements, similar to the `LIMIT` clause in SQL (e.g., `SELECT LIMIT offset, count`).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="count"></a> `count` | `number` | The maximum number of elements to include in the range. A negative count returns all elements from the offset. |
| <a id="offset"></a> `offset` | `number` | The starting position of the range, zero based. |
