[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [GlideClusterClient](../README.md) / SlotKeyTypes

# Interface: SlotKeyTypes

Routing configuration for commands based on a key in a Valkey cluster.

## Remarks

This interface allows you to specify routing of a command to a node responsible for the slot that a specific key hashes to.
Valkey clusters use consistent hashing to map keys to hash slots, which are then managed by different shards in the cluster.

- **Key**: The key whose hash slot will determine the routing of the command.
- **Routing Type**:
  - `"primarySlotKey"`: Routes the command to the primary node responsible for the key's slot.
  - `"replicaSlotKey"`: Routes the command to a replica node responsible for the key's slot, overriding the `readFrom` configuration.

## Example

```typescript
// Route command to the primary node responsible for the key's slot
const routeByKey: SlotKeyTypes = {
  type: "primarySlotKey",
  key: "user:1001",
};

// Route command to a replica node responsible for the key's slot
const routeToReplicaByKey: SlotKeyTypes = {
  type: "replicaSlotKey",
  key: "user:1001",
};

// Use the routing configuration when executing a command
const result = await client.get("user:1001", { route: routeByKey });
```

## Properties

| Property | Type | Description |
| ------ | ------ | ------ |
| <a id="key"></a> `key` | `string` | The request will be sent to nodes managing this key. |
| <a id="type"></a> `type` | `"primarySlotKey"` \| `"replicaSlotKey"` | `replicaSlotKey` overrides the `readFrom` configuration. If it's used the request will be routed to a replica, even if the strategy is `alwaysFromPrimary`. |
