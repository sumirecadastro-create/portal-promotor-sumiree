import PocketBase from 'pocketbase'

const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || 'https://portal-promotor-sumire-f82ca.skip.cloud',
)
pb.autoCancellation(false)

export default pb
