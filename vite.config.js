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
                noar: resolve(__dirname, 'noar/index.html'),
            },
        },
    },
})
