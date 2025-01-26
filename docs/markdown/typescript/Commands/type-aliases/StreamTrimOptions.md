[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / StreamTrimOptions

# Type Alias: StreamTrimOptions

> **StreamTrimOptions**: \{ `method`: `"minid"`; `threshold`: [`GlideString`](../../BaseClient/type-aliases/GlideString.md); \} \| \{ `method`: `"maxlen"`; `threshold`: `number`; \} & `object`

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `exact` | `boolean` | If `true`, the stream will be trimmed exactly. Equivalent to `=` in the Valkey API. Otherwise the stream will be trimmed in a near-exact manner, which is more efficient, equivalent to `~` in the Valkey API. |
| `limit`? | `number` | If set, sets the maximal amount of entries that will be deleted. |
