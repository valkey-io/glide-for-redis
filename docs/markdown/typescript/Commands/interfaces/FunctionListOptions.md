[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / FunctionListOptions

# Interface: FunctionListOptions

Optional arguments for `FUNCTION LIST` command.

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="libnamepattern"></a> `libNamePattern?` | [`GlideString`](../../BaseClient/type-aliases/GlideString.md) | A wildcard pattern for matching library names. |
| <a id="withcode"></a> `withCode?` | `boolean` | Specifies whether to request the library code from the server or not. |
