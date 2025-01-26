[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / FunctionStatsSingleResponse

# Type Alias: FunctionStatsSingleResponse

> **FunctionStatsSingleResponse**: `Record`\<`string`, `null` \| `Record`\<`string`, [`GlideString`](../../BaseClient/type-aliases/GlideString.md) \| [`GlideString`](../../BaseClient/type-aliases/GlideString.md)[] \| `number`\> \| `Record`\<`string`, `Record`\<`string`, `number`\>\>\>

Response for `FUNCTION STATS` command on a single node.
 The response is a map with 2 keys:
 1. Information about the current running function/script (or null if none).
 2. Details about the execution engines.
