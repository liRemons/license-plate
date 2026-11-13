import { useEffect } from 'react'
import { setPlateFont } from '../core/font'

export interface PlateFontProps {
  /** 字库来源：true 走 CDN，false 或不传走包内自带的字库 */
  cdn?: boolean
  /** 自托管字体地址，优先级高于 cdn；传 false 撤掉之前的覆盖 */
  fontUrl?: string | string[] | false
}

/**
 * 把字库来源落成文档级 @font-face
 *
 * 字库是文档级资源，牌面与抽屉里的输入格共用同一份，所以注入挂在 head 而不是组件内。
 * 两者都没传时走 styles/plate.less 里包内那条 @font-face；
 * 从 cdn 改回包内时要靠这一次重新下发把之前注入的那条撤掉，所以上面不提前 return。
 */
function usePlateFont({ cdn, fontUrl }: PlateFontProps): void {
  // 依赖取内容拼串，避免每次渲染新建数组把同一条声明反复重写
  const key = `${cdn ? 1 : 0}|${fontUrl === undefined ? '' : Array.isArray(fontUrl) ? fontUrl.join(',') : String(fontUrl)}`
  useEffect(() => {
    setPlateFont({ cdn, url: fontUrl })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

export { usePlateFont }
