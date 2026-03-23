import PocketBase from 'pocketbase'

// Ensure we use the correct external production URL to avoid CORS and "Failed to fetch" errors.
// The .internal. URL is only for cluster internal routing and will fail in the browser.
let backendUrl =
  import.meta.env.VITE_POCKETBASE_URL || 'https://portal-promotor-sumire-f82ca.skip.cloud'

if (backendUrl.includes('.internal.')) {
  backendUrl = 'https://portal-promotor-sumire-f82ca.skip.cloud'
}

const pb = new PocketBase(backendUrl)
pb.autoCancellation(false)

export default pb
