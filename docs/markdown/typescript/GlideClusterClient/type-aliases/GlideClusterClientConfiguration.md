[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [GlideClusterClient](../README.md) / GlideClusterClientConfiguration

# Type Alias: GlideClusterClientConfiguration

> **GlideClusterClientConfiguration**: [`BaseClientConfiguration`](../../BaseClient/interfaces/BaseClientConfiguration.md) & `object`

Configuration options for creating a [GlideClusterClient](../classes/GlideClusterClient.md).

Extends [BaseClientConfiguration](../../BaseClient/interfaces/BaseClientConfiguration.md) with properties specific to `GlideClusterClient`, such as periodic topology checks
and Pub/Sub subscription settings.

## Type declaration

| Name | Type | Description |
| ------ | ------ | ------ |
| `advancedConfiguration`? | [`AdvancedGlideClusterClientConfiguration`](AdvancedGlideClusterClientConfiguration.md) | Advanced configuration settings for the client. |
| `periodicChecks`? | [`PeriodicChecks`](PeriodicChecks.md) | Configure the periodic topology checks. These checks evaluate changes in the cluster's topology, triggering a slot refresh when detected. Periodic checks ensure a quick and efficient process by querying a limited number of nodes. If not set, `enabledDefaultConfigs` will be used. |
| `pubsubSubscriptions`? | [`PubSubSubscriptions`](../namespaces/GlideClusterClientConfiguration/interfaces/PubSubSubscriptions.md) | PubSub subscriptions to be used for the client. Will be applied via SUBSCRIBE/PSUBSCRIBE/SSUBSCRIBE commands during connection establishment. |

## Remarks

This configuration allows you to tailor the client's behavior when connecting to a Valkey GLIDE Cluster.

- **Periodic Topology Checks**: Use `periodicChecks` to configure how the client performs periodic checks to detect changes in the cluster's topology.
  - `"enabledDefaultConfigs"`: Enables periodic checks with default configurations.
  - `"disabled"`: Disables periodic topology checks.
  - `{ duration_in_sec: number }`: Manually configure the interval for periodic checks.
- **Pub/Sub Subscriptions**: Predefine Pub/Sub channels and patterns to subscribe to upon connection establishment.
  - Supports exact channels, patterns, and sharded channels (available since Valkey version 7.0).

## Example

```typescript
const config: GlideClusterClientConfiguration = {
  periodicChecks: {
    duration_in_sec: 30, // Perform periodic checks every 30 seconds
  },
  pubsubSubscriptions: {
    channelsAndPatterns: {
      [GlideClusterClientConfiguration.PubSubChannelModes.Pattern]: new Set(['cluster.*']),
    },
    callback: (msg) => {
      console.log(`Received message on ${msg.channel}:`, msg.payload);
    },
  },
};
```
