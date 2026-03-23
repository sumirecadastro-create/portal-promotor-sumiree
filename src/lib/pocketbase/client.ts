import PocketBase from 'pocketbase'

const backendUrl =
  import.meta.env.VITE_POCKETBASE_URL || 'https://portal-promotor-sumire-f82ca.skip.cloud'
const pb = new PocketBase(backendUrl)
pb.autoCancellation(false)

export default pb
