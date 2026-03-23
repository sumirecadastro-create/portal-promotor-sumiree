import PocketBase from 'pocketbase'

// URL correta do backend (usando o mesmo domínio do frontend)
const pb = new PocketBase('https://portal-promotor-sumire-f82ca.goskip.app')
pb.autoCancellation(false)

export default pb
