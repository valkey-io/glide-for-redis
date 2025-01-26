[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / createXReadGroup

# Function: createXReadGroup()

> **createXReadGroup**(`group`, `consumer`, `keys_and_ids`, `options`?): `command_request.Command`

**`Internal`**

## Parameters

| Parameter | Type |
| ------ | ------ |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |
| `consumer` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |
| `keys_and_ids` | [`GlideRecord`](../../BaseClient/type-aliases/GlideRecord.md)\<`string`\> |
| `options`? | [`StreamReadGroupOptions`](../type-aliases/StreamReadGroupOptions.md) |

## Returns

`command_request.Command`
