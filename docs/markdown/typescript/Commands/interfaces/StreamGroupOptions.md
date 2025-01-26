[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / StreamGroupOptions

# Interface: StreamGroupOptions

Optional arguments for [xgroupCreate](../../BaseClient/classes/BaseClient.md#xgroupcreate).

See https://valkey.io/commands/xgroup-create/ for more details.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="entriesread"></a> `entriesRead?` | `string` | An arbitrary ID (that isn't the first ID, last ID, or the zero `"0-0"`. Use it to find out how many entries are between the arbitrary ID (excluding it) and the stream's last entry. since Valkey version 7.0.0. |
| <a id="mkstream"></a> `mkStream?` | `boolean` | If `true`and the stream doesn't exist, creates a new stream with a length of `0`. |
