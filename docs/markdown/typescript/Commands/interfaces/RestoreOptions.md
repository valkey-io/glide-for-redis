[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / RestoreOptions

# Interface: RestoreOptions

Optional arguments for `RESTORE` command.

## See

[https://valkey.io/commands/restore/\|valkey.io](https://valkey.io/commands/restore/|valkey.io) for details.

## Remarks

`IDLETIME` and `FREQ` modifiers cannot be set at the same time.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="absttl"></a> `absttl?` | `boolean` | Set to `true` to specify that `ttl` argument of [BaseClient.restore](../../BaseClient/classes/BaseClient.md#restore) represents an absolute Unix timestamp (in milliseconds). |
| <a id="frequency"></a> `frequency?` | `number` | Set the `FREQ` option with object frequency to the given key. |
| <a id="idletime"></a> `idletime?` | `number` | Set the `IDLETIME` option with object idletime to the given key. |
| <a id="replace"></a> `replace?` | `boolean` | Set to `true` to replace the key if it exists. |
