/**
 * 号牌字体
 *
 * 两条来源，默认走包内：
 *   - 包内字库：styles/plate.less 里已写好 @font-face，引了样式就能用，不用额外配置
 *   - CDN 字库：传 cdn，改成远程地址（与站点已有的 /upload/fonts/License-plate 一致）
 *
 * 之所以能用「运行时再注入一条」来切换：同名同字重的 @font-face 后声明的生效，
 * 于是 CDN 那条会把包内那条整体替换掉，牌面与输入格读的字体栈不用改一个字。
 */

/** 运行时注入的那条声明所在的 style 标签 id */
const STYLE_ID = 'rlp-font-url'

/** 包内声明使用的族名，也是 --rlp-font-family 的默认值 */
export const PLATE_FONT_FAMILY = 'LicensePlate'

/** CDN 字库地址：woff2 优先，woff 兜底不支持 woff2 的旧内核 */
export const CDN_FONT_URLS = [
  'https://remons.cn:3008/upload/fonts/License-plate/license-plate.woff2',
  'https://remons.cn:3008/upload/fonts/License-plate/license-plate.woff',
]

// 记着包自己动过哪几处：没注入过时不能顺手去清业务写的 --rlp-font-family
let injectedStyle = false
let injectedVar = false

/** 按扩展名推断 format()，认不出来按 truetype 兜底 */
export function fontFormatOf(url: string): string {
  const ext = url.split(/[?#]/)[0].split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'woff2') return 'woff2'
  if (ext === 'woff') return 'woff'
  if (ext === 'otf') return 'opentype'
  return 'truetype'
}

export interface PlateFontOptions {
  /** true = 用 CDN 字库；false 或不传 = 用包内字库 */
  cdn?: boolean
  /** 自托管地址，优先级高于 cdn；多条按顺序写进 src，空或 false 表示不覆盖 */
  url?: string | string[] | false
  /** 族名，默认沿用包内的 LicensePlate；换名字会一并改写 --rlp-font-family */
  family?: string
}

/** 该用哪几份地址：自托管 &gt; CDN &gt; 包内（返回空数组表示不注入） */
export function resolveFontUrls({ cdn, url }: Pick<PlateFontOptions, 'cdn' | 'url'>): string[] {
  const custom = (Array.isArray(url) ? url : [url]).filter((u): u is string => !!u)
  if (custom.length) return custom
  return cdn ? CDN_FONT_URLS : []
}

/**
 * 切换号牌字库来源
 * @param options 也可以直接传地址串 / 地址数组
 */
export function setPlateFont(options?: string | string[] | false | PlateFontOptions): void {
  // 只在浏览器里动 DOM，SSR 阶段直接跳过
  if (typeof document === 'undefined') return
  const input: PlateFontOptions =
    typeof options === 'object' && options !== null && !Array.isArray(options) ? options : { url: options }
  const { family = PLATE_FONT_FAMILY } = input
  const urls = resolveFontUrls(input)
  const style = document.getElementById(STYLE_ID)
  const root = document.documentElement

  // 回到包内字库：把注入的那条撤掉，同名的 @font-face 就只剩 styles/plate.less 里的那份
  if (!urls.length) {
    if (!injectedStyle && !injectedVar) return
    document.getElementById(STYLE_ID)?.remove()
    if (injectedVar) root.style.removeProperty('--rlp-font-family')
    injectedStyle = false
    injectedVar = false
    return
  }

  const src = urls.map((u) => `url("${u}") format("${fontFormatOf(u)}")`).join(',')
  // 字重跟着牌面走 700：字库只有一套字形，标成 normal 会让浏览器对真字符合成加粗，笔画被糊掉
  const css = `@font-face{font-family:'${family}';font-weight:700;font-style:normal;font-display:swap;src:${src}}`
  // 页面上多个组件共用一条声明，重复调用只更新内容，不堆 style 标签
  if (style) style.textContent = css
  else {
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = css
    document.head.appendChild(el)
  }
  injectedStyle = true

  // 族名没变就不用动字体栈；换了名字得让 .rlp-plate / .rlp-cell 跟着走
  if (family === PLATE_FONT_FAMILY) {
    if (injectedVar) root.style.removeProperty('--rlp-font-family')
    injectedVar = false
  } else {
    root.style.setProperty('--rlp-font-family', `'${family}'`)
    injectedVar = true
  }
}
