import PocketBase from 'pocketbase'

const BACKEND_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://pocketbase-railway-production-631f.up.railway.app'

const pb = new PocketBase(BACKEND_URL)
pb.autoCancellation(false)

export default pb
