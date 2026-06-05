# Getting started

Render the engine inside any Svelte 5 app in three steps.

## Install

```sh
npm install @dependably/svelte-docs
```

## Build a content bundle

Point the toolkit at your markdown (a git repo, or a local directory):

```sh
svelte-docs-build --local ./content --out dist/docs-content
```

## Render

```svelte
<script>
  import Docs from '@dependably/svelte-docs'
  import '@dependably/svelte-docs/styles.css'
</script>

<Docs basePath="/docs" siteName="My Project" />
```

See the [installation guide](./guides/installation) for host wiring details.
