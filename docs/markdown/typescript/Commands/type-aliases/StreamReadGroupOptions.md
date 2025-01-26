[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / StreamReadGroupOptions

# Type Alias: StreamReadGroupOptions

> **StreamReadGroupOptions**: [`StreamReadOptions`](../interfaces/StreamReadOptions.md) & `object`

Optional arguments for [xreadgroup](../../BaseClient/classes/BaseClient.md#xreadgroup) command.

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `noAck`? | `boolean` | If set, messages are not added to the Pending Entries List (PEL). This is equivalent to acknowledging the message when it is read. |
