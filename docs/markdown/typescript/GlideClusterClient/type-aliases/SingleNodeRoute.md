[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [GlideClusterClient](../README.md) / SingleNodeRoute

# Type Alias: SingleNodeRoute

> **SingleNodeRoute**: `"randomNode"` \| [`SlotIdTypes`](../interfaces/SlotIdTypes.md) \| [`SlotKeyTypes`](../interfaces/SlotKeyTypes.md) \| [`RouteByAddress`](../interfaces/RouteByAddress.md)

Defines the routing configuration to a single node in the Valkey cluster.

## Remarks

The `SingleNodeRoute` type allows you to specify routing of a command to a single node in the cluster.
This can be based on various criteria such as a random node, a node responsible for a specific slot, or a node identified by its address.

**Options**:

- **"randomNode"**: Route the command to a random node in the cluster.
- **`SlotIdTypes`**: Route to the node responsible for a specific slot ID.
- **`SlotKeyTypes`**: Route to the node responsible for the slot of a specific key.
- **`RouteByAddress`**: Route to a specific node by its address and port.

## Example

```typescript
// Route to a random node
const routeRandomNode: SingleNodeRoute = "randomNode";

// Route based on slot ID
const routeBySlotId: SingleNodeRoute = {
  type: "primarySlotId",
  id: 12345,
};

// Route based on key
const routeByKey: SingleNodeRoute = {
  type: "primarySlotKey",
  key: "myKey",
};

// Route to a specific node by address
const routeByAddress: SingleNodeRoute = {
  type: "routeByAddress",
  host: "192.168.1.10",
  port: 6379,
};

// Use the routing configuration when executing a command
const result = await client.get("myKey", { route: routeByKey });
```
