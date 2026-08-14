import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isHubBuild = mode === 'production-hub'

  return {
    base: isHubBuild ? '/arabic-phonics-quiz/' : '/arabic-phonics-quiz-preview/',
    define: {
      __QUIZ_BUILD_MODE__: JSON.stringify(isHubBuild ? 'production-hub' : 'preview'),
    },
    plugins: [react()],
    build: {
      sourcemap: true,
      target: 'es2022',
    },
  }
})
