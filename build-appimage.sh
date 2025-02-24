#!/bin/bash

# Remove any existing AppImage files
rm -f dist/*.AppImage

# Build new AppImage
npx electron-builder --linux AppImage