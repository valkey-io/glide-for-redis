[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / StreamPendingOptions

# Interface: StreamPendingOptions

Optional arguments for [xpending](../../BaseClient/classes/BaseClient.md#xpendingwithoptions).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="consumer"></a> `consumer?` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | Filter pending entries by consumer. |
| <a id="count"></a> `count` | `number` | Limit the number of messages returned. |
| <a id="end"></a> `end` | [`Boundary`](../type-aliases/Boundary.md)\<`string`\> | Ending stream ID bound for range. Exclusive range is available since Valkey 6.2.0. |
| <a id="minidletime"></a> `minIdleTime?` | `number` | Filter pending entries by their idle time - in milliseconds. Available since Valkey 6.2.0. |
| <a id="start"></a> `start` | [`Boundary`](../type-aliases/Boundary.md)\<`string`\> | Starting stream ID bound for range. Exclusive range is available since Valkey 6.2.0. |
