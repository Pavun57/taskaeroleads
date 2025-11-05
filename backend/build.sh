#!/bin/bash
set -e

# Set Rust/Cargo to use writable directories BEFORE any pip operations
export CARGO_HOME=/tmp/cargo
export RUSTUP_HOME=/tmp/rustup
export CARGO_NET_GIT_FETCH_WITH_CLI=true
export CARGO_NET_RETRY=3
mkdir -p /tmp/cargo /tmp/rustup

# Upgrade pip and build tools first
pip install --upgrade pip setuptools wheel --no-cache-dir

# Install dependencies - prefer binary wheels to avoid Rust compilation
# First try with --prefer-binary which will use wheels when available but allow source for packages without wheels
echo "Installing dependencies with binary wheel preference..."
pip install --prefer-binary --no-cache-dir -r requirements.txt

# If that fails, try installing packages individually to identify problematic ones
if [ $? -ne 0 ]; then
    echo "Standard installation failed, trying individual packages..."
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        
        # Extract package name (remove version constraints for now)
        package=$(echo "$line" | sed 's/[<>=!].*//' | xargs)
        if [ -n "$package" ]; then
            echo "Installing $package..."
            pip install --prefer-binary --no-cache-dir "$line" || echo "Warning: Failed to install $package"
        fi
    done < requirements.txt
fi

echo "Build completed successfully!"

