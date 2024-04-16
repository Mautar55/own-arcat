// vite.config.js
import {
    resolve
} from 'path'
import {
    defineConfig
} from 'vite'

// vite.config.js
export default defineConfig({
    // config options
    build: {
        target: "esnext",
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                ar: resolve(__dirname, 'ar/index.html'),
                sofa: resolve(__dirname, 'sofa/index.html'),
            },
        },
    },
})
