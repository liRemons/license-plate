// 构建后处理：字库随包发布，并把 vite 内联进 index.css 的 base64 还原成文件引用
//
// 为什么要单独走一步：vite 的 lib 模式没有 publicPath 概念，CSS 里引用的资源一律内联
// （assetsInlineLimit 设 0 也拦不住），三个字体文件内联后 index.css 直接 5MB+，
// 引样式的页面都得先把它下完。字库本体发到 dist/fonts，CSS 只留相对路径，
// 消费方的打包工具（webpack / vite）再按自己的规则重写这个地址。
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = resolve(projectRoot, 'src/assets')
const fontsOut = resolve(projectRoot, 'dist/fonts')
const cssPath = resolve(projectRoot, 'dist/index.css')

const FONT_RE = /\.(woff2|woff|ttf|otf)$/i
const files = readdirSync(assetsDir).filter((f) => FONT_RE.test(f))
if (!files.length) {
  console.error('✗ src/assets 下没有字库文件，包内 @font-face 会指向空目录')
  process.exit(1)
}

mkdirSync(fontsOut, { recursive: true })
for (const f of files) copyFileSync(resolve(assetsDir, f), resolve(fontsOut, f))

// data:font/woff2;base64,... → ./fonts/license-plate.woff2
let css = readFileSync(cssPath, 'utf8')
let replaced = 0
css = css.replace(/url\(\s*data:font\/([a-z0-9.+-]+);base64,[^)]*\)/gi, (raw, kind) => {
  const name = `license-plate.${kind}`
  if (!files.includes(name)) return raw
  replaced += 1
  return `url("./fonts/${name}")`
})
writeFileSync(cssPath, css)

const left = (css.match(/data:font\//g) ?? []).length
// vite 自己报的体积是改写前的（它只看到内联完的 CSS），这里补一行最终值
const kb = (statSync(cssPath).size / 1024).toFixed(1)
console.log(`✓ 字库 → dist/fonts（${files.join(', ')}），index.css 还原 ${replaced} 处内联地址，最终 ${kb} kB`)
if (left) console.warn(`! index.css 里仍剩 ${left} 处 data:font，产物体积可能偏大`)
