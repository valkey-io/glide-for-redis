[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / FlushMode

# Enumeration: FlushMode

Defines flushing mode for [GlideClient.flushall](../../GlideClient/classes/GlideClient.md#flushall), [GlideClusterClient.flushall](../../GlideClusterClient/classes/GlideClusterClient.md#flushall),
     [GlideClient.functionFlush](../../GlideClient/classes/GlideClient.md#functionflush), [GlideClusterClient.functionFlush](../../GlideClusterClient/classes/GlideClusterClient.md#functionflush),
     [GlideClient.flushdb](../../GlideClient/classes/GlideClient.md#flushdb) and [GlideClusterClient.flushdb](../../GlideClusterClient/classes/GlideClusterClient.md#flushdb) commands.

See https://valkey.io/commands/flushall/ and https://valkey.io/commands/flushdb/ for details.

## Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| <a id="async"></a> `ASYNC` | `"ASYNC"` | Flushes asynchronously. |
| <a id="sync"></a> `SYNC` | `"SYNC"` | Flushes synchronously. since Valkey version 6.2.0. |
