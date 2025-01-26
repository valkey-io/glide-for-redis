[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / createZRangeStore

# Function: createZRangeStore()

> **createZRangeStore**(`destination`, `source`, `rangeQuery`, `reverse`): `command_request.Command`

**`Internal`**

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `destination` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | `undefined` |
| `source` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | `undefined` |
| `rangeQuery` | [`RangeByScore`](../type-aliases/RangeByScore.md) \| [`RangeByLex`](../type-aliases/RangeByLex.md) \| [`RangeByIndex`](../interfaces/RangeByIndex.md) | `undefined` |
| `reverse` | `boolean` | `false` |

## Returns

`command_request.Command`
