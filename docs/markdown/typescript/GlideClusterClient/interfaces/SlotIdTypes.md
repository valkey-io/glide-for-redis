[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [GlideClusterClient](../README.md) / SlotIdTypes

# Interface: SlotIdTypes

Routing configuration for commands based on a specific slot ID in a Valkey cluster.

## Remarks

This interface allows you to specify routing of a command to a node responsible for a particular slot ID in the cluster.
Valkey clusters use hash slots to distribute data across multiple shards. There are 16,384 slots in total, and each shard
manages a range of slots.

- **Slot ID**: A number between 0 and 16383 representing a hash slot.
- **Routing Type**:
  - `"primarySlotId"`: Routes the command to the primary node responsible for the specified slot ID.
  - `"replicaSlotId"`: Routes the command to a replica node responsible for the specified slot ID, overriding the `readFrom` configuration.

## Example

```typescript
// Route command to the primary node responsible for slot ID 12345
const routeBySlotId: SlotIdTypes = {
  type: "primarySlotId",
  id: 12345,
};

// Route command to a replica node responsible for slot ID 12345
const routeToReplicaBySlotId: SlotIdTypes = {
  type: "replicaSlotId",
  id: 12345,
};

// Use the routing configuration when executing a command
const result = await client.get("mykey", { route: routeBySlotId });
```

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="id"></a> `id` | `number` | Slot number. There are 16384 slots in a Valkey cluster, and each shard manages a slot range. Unless the slot is known, it's better to route using `SlotKeyTypes` |
| <a id="type"></a> `type` | `"primarySlotId"` \| `"replicaSlotId"` | `replicaSlotId` overrides the `readFrom` configuration. If it's used the request will be routed to a replica, even if the strategy is `alwaysFromPrimary`. |
