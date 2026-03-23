import PocketBase from 'pocketbase'

// ALTERADO: URL correta usando o mesmo domínio do frontend
const pb = new PocketBase('https://portal-promotor-sumire-f82ca.goskip.app')
pb.autoCancellation(false)

export default pb
