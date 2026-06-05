# Installation

Wire the engine into your host app's routing and theme.

## Routing

The host renders `<Docs>` when the path is under `basePath`, and lets every
other path fall through to the rest of the app:

```js
const isDocs = location.pathname.startsWith('/docs')
```

## Theme

Docs inherit the host's colours from CSS variables — no theme prop needed.

## Next

Continue to [configuration](./configuration).
