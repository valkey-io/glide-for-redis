[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / createLCS

# Function: createLCS()

> **createLCS**(`key1`, `key2`, `options`?): `command_request.Command`

**`Internal`**

## Parameters

| Parameter | Type |
| ------ | ------ |
| `key1` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |
| `key2` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |
| `options`? | \{ `idx`: \{ `minMatchLen`: `number`; `withMatchLen`: `boolean`; \}; `len`: `boolean`; \} |
| `options.idx`? | \{ `minMatchLen`: `number`; `withMatchLen`: `boolean`; \} |
| `options.idx.minMatchLen`? | `number` |
| `options.idx.withMatchLen`? | `boolean` |
| `options.len`? | `boolean` |

## Returns

`command_request.Command`
