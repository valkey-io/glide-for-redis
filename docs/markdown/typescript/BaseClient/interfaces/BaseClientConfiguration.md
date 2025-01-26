[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [BaseClient](../README.md) / BaseClientConfiguration

# Interface: BaseClientConfiguration

Configuration settings for creating a client. Shared settings for standalone and cluster clients.

## Remarks

The `BaseClientConfiguration` interface defines the foundational configuration options used when creating a client to connect to a Valkey server or cluster. It includes connection details, authentication, communication protocols, and various settings that influence the client's behavior and interaction with the server.

### Connection Details

- **Addresses**: Use the `addresses` property to specify the hostnames and ports of the server(s) to connect to.
  - **Cluster Mode**: In cluster mode, the client will discover other nodes based on the provided addresses.
  - **Standalone Mode**: In standalone mode, only the provided nodes will be used.

### Security Settings

- **TLS**: Enable secure communication using `useTLS`.
- **Authentication**: Provide `credentials` to authenticate with the server.

### Communication Settings

- **Request Timeout**: Set `requestTimeout` to specify how long the client should wait for a request to complete.
- **Protocol Version**: Choose the serialization protocol using `protocol`.

### Client Identification

- **Client Name**: Set `clientName` to identify the client connection.

### Read Strategy

- Use `readFrom` to specify the client's read strategy (e.g., primary, preferReplica, AZAffinity).

### Availability Zone

- Use `clientAz` to specify the client's availability zone, which can influence read operations when using `readFrom: 'AZAffinity'`.

### Decoder Settings

- **Default Decoder**: Set `defaultDecoder` to specify how responses are decoded by default.

### Concurrency Control

- **Inflight Requests Limit**: Control the number of concurrent requests using `inflightRequestsLimit`.

## Example

```typescript
const config: BaseClientConfiguration = {
  addresses: [
    { host: 'redis-node-1.example.com', port: 6379 },
    { host: 'redis-node-2.example.com' }, // Defaults to port 6379
  ],
  useTLS: true,
  credentials: {
    username: 'myUser',
    password: 'myPassword',
  },
  requestTimeout: 5000, // 5 seconds
  protocol: ProtocolVersion.RESP3,
  clientName: 'myValkeyClient',
  readFrom: ReadFrom.AZAffinity,
  clientAz: 'us-east-1a',
  defaultDecoder: Decoder.String,
  inflightRequestsLimit: 1000,
};
```

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="addresses"></a> `addresses` | `object`[] | DNS Addresses and ports of known nodes in the cluster. If the server is in cluster mode the list can be partial, as the client will attempt to map out the cluster and find all nodes. If the server is in standalone mode, only nodes whose addresses were provided will be used by the client. **Example** `configuration.addresses = [ { address: sample-address-0001.use1.cache.amazonaws.com, port:6378 }, { address: sample-address-0002.use2.cache.amazonaws.com } { address: sample-address-0003.use2.cache.amazonaws.com, port:6380 } ]` |
| <a id="clientaz"></a> `clientAz?` | `string` | Availability Zone of the client. If ReadFrom strategy is AZAffinity, this setting ensures that readonly commands are directed to replicas within the specified AZ if exits. **Example** `// Example configuration for setting client availability zone and read strategy configuration.clientAz = 'us-east-1a'; // Sets the client's availability zone configuration.readFrom = 'AZAffinity'; // Directs read operations to nodes within the same AZ` |
| <a id="clientname"></a> `clientName?` | `string` | Client name to be used for the client. Will be used with CLIENT SETNAME command during connection establishment. |
| <a id="credentials"></a> `credentials?` | [`ServerCredentials`](ServerCredentials.md) | Credentials for authentication process. If none are set, the client will not authenticate itself with the server. |
| <a id="defaultdecoder"></a> `defaultDecoder?` | [`Decoder`](../enumerations/Decoder.md) | Default decoder when decoder is not set per command. If not set, 'Decoder.String' will be used. |
| <a id="inflightrequestslimit"></a> `inflightRequestsLimit?` | `number` | The maximum number of concurrent requests allowed to be in-flight (sent but not yet completed). This limit is used to control the memory usage and prevent the client from overwhelming the server or getting stuck in case of a queue backlog. If not set, a default value of 1000 will be used. |
| <a id="protocol"></a> `protocol?` | [`ProtocolVersion`](../enumerations/ProtocolVersion.md) | Serialization protocol to be used. If not set, `RESP3` will be used. |
| <a id="readfrom"></a> `readFrom?` | [`ReadFrom`](../type-aliases/ReadFrom.md) | The client's read from strategy. If not set, `Primary` will be used. |
| <a id="requesttimeout"></a> `requestTimeout?` | `number` | The duration in milliseconds that the client should wait for a request to complete. This duration encompasses sending the request, awaiting for a response from the server, and any required reconnections or retries. If the specified timeout is exceeded for a pending request, it will result in a timeout error. If not explicitly set, a default value of 250 milliseconds will be used. Value must be an integer. |
| <a id="usetls"></a> `useTLS?` | `boolean` | True if communication with the cluster should use Transport Level Security. Should match the TLS configuration of the server/cluster, otherwise the connection attempt will fail. |
