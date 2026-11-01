// Turns a path to a file in /public (e.g. '/assets/icons/rod-fly.svg') into a URL that also works when the
// site is served from a sub-path, like GitHub Pages' https://<user>.github.io/<repo>/. Locally and in the
// Capacitor app the base is '/' or './', so the path is returned unchanged.
export function asset(path: string): string {
  const base = useRuntimeConfig().app.baseURL || '/'
  if (base === '/' || base.startsWith('.')) return path
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '')
}
