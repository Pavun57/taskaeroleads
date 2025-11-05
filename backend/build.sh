#!/bin/bash
set -e

# Set Rust/Cargo to use writable directories BEFORE any pip operations
export CARGO_HOME=/tmp/cargo
export RUSTUP_HOME=/tmp/rustup
export CARGO_NET_GIT_FETCH_WITH_CLI=true
export CARGO_NET_RETRY=3
export PIP_ONLY_BINARY=pydantic-core
mkdir -p /tmp/cargo/registry/cache /tmp/cargo/registry/index /tmp/rustup

# Upgrade pip and build tools first
pip install --upgrade pip setuptools wheel --no-cache-dir

# Install pydantic-core first with binary-only to avoid Rust compilation
echo "Installing pydantic-core (binary wheels only)..."
pip install --only-binary pydantic-core --no-cache-dir pydantic-core || {
    echo "Warning: Could not install pydantic-core from binary wheels"
    echo "This may cause build to fail if no wheels are available for this Python version"
}

# Install dependencies - prefer binary wheels to avoid Rust compilation
echo "Installing dependencies with binary wheel preference..."
pip install --prefer-binary --no-cache-dir -r requirements.txt

echo "Build completed successfully!"

