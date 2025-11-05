#!/bin/bash
set -e

# Upgrade pip and build tools
pip install --upgrade pip setuptools wheel

# Set Rust/Cargo to use writable directories
export CARGO_HOME=/tmp/cargo
export RUSTUP_HOME=/tmp/rustup
export PATH="$CARGO_HOME/bin:$PATH"

# Install dependencies preferring binary wheels
pip install --prefer-binary -r requirements.txt

echo "Build completed successfully!"

