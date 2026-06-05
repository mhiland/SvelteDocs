// search.js — emit the per-(version, locale) search document array. The engine
// builds the FlexSearch index from this client-side, so the build stays
// independent of FlexSearch's internal export format.

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildSearchDocs(pages) {
  return pages.map((p) => ({
    id: p.slug,
    title: p.title || p.slug,
    headings: (p.toc || []).map((t) => t.text).join(' '),
    text: stripHtml(p.html).slice(0, 8000),
    url: p.url,
  }))
}
