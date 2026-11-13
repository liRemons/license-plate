import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 不用 __dirname：config 以 ESM 加载时它不存在，且 vite 8 已经开始警告
const root = fileURLToPath(new URL('.', import.meta.url))

// 两种模式：
//   vite            → demo 开发页（移动端视口，npm run dev）
//   vite --mode lib → 打包 npm 包产物 dist/index.js|cjs|css|d.ts（npm run build）
export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib'

  return {
    plugins: [
      react(),
      // 只在 lib 模式生成类型声明，避免拖慢日常 dev
      ...(isLib
        ? [
            dts({
              include: ['src'],
              // v5 里这一项叫 outDirs，不写则跟随 build.outDir
              tsconfigPath: './tsconfig.json',
            }),
          ]
        : []),
    ],
    build: isLib
      ? {
          outDir: 'dist',
          emptyOutDir: true,
          lib: {
            // 样式产物固定叫 index.css，跟 package.json 的 style / exports 对齐（默认会拿包名当文件名）
            cssFileName: 'index',
            // 双入口：index 是组件 + 核心，core 只出核心（纯 TS，不拖 React 与样式）
            entry: {
              index: resolve(root, 'src/index.ts'),
              core: resolve(root, 'src/core/index.ts'),
            },
            name: 'RemonsLicensePlate',
            formats: ['es', 'cjs'],
            fileName: (format, entryName) => (format === 'es' ? `${entryName}.js` : `${entryName}.cjs`),
          },
          rollupOptions: {
            // react 走 peer，由消费方提供，避免打包出第二个 React 实例
            external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
          },
        }
      : {
          outDir: 'dist-demo',
          emptyOutDir: true,
        },
    css: {
      preprocessorOptions: {
        less: { javascriptEnabled: true },
      },
    },
    server: {
      host: true,
      port: 5399,
    },
  }
})
