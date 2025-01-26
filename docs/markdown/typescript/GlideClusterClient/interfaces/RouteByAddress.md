[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [GlideClusterClient](../README.md) / RouteByAddress

# Interface: RouteByAddress

Routing configuration to send a command to a specific node by its address and port.

## Remarks

This interface allows you to specify routing of a command to a node in the Valkey cluster by providing its network address and port.
It's useful when you need to direct a command to a particular node.

- **Type**: Must be set to `"routeByAddress"` to indicate that the routing should be based on the provided address.
- **Host**: The endpoint of the node.
  - If `port` is not provided, `host` should be in the format `${address}:${port}`, where `address` is the preferred endpoint as shown in the output of the `CLUSTER SLOTS` command.
  - If `port` is provided, `host` should be the address or hostname of the node without the port.
- **Port**: (Optional) The port to access on the node.
  - If `port` is not provided, `host` is assumed to include the port number.

## Example

```typescript
// Route command to a node at '192.168.1.10:6379'
const routeByAddress: RouteByAddress = {
  type: "routeByAddress",
  host: "192.168.1.10",
  port: 6379,
};

// Alternatively, include the port in the host string
const routeByAddressWithPortInHost: RouteByAddress = {
  type: "routeByAddress",
  host: "192.168.1.10:6379",
};

// Use the routing configuration when executing a command
const result = await client.ping({ route: routeByAddress });
```

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="host"></a> `host` | `string` | The endpoint of the node. If `port` is not provided, should be in the `${address}:${port}` format, where `address` is the preferred endpoint as shown in the output of the `CLUSTER SLOTS` command. |
| <a id="port"></a> `port?` | `number` | The port to access on the node. If port is not provided, `host` is assumed to be in the format `${address}:${port}`. |
| <a id="type"></a> `type` | `"routeByAddress"` | - |
