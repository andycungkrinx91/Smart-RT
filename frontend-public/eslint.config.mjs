import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// eslint-config-next@16 exports a Flat Config array (CommonJS).
// Re-export it so `eslint` v9 can load it.
const nextConfig = require('eslint-config-next')

export default nextConfig
