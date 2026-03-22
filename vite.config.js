import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || '/'

  return {
    plugins: [react()],
    base,
    build: {
      // Designer-first: prioritize a snappy first load by avoiding eager modulepreload bursts.
      // Heavy sidecars (chat/code/runtime extras) stay lazy and load on demand.
      modulePreload: false,
      // Keep warnings useful while proactively splitting heavier authoring/runtime modules.
      chunkSizeWarningLimit: 2200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor'
            }
            if (id.includes('node_modules/html-to-image')) {
              return 'export-vendor'
            }
            if (id.includes('node_modules/@huggingface')) {
              return 'ai-vendor'
            }
            if (id.includes('/src/components/chatAI.js')) {
              return 'chat-engine'
            }
            if (id.includes('/src/components/code/')) {
              return 'code-components'
            }
            if (id.includes('/src/components/ChatBubble.jsx')) {
              return 'chat-components'
            }
            if (id.includes('/src/components/ComponentRenderer.jsx') || id.includes('/src/constants.js')) {
              return 'design-system-core'
            }
            return undefined
          },
        },
      },
    },
  }
})
