[**@valkey/valkey-glide**](../../README.md)

***

[@valkey/valkey-glide](../../modules.md) / [GlideClusterClient](../README.md) / ClusterResponse

# Type Alias: ClusterResponse\<T\>

> **ClusterResponse**\<`T`\>: `T` \| `Record`\<`string`, `T`\>

If the command's routing is to one node we will get T as a response type,
otherwise, we will get a dictionary of address: nodeResponse, address is of type string and nodeResponse is of type T.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
