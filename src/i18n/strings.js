// strings.js — the engine's OWN chrome strings (NOT svelte-i18n). Kept tiny and
// dependency-free so the engine stays host-agnostic. The host's content locale
// drives which dictionary is used; unknown locales fall back to English.

export const strings = {
  en: {
    search: 'Search',
    searchPlaceholder: 'Search docs…',
    searchHint: 'Type to search',
    onThisPage: 'On this page',
    noResults: 'No results',
    version: 'Version',
    language: 'Language',
    previous: 'Previous',
    next: 'Next',
    menu: 'Menu',
    close: 'Close',
    toggleTheme: 'Toggle theme',
    fallbackNotice: 'This page is not available in your language yet — showing English.',
    notFound: 'Page not found',
    notFoundBody: 'The page you requested does not exist in this version.',
    loadError: 'Couldn’t load the docs',
    loadErrorBody:
      'Something went wrong loading this content. Check your connection and try again.',
  },
  fr: {
    search: 'Rechercher',
    searchPlaceholder: 'Rechercher dans la doc…',
    searchHint: 'Tapez pour rechercher',
    onThisPage: 'Sur cette page',
    noResults: 'Aucun résultat',
    version: 'Version',
    language: 'Langue',
    previous: 'Précédent',
    next: 'Suivant',
    menu: 'Menu',
    close: 'Fermer',
    toggleTheme: 'Changer de thème',
    fallbackNotice:
      "Cette page n'est pas encore disponible dans votre langue — affichage en anglais.",
    notFound: 'Page introuvable',
    notFoundBody: "La page demandée n'existe pas dans cette version.",
    loadError: 'Impossible de charger la documentation',
    loadErrorBody:
      'Une erreur est survenue lors du chargement. Vérifiez votre connexion et réessayez.',
  },
}

export function makeT(locale) {
  const dict = strings[locale] || strings.en
  return (key) => dict[key] ?? strings.en[key] ?? key
}
