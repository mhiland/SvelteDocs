#!/usr/bin/env node
// CLI wrapper around buildContentBundle.
//
//   svelte-docs-build --repo <url> --out <dir> [--base-path /docs]
//
// --repo may be a tokenized HTTPS URL (CI) or any git-clonable URL/path (local).

import { buildContentBundle } from './index.js'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--repo') args.repoUrl = argv[++i]
    else if (a === '--out') args.outDir = argv[++i]
    else if (a === '--base-path') args.basePath = argv[++i]
    else if (a === '--work-dir') args.workDir = argv[++i]
    else if (a === '-h' || a === '--help') args.help = true
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

if (args.help || !args.repoUrl || !args.outDir) {
  process.stdout.write(
    'Usage: svelte-docs-build --repo <url> --out <dir> [--base-path /docs]\n',
  )
  process.exit(args.help ? 0 : 1)
}

buildContentBundle(args).catch((err) => {
  process.stderr.write(`svelte-docs-build: ERROR ${err.stack || err.message}\n`)
  process.exit(1)
})
