# Configuration

The `<Docs>` component is configured entirely through props.

## Common props

| prop | purpose |
| --- | --- |
| `basePath` | URL prefix the engine owns |
| `siteName` | top-left brand label |
| `contentBaseUrl` | where the JSON bundle is served |

## Search

Search loads lazily on first open and caches per version and locale, so it
never weighs down the initial page.

## Versions

Each git tag in the content repo becomes a selectable version; `main` maps to
`latest`.
