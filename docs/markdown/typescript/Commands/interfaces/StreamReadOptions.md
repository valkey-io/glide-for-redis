[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / StreamReadOptions

# Interface: StreamReadOptions

Optional arguments for [xread](../../BaseClient/classes/BaseClient.md#xread) command.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="block"></a> `block?` | `number` | If set, the read request will block for the set amount of milliseconds or until the server has the required number of entries. A value of `0` will block indefinitely. Equivalent to `BLOCK` in the Valkey API. |
| <a id="count"></a> `count?` | `number` | The maximal number of elements requested. Equivalent to `COUNT` in the Valkey API. |
