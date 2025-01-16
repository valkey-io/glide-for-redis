# Developer Guide

This document describes how to set up your development environment to build and test the GLIDE for Redis C# wrapper.

### Development Overview

We're excited to share that the GLIDE C# client is currently in development! However, it's important to note that this client is a work in progress and is not yet complete or fully tested. Your contributions and feedback are highly encouraged as we work towards refining and improving this implementation. Thank you for your interest and understanding as we continue to develop this C# wrapper.

The C# client contains the following parts:

1. Rust part of the C# client located in `lib/src`; it communicates with [GLIDE core rust library](../glide-core/README.md).
2. C# part of the client located in `lib`; it translates Rust async API into .Net async API.
3. Integration tests for the C# client located in `tests` directory.
4. A dedicated benchmarking tool designed to evaluate and compare the performance of GLIDE for Redis and other .Net clients. It is located in `<repo root>/benchmarks/csharp`.

TODO: examples, UT, design docs

### Build from source

Software Dependencies:

- .Net SDK 6 or later
- git
- rustup
- redis

Please also install the following packages to build [GLIDE core rust library](../glide-core/README.md):

- GCC
- protoc (protobuf compiler)
- pkg-config
- openssl
- openssl-dev

#### Prerequisites

**.Net**

It is recommended to visit https://dotnet.microsoft.com/en-us/download/dotnet to download .Net installer.
You can also use a package manager to install the .Net SDK:

```bash
brew install dotnet@6         # MacOS
sudo apt-get install dotnet6  # Linux
```

**Protoc installation**

Download a binary matching your system from the [official release page](https://github.com/protocolbuffers/protobuf/releases/tag/v25.1) and make it accessible in your $PATH by moving it or creating a symlink.
For example, on Linux you can copy it to `/usr/bin`:

```bash
sudo cp protoc /usr/bin/
```

**Redis installation**

To install `redis-server` and `redis-cli` on your host, follow the [Redis Installation Guide](https://redis.io/docs/install/install-redis/).

**Dependencies installation for Ubuntu**

```bash
sudo apt-get update -y
sudo apt-get install -y openssl openssl-dev gcc
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

**Dependencies installation for MacOS**

```bash
brew update
brew install git gcc pkgconfig openssl
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

#### Building and installation steps

Before starting this step, make sure you've installed all software requirments.

1. Clone the repository
    ```bash
    git clone https://github.com/valkey-io/valkey-glide.git
    cd valkey-glide
    ```

2. Build the C# wrapper

```bash
dotnet build
```

3. Run tests

Run test suite from `csharp` directory:

```bash
dotnet test
```

4. Run benchmark

    1. Ensure that you have installed `redis-server` and `redis-cli` on your host. You can find the Redis installation guide at the following link: [Redis Installation Guide](https://redis.io/docs/install/install-redis/install-redis-on-linux/).

    2. Execute the following command from the root project folder:

    ```bash
    cd <repo root>/benchmarks/csharp
    dotnet run --framework net8.0 --dataSize 1024 --resultsFile test.json --concurrentTasks 4 --clients all --host localhost --clientCount 4
    ```

    3. Use a [helper script](../benchmarks/README.md) which runs end-to-end benchmarking workflow:

    ```bash
    cd <repo root>/benchmarks
    ./install_and_test.sh -csharp
    ```

    Run benchmarking script with `-h` flag to get list and help about all command line parameters.

5. Lint the code

Before making a contribution ensure that all new user API and non-obvious places in code is well documented and run a code linter.

C# linter:

```bash
dotnet format --verify-no-changes --verbosity diagnostic
```

Rust linter:

```bash
cargo clippy --all-features --all-targets -- -D warnings
cargo fmt --all -- --check
```

### Submodules

After pulling new changes, ensure that you update the submodules by running the following command:

```bash
git submodule update
```
