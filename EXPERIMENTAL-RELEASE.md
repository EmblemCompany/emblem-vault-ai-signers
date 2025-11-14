# Experimental Release Guide

This guide explains how to publish experimental versions of the library to npm.

## Publishing an Experimental Release

To publish an experimental version from the current branch:

```bash
npm run release:experimental
```

This will:
1. Bump version to next prerelease (e.g., `0.1.7` → `0.1.8-experimental.0`)
2. Build the TypeScript code
3. Run all unit and integration tests
4. Publish to npm with the `experimental` tag

## Installing the Experimental Version

Users can install the experimental version with:

```bash
npm install emblem-vault-ai-signers@experimental
```

Or specify the exact version:

```bash
npm install emblem-vault-ai-signers@0.1.8-experimental.0
```

## Version Numbering

Experimental releases follow this pattern:
- First experimental: `0.1.8-experimental.0`
- Second experimental: `0.1.8-experimental.1`
- Third experimental: `0.1.8-experimental.2`

Each time you run `npm run release:experimental`, it will increment the prerelease number.

## Checking Available Versions

To see all available versions including experimental:

```bash
npm view emblem-vault-ai-signers versions
```

To see the current experimental version:

```bash
npm view emblem-vault-ai-signers@experimental version
```

## Important Notes

1. **Experimental releases don't affect the `latest` tag** - Users installing without a tag will still get the stable version
2. **Git commits are created automatically** - The version bump creates a commit with the new version
3. **Don't forget to push** - After publishing, run `git push && git push --tags`
4. **Tests must pass** - The release will fail if any tests fail

## Example Workflow

```bash
# Make your changes on experimental branch
git checkout JWTSupport

# Run tests to verify
npm run test:all

# Stage and commit your changes
git add -A
git commit -m "feat: add JWT authentication support"

# Publish experimental release
npm run release:experimental
# This creates version 0.1.8-experimental.0 and publishes it

# Push to GitHub
git push && git push --tags

# Users can now install with:
# npm install emblem-vault-ai-signers@experimental
```

## Promoting Experimental to Stable

Once the experimental version is tested and ready:

1. Merge the experimental branch to main
2. On main, run `npm run release:patch` (or `release:minor`, `release:major`)
3. This will create a stable release (e.g., `0.1.8`) and tag it as `latest`

## Cleaning Up

After promoting to stable, you can deprecate old experimental versions:

```bash
npm deprecate emblem-vault-ai-signers@0.1.8-experimental.0 "Promoted to stable 0.1.8"
```
