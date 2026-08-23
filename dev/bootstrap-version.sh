#!/bin/bash

# Bootstrap script to create initial v1.0.0 tag
# Run this script to set up the initial version tag

set -e

echo "🚀 Bootstrapping version system with v1.0.0..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if v1.0.0 tag already exists
if git rev-parse v1.0.0 > /dev/null 2>&1; then
    echo "⚠️  Tag v1.0.0 already exists"
    echo "Current tags:"
    git tag -l "v*" | sort -V
    exit 0
fi

# Check if any version tags exist
if [ -z "$(git tag -l 'v[0-9]*')" ]; then
    echo "📝 No version tags found. Creating initial v1.0.0 tag..."
else
    echo "📝 Found existing version tags:"
    git tag -l "v*" | sort -V
    echo ""
    echo "⚠️  Version tags already exist. Skipping bootstrap."
    exit 0
fi

# Create the v1.0.0 tag
echo "🏷️  Creating tag v1.0.0..."
git tag -a v1.0.0 -m "Initial release v1.0.0"

# Push the tag
echo "📤 Pushing tag v1.0.0 to origin..."
git push origin v1.0.0

echo "✅ Successfully created and pushed v1.0.0 tag!"
echo ""
echo "🎯 Next steps:"
echo "1. The versioning workflow will now automatically increment from v1.0.0"
echo "2. Merge preview → main will create v2.0.0 (major bump)"
echo "3. Merge feature → preview will create v1.1.0 (minor bump)"
echo "4. Merge hotfix → main will create v1.0.1 (patch bump)"
echo ""
echo "📊 Current version tags:"
git tag -l "v*" | sort -V
