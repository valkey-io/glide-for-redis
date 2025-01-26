[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / FunctionRestorePolicy

# Enumeration: FunctionRestorePolicy

Option for `FUNCTION RESTORE` command: [GlideClient.functionRestore](../../GlideClient/classes/GlideClient.md#functionrestore) and
[GlideClusterClient.functionRestore](../../GlideClusterClient/classes/GlideClusterClient.md#functionrestore).

## See

[https://valkey.io/commands/function-restore/"\|valkey.io](https://valkey.io/commands/function-restore/"|valkey.io) for more details.

## Enumeration Members

| Enumeration Member | Value | Description |
| ------ | ------ | ------ |
| <a id="append"></a> `APPEND` | `"APPEND"` | Appends the restored libraries to the existing libraries and aborts on collision. This is the default policy. |
| <a id="flush"></a> `FLUSH` | `"FLUSH"` | Deletes all existing libraries before restoring the payload. |
| <a id="replace"></a> `REPLACE` | `"REPLACE"` | Appends the restored libraries to the existing libraries, replacing any existing ones in case of name collisions. Note that this policy doesn't prevent function name collisions, only libraries. |
