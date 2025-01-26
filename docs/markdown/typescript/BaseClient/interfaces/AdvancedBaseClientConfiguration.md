[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [BaseClient](../README.md) / AdvancedBaseClientConfiguration

# Interface: AdvancedBaseClientConfiguration

Represents advanced configuration settings for a client, including connection-related options.

## Remarks

The `AdvancedBaseClientConfiguration` interface defines advanced configuration settings for managing the client's connection behavior.

### Connection Timeout

- **Connection Timeout**: The `connectionTimeout` property specifies the duration (in milliseconds) the client should wait for a connection to be established.

## Example

```typescript
const config: AdvancedBaseClientConfiguration = {
  connectionTimeout: 5000, // 5 seconds
};
```

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="connectiontimeout"></a> `connectionTimeout?` | `number` | The duration in milliseconds to wait for a TCP/TLS connection to complete. This applies both during initial client creation and any reconnections that may occur during request processing. **Note**: A high connection timeout may lead to prolonged blocking of the entire command pipeline. If not explicitly set, a default value of 250 milliseconds will be used. |
