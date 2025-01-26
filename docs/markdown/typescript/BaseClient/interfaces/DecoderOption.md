[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [BaseClient](../README.md) / DecoderOption

# Interface: DecoderOption

An extension to command option types with [Decoder](../enumerations/Decoder.md).

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="decoder"></a> `decoder?` | [`Decoder`](../enumerations/Decoder.md) | [Decoder](../enumerations/Decoder.md) type which defines how to handle the response. If not set, the [default decoder](BaseClientConfiguration.md#defaultdecoder) will be used. |
