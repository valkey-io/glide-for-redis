[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / createXClaim

# Function: createXClaim()

> **createXClaim**(`key`, `group`, `consumer`, `minIdleTime`, `ids`, `options`?, `justId`?): `command_request.Command`

**`Internal`**

## Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |
| `group` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |
| `consumer` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) |
| `minIdleTime` | `number` |
| `ids` | `string`[] |
| `options`? | [`StreamClaimOptions`](../interfaces/StreamClaimOptions.md) |
| `justId`? | `boolean` |

## Returns

`command_request.Command`
