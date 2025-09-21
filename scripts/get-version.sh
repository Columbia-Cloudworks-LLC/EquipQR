#!/bin/bash

# Get the current app version from git tags
# This script can be used for local development or CI environments

set -e

TAG_PREFIX="v"

# Try to get a tag exactly at HEAD first
HEAD_TAG=$(git tag --points-at HEAD --list "${TAG_PREFIX}[0-9]*" 2>/dev/null | head -n1)

# If no tag at HEAD, fall back to the latest tag
if [ -z "$HEAD_TAG" ]; then
    HEAD_TAG=$(git describe --tags --abbrev=0 --match "${TAG_PREFIX}[0-9]*" 2>/dev/null || echo "${TAG_PREFIX}0.0.0")
fi

# Remove the 'v' prefix
VERSION="${HEAD_TAG#${TAG_PREFIX}}"

echo "$VERSION"
