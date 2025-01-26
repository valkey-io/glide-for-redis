[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / SetOptions

# Type Alias: SetOptions

> **SetOptions**: \{ `conditionalSet`: `"onlyIfExists"` \| `"onlyIfDoesNotExist"`; \} \| \{ `comparisonValue`: [`GlideString`](../../BaseClient/type-aliases/GlideString.md); `conditionalSet`: `"onlyIfEqual"`; \} & `object`

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `expiry`? | `"keepExisting"` \| \{ `count`: `number`; `type`: [`TimeUnit`](../enumerations/TimeUnit.md); \} | If not set, no expiry time will be set for the value. |
| `returnOldValue`? | `boolean` | Return the old string stored at key, or nil if key did not exist. An error is returned and SET aborted if the value stored at key is not a string. Equivalent to `GET` in the Valkey API. |
