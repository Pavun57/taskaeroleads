#!/bin/bash
set -e

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Detected Python version: $PYTHON_VERSION"

# Set Rust/Cargo to use writable directories BEFORE any pip operations
export CARGO_HOME=/tmp/cargo
export RUSTUP_HOME=/tmp/rustup
export CARGO_NET_GIT_FETCH_WITH_CLI=true
export CARGO_NET_RETRY=3
# Prevent cargo from using read-only system directories
export CARGO_TARGET_DIR=/tmp/cargo-target
mkdir -p /tmp/cargo/registry/cache /tmp/cargo/registry/index /tmp/rustup /tmp/cargo-target

# Upgrade pip and build tools first
echo "Upgrading pip, setuptools, and wheel..."
pip install --upgrade pip setuptools wheel --no-cache-dir

# Install pydantic packages separately with binary-only to avoid Rust compilation
echo "Installing pydantic-core (binary wheels only - required)..."
if ! pip install --only-binary :all: --no-cache-dir pydantic-core==2.14.6; then
    echo "ERROR: Could not install pydantic-core from binary wheels"
    echo "This Python version ($PYTHON_VERSION) may not have pre-built wheels for pydantic-core"
    echo "Trying with --only-binary pydantic-core..."
    if ! pip install --only-binary pydantic-core --no-cache-dir pydantic-core==2.14.6; then
        echo "FATAL: Cannot install pydantic-core without building from source"
        echo "Please use Python 3.11 which has pre-built wheels available"
        exit 1
    fi
fi

echo "Installing pydantic (binary wheels only)..."
pip install --only-binary :all: --no-cache-dir pydantic==2.5.3 || pip install --only-binary pydantic --no-cache-dir pydantic==2.5.3

# Install remaining dependencies - prefer binary wheels to avoid Rust compilation
echo "Installing remaining dependencies with binary wheel preference..."
pip install --prefer-binary --no-cache-dir -r requirements.txt

echo "Build completed successfully!"

