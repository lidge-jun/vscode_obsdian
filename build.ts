/**
 * esbuild 构建脚本
 * - 打包 extension 主入口 (Node 端)
 * - 打包外部依赖到 out/node_modules
 *
 * @author RJ.Wang
 * @updated 2026-04-23
 */
const esbuild = require("esbuild")
const { resolve } = require("path")
const { existsSync } = require("fs")
const { copy } = require("esbuild-plugin-copy")
const isProd = process.argv.indexOf('--mode=production') >= 0;

const dependencies = ['vscode-html-to-docx', 'highlight.js', 'pdf-lib', 'cheerio', 'katex', 'mustache', 'puppeteer-core']

const sharedPlugins = [
    copy({
        resolveFrom: 'cwd',
        assets: {
            from: ['./vendor/rhwp-studio-dist/**/*'],
            to: ['./resource/rhwp-studio/'],
            keepStructure: true
        },
    }),
    copy({
        resolveFrom: 'out',
        assets: {
            from: ['./template/**/*'],
            to: ['./'],
            keepStructure: true
        },
    }),
    copy({
        resolveFrom: 'out',
        assets: {
            from: ['./node_modules/node-unrar-js/dist/js/unrar.wasm'],
            to: ['./'],
            keepStructure: true
        },
    }),
    {
        name: 'build-notice',
        setup(build) {
            build.onStart(() => { console.log('build start') })
            build.onEnd(() => { console.log('build success') })
        }
    },
]

const mainOptions = {
    entryPoints: ['./src/extension.ts'],
    bundle: true,
    outfile: "out/extension.js",
    external: ['vscode', ...dependencies],
    format: 'cjs',
    platform: 'node',
    metafile: true,
    minify: isProd,
    sourcemap: !isProd,
    logOverride: {
        'duplicate-object-key': "silent",
        'suspicious-boolean-not': "silent",
    },
    plugins: sharedPlugins,
}

async function main() {
    if (isProd) {
        await esbuild.build(mainOptions)
    } else {
        // 使用 context API（esbuild 0.17+ 兼容），回退到旧版 watch
        if (esbuild.context) {
            const ctx = await esbuild.context(mainOptions)
            await ctx.watch()
        } else {
            await esbuild.build({ ...mainOptions, watch: true })
        }
    }
}

function createLib() {
    const points = dependencies.reduce((point, dependency) => {
        try {
            const pkg = require(`./node_modules/${dependency}/package.json`);
            const main = pkg.main ?? "index.js";
            const mainAbsPath = resolve(`./node_modules/${dependency}`, main);
            if (existsSync(mainAbsPath)) {
                point[dependency] = mainAbsPath;
            }
        } catch (err) {
            console.warn(`Skipping dependency ${dependency}: ${err.message}`)
        }
        return point;
    }, {})
    esbuild.build({
        entryPoints: points,
        bundle: true,
        outdir: "out/node_modules",
        format: 'cjs',
        platform: 'node',
        minify: true,
        treeShaking: true,
        metafile: true
    })
}

createLib();
main();
