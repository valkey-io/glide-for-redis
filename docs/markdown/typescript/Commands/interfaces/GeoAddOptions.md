[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / GeoAddOptions

# Interface: GeoAddOptions

Optional arguments for the GeoAdd command.

See https://valkey.io/commands/geoadd/ for more details.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="changed"></a> `changed?` | `boolean` | If `true`, returns the count of changed elements instead of new elements added. |
| <a id="updatemode"></a> `updateMode?` | [`ConditionalChange`](../enumerations/ConditionalChange.md) | Options for handling existing members. See [ConditionalChange](../enumerations/ConditionalChange.md). |
