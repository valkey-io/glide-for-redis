[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [Commands](../README.md) / StreamAddOptions

# Interface: StreamAddOptions

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="id"></a> `id?` | `string` | If set, the new entry will be added with this ID. |
| <a id="makestream"></a> `makeStream?` | `boolean` | If set to `false`, a new stream won't be created if no stream matches the given key. Equivalent to `NOMKSTREAM` in the Valkey API. |
| <a id="trim"></a> `trim?` | [`StreamTrimOptions`](../type-aliases/StreamTrimOptions.md) | If set, the add operation will also trim the older entries in the stream. |
