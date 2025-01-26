[**@valkey/valkey-glide**](../README.md)

***

[@valkey/valkey-glide](../modules.md) / GlideClusterClient

# GlideClusterClient

## Namespaces

| Namespace | Description |
| ------ | ------ |
| [GlideClusterClientConfiguration](namespaces/GlideClusterClientConfiguration/README.md) | - |

## Classes

| Class | Description |
| ------ | ------ |
| [GlideClusterClient](classes/GlideClusterClient.md) | Client used for connection to cluster servers. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [PeriodicChecksManualInterval](interfaces/PeriodicChecksManualInterval.md) | Represents a manually configured interval for periodic checks. |
| [RouteByAddress](interfaces/RouteByAddress.md) | Routing configuration to send a command to a specific node by its address and port. |
| [RouteOption](interfaces/RouteOption.md) | An extension to command option types with [Routes](type-aliases/Routes.md). |
| [SlotIdTypes](interfaces/SlotIdTypes.md) | Routing configuration for commands based on a specific slot ID in a Valkey cluster. |
| [SlotKeyTypes](interfaces/SlotKeyTypes.md) | Routing configuration for commands based on a key in a Valkey cluster. |

## Type Aliases

| Type alias | Description |
| ------ | ------ |
| [AdvancedGlideClusterClientConfiguration](type-aliases/AdvancedGlideClusterClientConfiguration.md) | Represents advanced configuration settings for creating a [GlideClusterClient](classes/GlideClusterClient.md) used in [GlideClusterClientConfiguration](type-aliases/GlideClusterClientConfiguration.md). |
| [ClusterResponse](type-aliases/ClusterResponse.md) | If the command's routing is to one node we will get T as a response type, otherwise, we will get a dictionary of address: nodeResponse, address is of type string and nodeResponse is of type T. |
| [GlideClusterClientConfiguration](type-aliases/GlideClusterClientConfiguration.md) | Configuration options for creating a [GlideClusterClient](classes/GlideClusterClient.md). |
| [PeriodicChecks](type-aliases/PeriodicChecks.md) | Periodic checks configuration. |
| [Routes](type-aliases/Routes.md) | Defines the routing configuration for a command in a Valkey cluster. |
| [SingleNodeRoute](type-aliases/SingleNodeRoute.md) | Defines the routing configuration to a single node in the Valkey cluster. |
