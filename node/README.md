# Valkey GLIDE

Valkey General Language Independent Driver for the Enterprise (GLIDE), is an open-source Valkey client library. Valkey GLIDE is one of the official client libraries for Valkey, and it supports all Valkey commands. Valkey GLIDE supports Valkey 7.2 and above, and Redis open-source 6.2, 7.0 and 7.2. Application programmers use Valkey GLIDE to safely and reliably connect their applications to Valkey- and Redis OSS- compatible services. Valkey GLIDE is designed for reliability, optimized performance, and high-availability, for Valkey and Redis OSS based applications. It is sponsored and supported by AWS, and is pre-configured with best practices learned from over a decade of operating Redis OSS-compatible services used by hundreds of thousands of customers. To help ensure consistency in application development and operations, Valkey GLIDE is implemented using a core driver framework, written in Rust, with language specific extensions. This design ensures consistency in features across languages and reduces overall complexity.

## Supported Engine Versions

Refer to the [Supported Engine Versions table](https://github.com/valkey-io/valkey-glide/blob/main/README.md#supported-engine-versions) for details.

# Getting Started - Node Wrapper

## System Requirements

The release of Valkey GLIDE was tested on the following platforms:

Linux:

- Ubuntu 22.04.1 (x86_64 and aarch64)
- Amazon Linux 2023 (AL2023) (x86_64)

macOS:

- macOS 14.7 (Apple silicon/aarch_64)

Alpine:

- node:alpine (default on aarch64 and x86_64)

## NodeJS supported version

Node.js 16.20 or higher.

## Documentation

Visit our [wiki](https://github.com/valkey-io/valkey-glide/wiki/NodeJS-wrapper) for examples and further details on TLS, Read strategy, Timeouts and various other configurations.

### Building & Testing

Development instructions for local building & testing the package are in the [DEVELOPER.md](https://github.com/valkey-io/valkey-glide/blob/main/node/DEVELOPER.md#build-from-source) file.

## Basic Examples

#### Standalone Mode:

```typescript
import { GlideClient, GlideClusterClient, Logger } from "@valkey/valkey-glide";
// When Valkey is in standalone mode, add address of the primary node, and any replicas you'd like to be able to read from.
const addresses = [
    {
        host: "localhost",
        port: 6379,
    },
];
// Check `GlideClientConfiguration/GlideClusterClientConfiguration` for additional options.
const client = await GlideClient.createClient({
    addresses: addresses,
    // if the server uses TLS, you'll need to enable it. Otherwise, the connection attempt will time out silently.
    // useTLS: true,
    clientName: "test_standalone_client",
});
// The empty array signifies that there are no additional arguments.
const pong = await client.customCommand(["PING"]);
console.log(pong);
const set_response = await client.set("foo", "bar");
console.log(`Set response is = ${set_response}`);
const get_response = await client.get("foo");
console.log(`Get response is = ${get_response}`);
```

#### Cluster Mode:

```typescript
import { GlideClient, GlideClusterClient, Logger } from "@valkey/valkey-glide";
// When Valkey is in cluster mode, add address of any nodes, and the client will find all nodes in the cluster.
const addresses = [
    {
        host: "localhost",
        port: 6379,
    },
];
// Check `GlideClientConfiguration/GlideClusterClientConfiguration` for additional options.
const client = await GlideClusterClient.createClient({
    addresses: addresses,
    // if the cluster nodes use TLS, you'll need to enable it. Otherwise the connection attempt will time out silently.
    // useTLS: true,
    clientName: "test_cluster_client",
});
// The empty array signifies that there are no additional arguments.
const pong = await client.customCommand(["PING"], { route: "randomNode" });
console.log(pong);
const set_response = await client.set("foo", "bar");
console.log(`Set response is = ${set_response}`);
const get_response = await client.get("foo");
console.log(`Get response is = ${get_response}`);
client.close();
```

### Supported platforms

Currently, the package is tested on:

| Operation systems | C lib                | Architecture      |
| ----------------- | -------------------- | ----------------- |
| `Linux`           | `glibc`, `musl libc` | `x86_64`, `arm64` |
| `macOS`           | `Darwin`             | `arm64`           |
