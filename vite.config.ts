import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const basePath = env.VITE_BASE_PATH || '/';
  const isDemo = env.VITE_DEMO === 'true';

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, '.') },
        ...(isDemo ? [
          // Заменяем весь firebase.ts на заглушку — перехватываем по resolved-пути
          {
            find: /.*src\/firebase(\.ts)?$/,
            replacement: path.resolve(__dirname, 'src/firebase-demo.ts'),
          },
          // Заглушка для firebase/auth (используется напрямую в App.tsx)
          {
            find: /^firebase\/auth$/,
            replacement: path.resolve(__dirname, 'src/mocks/firebase-auth-mock.ts'),
          },
          // Заглушка для firebase/firestore (используется напрямую в App.tsx)
          {
            find: /^firebase\/firestore$/,
            replacement: path.resolve(__dirname, 'src/mocks/firebase-firestore-mock.ts'),
          },
        ] : []),
      ],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
