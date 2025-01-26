[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / StreamClaimOptions

# Interface: StreamClaimOptions

Optional parameters for [xclaim](../../BaseClient/classes/BaseClient.md#xclaim) command.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="idle"></a> `idle?` | `number` | Set the idle time (last time it was delivered) of the message in milliseconds. If `idle` is not specified, an `idle` of `0` is assumed, that is, the time count is reset because the message now has a new owner trying to process it. |
| <a id="idleunixtime"></a> `idleUnixTime?` | `number` | This is the same as [idle](StreamClaimOptions.md#idle) but instead of a relative amount of milliseconds, it sets the idle time to a specific Unix time (in milliseconds). This is useful in order to rewrite the AOF file generating `XCLAIM` commands. |
| <a id="isforce"></a> `isForce?` | `boolean` | Creates the pending message entry in the PEL even if certain specified IDs are not already in the PEL assigned to a different client. However, the message must exist in the stream, otherwise the IDs of non-existing messages are ignored. |
| <a id="retrycount"></a> `retryCount?` | `number` | Set the retry counter to the specified value. This counter is incremented every time a message is delivered again. Normally [xclaim](../../BaseClient/classes/BaseClient.md#xclaim) does not alter this counter, which is just served to clients when the [xpending](../../BaseClient/classes/BaseClient.md#xpending) command is called: this way clients can detect anomalies, like messages that are never processed for some reason after a big number of delivery attempts. |
