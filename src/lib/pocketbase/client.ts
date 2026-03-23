import PocketBase from 'pocketbase'

// URL do backend no Railway
const BACKEND_URL = 'https://pocketbase-railway-production-631f.up.railway.app'

const pb = new PocketBase(BACKEND_URL)
pb.autoCancellation(false)

export default pb
