[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [GlideClusterClient](../README.md) / Routes

# Type Alias: Routes

> **Routes**: [`SingleNodeRoute`](SingleNodeRoute.md) \| `"allPrimaries"` \| `"allNodes"`

Defines the routing configuration for a command in a Valkey cluster.

## Remarks

The `Routes` type allows you to specify how a command should be routed in a Valkey cluster.
Commands can be routed to a single node or broadcast to multiple nodes depending on the routing strategy.

**Routing Options**:

- **Single Node Routing** (`SingleNodeRoute`):
  - **"randomNode"**: Route the command to a random node in the cluster.
  - **`SlotIdTypes`**: Route based on a specific slot ID.
  - **`SlotKeyTypes`**: Route based on the slot of a specific key.
  - **`RouteByAddress`**: Route to a specific node by its address and port.
- **Broadcast Routing**:
  - **"allPrimaries"**: Route the command to all primary nodes in the cluster.
  - **"allNodes"**: Route the command to all nodes (both primaries and replicas) in the cluster.

## Example

```typescript
// Route command to a random node
const routeRandom: Routes = "randomNode";

// Route command to all primary nodes
const routeAllPrimaries: Routes = "allPrimaries";

// Route command to all nodes
const routeAllNodes: Routes = "allNodes";

// Route command to a node by slot key
const routeByKey: Routes = {
  type: "primarySlotKey",
  key: "myKey",
};

// Route command to a specific node by address
const routeByAddress: Routes = {
  type: "routeByAddress",
  host: "192.168.1.10",
  port: 6379,
};

// Use the routing configuration when executing a command
const result = await client.ping({ route: routeByAddress });
```
