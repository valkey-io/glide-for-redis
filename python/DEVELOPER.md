# Developer Guide

This document describes how to set up your development environment to build and test the Valkey GLIDE Python wrapper.

The Valkey GLIDE Python wrapper consists of both Python and Rust code. Rust bindings for Python are implemented using [PyO3](https://github.com/PyO3/pyo3), and the Python package is built using [maturin](https://github.com/PyO3/maturin). The Python and Rust components communicate using the [protobuf](https://github.com/protocolbuffers/protobuf) protocol.

# Prerequisites
---

Before building the package from source, make sure that you have installed the listed dependencies below:


-   python3 virtualenv
-   git
-   GCC
-   pkg-config
-   protoc (protobuf compiler) >= v3.20.0
-   openssl
-   openssl-dev
-   rustup

For your convenience, we wrapped the steps in a "copy-paste" code blocks for common operating systems:

<details>
<summary>Ubuntu / Debian</summary>

```bash
sudo apt update -y
sudo apt install -y python3 python3-venv git gcc pkg-config openssl libssl-dev unzip
# Install rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
# Check that the Rust compiler is installed
rustc --version
# Install protobuf compiler
PB_REL="https://github.com/protocolbuffers/protobuf/releases"
# For other arch type from x86 example below, the signature of the curl url should be protoc-<version>-<os>-<arch>.zip,
# e.g. protoc-3.20.3-linux-aarch_64.zip for ARM64.
curl -LO $PB_REL/download/v3.20.3/protoc-3.20.3-linux-x86_64.zip
unzip protoc-3.20.3-linux-x86_64.zip -d $HOME/.local
export PATH="$PATH:$HOME/.local/bin"
# Check that the protobuf compiler is installed
protoc --version
```

</details>

<details>
<summary>CentOS</summary>

```bash
sudo yum update -y
sudo yum install -y python3 git gcc pkgconfig openssl openssl-devel unzip
pip3 install virtualenv
# Install rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
# Check that the Rust compiler is installed
rustc --version
# Install protobuf compiler
PB_REL="https://github.com/protocolbuffers/protobuf/releases"
curl -LO $PB_REL/download/v3.20.3/protoc-3.20.3-linux-x86_64.zip
unzip protoc-3.20.3-linux-x86_64.zip -d $HOME/.local
export PATH="$PATH:$HOME/.local/bin"
# Check that the protobuf compiler is installed
protoc --version
```

</details>

<details>
<summary>MacOS</summary>

```bash
brew update
brew install python3 git gcc pkgconfig protobuf@3 openssl virtualenv
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
# Check that the Rust compiler is installed
rustc --version
# Verify the Protobuf compiler installation
protoc --version

# If protoc is not found or does not work correctly, update the PATH
echo 'export PATH="/opt/homebrew/opt/protobuf@3/bin:$PATH"' >> /Users/$USER/.bash_profile
source /Users/$USER/.bash_profile
protoc --version
```

</details>

# Building
---

Before starting this step, make sure you've installed all software requirements.

## Prepare your environment

```bash
mkdir -p $HOME/src
cd $_
git clone https://github.com/valkey-io/valkey-glide.git
cd valkey-glide
GLIDE_ROOT=$(pwd)
protoc -Iprotobuf=${GLIDE_ROOT}/glide-core/src/protobuf/    \
        --python_out=${GLIDE_ROOT}/python/python/glide      \
        ${GLIDE_ROOT}/glide-core/src/protobuf/*.proto
cd python
python3 -m venv .env
source .env/bin/activate
pip install -r dev_requirements.txt
```

## Build the package (in release mode):

```bash
maturin develop --release --strip
```

> **Note:** to build the wrapper binary with debug symbols remove the `--strip` flag.

> **Note 2:** for a faster build time, execute `maturin develop` without the release flag. This will perform an unoptimized build, which is suitable for developing tests. Keep in mind that performance is significantly affected in an unoptimized build, so it's required to include the `--release` flag when measuring performance.

# Running tests
---

Ensure you have installed `valkey-server` and `valkey-cli` on your host (or `redis-server` and `redis-cli`). 
You can find the Valkey installation guide at the following link: [Valkey Installation Guide](https://valkey.io/topics/installation/).

From a terminal, change directory to the GLIDE source folder and type:

```bash
cd $HOME/src/valkey-glide
cd python
source .env/bin/activate
pytest --asyncio-mode=auto
```

To run modules tests:

```bash
cd $HOME/src/valkey-glide
cd python
source .env/bin/activate
pytest --asyncio-mode=auto -k "test_server_modules.py"
```

**TIP:** to run a specific test, append `-k <test_name>` to the `pytest` execution line

To run tests against an already running servers, change the `pytest` line above to this:

```bash
pytest --asyncio-mode=auto --cluster-endpoints=localhost:7000 --standalone-endpoints=localhost:6379
```

# Generate protobuf files
---

During the initial build, Python protobuf files were created in `python/python/glide/protobuf`. If modifications are made
to the protobuf definition files (`.proto` files located in `glide-core/src/protofuf`), it becomes necessary to
regenerate the Python protobuf files. To do so, run:

```bash
cd $HOME/src/valkey-glide
GLIDE_ROOT_FOLDER_PATH=.
protoc -Iprotobuf=${GLIDE_ROOT_FOLDER_PATH}/glide-core/src/protobuf/    \
    --python_out=${GLIDE_ROOT_FOLDER_PATH}/python/python/glide          \
    ${GLIDE_ROOT_FOLDER_PATH}/glide-core/src/protobuf/*.proto
```

## Protobuf interface files

To generate the protobuf files with Python Interface files (pyi) for type-checking purposes, ensure you have installed `mypy-protobuf` with pip, and then execute the following command:

```bash
cd $HOME/src/valkey-glide
GLIDE_ROOT_FOLDER_PATH=.
MYPY_PROTOC_PATH=`which protoc-gen-mypy`
protoc --plugin=protoc-gen-mypy=${MYPY_PROTOC_PATH}                     \
        -Iprotobuf=${GLIDE_ROOT_FOLDER_PATH}/glide-core/src/protobuf/   \
        --python_out=${GLIDE_ROOT_FOLDER_PATH}/python/python/glide      \
        --mypy_out=${GLIDE_ROOT_FOLDER_PATH}/python/python/glide        \
        ${GLIDE_ROOT_FOLDER_PATH}/glide-core/src/protobuf/*.proto
```

# Linters
---

Development on the Python wrapper may involve changes in either the Python or Rust code. Each language has distinct linter tests that must be passed before committing changes.

## Language-specific Linters

**Python:**

-   flake8
-   isort
-   black
-   mypy

**Rust:**

-   clippy
-   fmt

## Running the linters

Run from the main `/python` folder

1. Python
    > Note: make sure to [generate protobuf with interface files]("#protobuf-interface-files") before running `mypy` linter
    ```bash
    cd $HOME/src/valkey-glide/python
    source .env/bin/activate
    pip install -r dev_requirements.txt
    isort . --profile black --skip-glob python/glide/protobuf --skip-glob .env
    black . --exclude python/glide/protobuf --exclude .env
    flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics      \
            --exclude=python/glide/protobuf,.env/* --extend-ignore=E230
    flake8 . --count --exit-zero --max-complexity=12 --max-line-length=127  \
            --statistics --exclude=python/glide/protobuf,.env/*             \
            --extend-ignore=E230
    # run type check
    mypy .
    ```

2. Rust

    ```bash
    rustup component add clippy rustfmt
    cargo clippy --all-features --all-targets -- -D warnings
    cargo fmt --manifest-path ./Cargo.toml --all
    ```

# Recommended extensions for VS Code
---

-   [Python](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
-   [isort](https://marketplace.visualstudio.com/items?itemName=ms-python.isort)
-   [Black Formatter](https://marketplace.visualstudio.com/items?itemName=ms-python.black-formatter)
-   [Flake8](https://marketplace.visualstudio.com/items?itemName=ms-python.flake8)
-   [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
