#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Building Reaction-Diffusion WebAssembly ==="

if ! command -v emcc &> /dev/null; then
    echo "Error: emcc (Emscripten) not found in PATH"
    echo "Please install Emscripten first: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

echo "Using Emscripten: $(emcc --version | head -1)"

emcc reaction-diffusion.c \
    -o reaction-diffusion.js \
    -O3 \
    -s EXPORTED_FUNCTIONS='["_init", "_step", "_getA", "_getB", "_getWidth", "_getHeight", "_malloc", "_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "getValue", "setValue", "HEAPF32"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=0 \
    -s SINGLE_FILE=0

if [ $? -eq 0 ]; then
    echo ""
    echo "Build successful!"
    echo "Output files:"
    ls -lh reaction-diffusion.js reaction-diffusion.wasm
else
    echo "Build failed!"
    exit 1
fi
