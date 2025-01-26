[**@valkey/valkey-glide**](../../../README.md)

***

[@valkey/valkey-glide](../../../modules.md) / [server-modules/GlideJson](../README.md) / JsonGetOptions

# Interface: JsonGetOptions

Represents options for formatting JSON data, to be used in the [JSON.GET](../classes/GlideJson.md#get) command.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="indent"></a> `indent?` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | Sets an indentation string for nested levels. |
| <a id="newline"></a> `newline?` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | Sets a string that's printed at the end of each line. |
| <a id="noescape"></a> `noescape?` | `boolean` | Optional, allowed to be present for legacy compatibility and has no other effect |
| <a id="path"></a> `path?` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) \| [`GlideString`](../../../BaseClient/type-aliases/GlideString.md)[] | The path or list of paths within the JSON document. Default is root `$`. |
| <a id="space"></a> `space?` | [`GlideString`](../../../BaseClient/type-aliases/GlideString.md) | Sets a string that's put between a key and a value. |
