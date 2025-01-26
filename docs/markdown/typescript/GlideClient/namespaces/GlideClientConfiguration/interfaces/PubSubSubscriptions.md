[**@valkey/valkey-glide**](../../../../README.md)

***

[@valkey/valkey-glide](../../../../modules.md) / [GlideClient](../../../README.md) / [GlideClientConfiguration](../README.md) / PubSubSubscriptions

# Interface: PubSubSubscriptions

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="callback"></a> `callback?` | (`msg`: [`PubSubMsg`](../../../../BaseClient/interfaces/PubSubMsg.md), `context`: `any`) => `void` | Optional callback to accept the incoming messages. |
| <a id="channelsandpatterns"></a> `channelsAndPatterns` | `Partial`\<`Record`\<[`PubSubChannelModes`](../enumerations/PubSubChannelModes.md), `Set`\<`string`\>\>\> | Channels and patterns by modes. |
| <a id="context-2"></a> `context?` | `any` | Arbitrary context to pass to the callback. |
