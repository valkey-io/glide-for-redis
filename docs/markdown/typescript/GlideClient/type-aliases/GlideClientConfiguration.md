[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [GlideClient](../README.md) / GlideClientConfiguration

# Type Alias: GlideClientConfiguration

> **GlideClientConfiguration**: [`BaseClientConfiguration`](../../BaseClient/interfaces/BaseClientConfiguration.md) & `object`

Configuration options for creating a [GlideClient](../classes/GlideClient.md).

Extends `BaseClientConfiguration` with properties specific to `GlideClient`, such as database selection,
reconnection strategies, and Pub/Sub subscription settings.

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `advancedConfiguration`? | [`AdvancedGlideClientConfiguration`](AdvancedGlideClientConfiguration.md) | Advanced configuration settings for the client. |
| `connectionBackoff`? | `object` | Strategy used to determine how and when to reconnect, in case of connection failures. The time between attempts grows exponentially, to the formula rand(0 .. factor * (exponentBase ^ N)), where N is the number of failed attempts. The client will attempt to reconnect indefinitely. Once the maximum value is reached, that will remain the time between retry attempts until a reconnect attempt is succesful. If not set, a default backoff strategy will be used. |
| `connectionBackoff.exponentBase` | `number` | The exponent base configured for the strategy. Value must be an integer. |
| `connectionBackoff.factor` | `number` | The multiplier that will be applied to the waiting time between each retry. Value must be an integer. |
| `connectionBackoff.numberOfRetries` | `number` | Number of retry attempts that the client should perform when disconnected from the server, where the time between retries increases. Once the retries have reached the maximum value, the time between retries will remain constant until a reconnect attempt is succesful. Value must be an integer. |
| `databaseId`? | `number` | index of the logical database to connect to. |
| `pubsubSubscriptions`? | [`PubSubSubscriptions`](../namespaces/GlideClientConfiguration/interfaces/PubSubSubscriptions.md) | PubSub subscriptions to be used for the client. Will be applied via SUBSCRIBE/PSUBSCRIBE commands during connection establishment. |

## Remarks

This configuration allows you to tailor the client's behavior when connecting to a standalone Valkey Glide server.

- **Database Selection**: Use `databaseId` to specify which logical database to connect to.
- **Reconnection Strategy**: Customize how the client should attempt reconnections using `connectionBackoff`.
  - `numberOfRetries`: The maximum number of retry attempts with increasing delays.
    - After this limit is reached, the retry interval becomes constant.
  - `factor`: A multiplier applied to the base delay between retries (e.g., `500` means a 500ms base delay).
  - `exponentBase`: The exponential growth factor for delays (e.g., `2` means the delay doubles with each retry).
- **Pub/Sub Subscriptions**: Predefine Pub/Sub channels and patterns to subscribe to upon connection establishment.

## Example

```typescript
const config: GlideClientConfiguration = {
  databaseId: 1,
  connectionBackoff: {
    numberOfRetries: 10, // Maximum retries before delay becomes constant
    factor: 500,        // Base delay in milliseconds
    exponentBase: 2,    // Delay doubles with each retry (2^N)
  },
  pubsubSubscriptions: {
    channelsAndPatterns: {
      [GlideClientConfiguration.PubSubChannelModes.Pattern]: new Set(['news.*']),
    },
    callback: (msg) => {
      console.log(`Received message on ${msg.channel}:`, msg.payload);
    },
  },
};
```
