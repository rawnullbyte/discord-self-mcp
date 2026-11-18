# Publishing

The npm name `discord-self-mcp` is taken by an unrelated package. Publish under a scope you own, then point clients at the scoped name.

## Rename the package

In `package.json`:

```json
{
  "name": "@yourscope/discord-self-mcp",
  "bin": { "discord-self-mcp": "dist/index.js" },
  "publishConfig": { "access": "public" }
}
```

The bin name stays `discord-self-mcp`, so the command people type stays short.

## Publish

```bash
npm login
npm run build
npm test
npm publish --access public
```

`prepublishOnly` runs the build and tests again. The tarball contains `dist`, `README.md` and `LICENSE` only (see `files` in `package.json`).

## Client configuration after publishing

```json
{
  "mcp": {
    "discord": {
      "type": "local",
      "command": ["npx", "-y", "@yourscope/discord-self-mcp"],
      "enabled": true,
      "environment": { "DISCORD_TOKEN": "your-token" }
    }
  }
}
```

## GitHub

```bash
git init
git add .
git commit -m "feat: discord selfbot MCP server"
gh repo create discord-self-mcp --public --source=. --remote=origin --push
```

The `repository`, `homepage` and `bugs` fields in `package.json` should match your account before publishing. Update them when you fork or rename.

## Versioning

Use semver. Tool names and arguments are the public API: renaming a tool is a breaking change, adding one is a minor bump, fixing behavior is a patch.
