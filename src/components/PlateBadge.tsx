import React from 'react'
import { PLATE_KINDS } from '../core/kinds'
import { parsePlate } from '../core/parse'
import { PLATE_TYPES } from '../core/templates'
import type { PlateType } from '../core/templates'
import { usePlateFont } from '../hooks/usePlateFont'
import type { PlateFontProps } from '../hooks/usePlateFont'
import '../styles/plate.less'

export interface PlateBadgeProps extends PlateFontProps {
  /** 号牌串，可带「·」或全角字符，内部会归一化 */
  value: string
  /**
   * 业务侧已知的车辆 / 号牌类型。
   * 传了就以它为准（7 位普通牌从号码本身分不清蓝牌还是黄牌，只能靠这个字段）
   */
  type?: PlateType
  /** 渲染高度 px，默认 48；宽度、字号、间距按 GA 36-2018 的 mm 比例跟着换算 */
  height?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * 号牌展示徽标
 *
 * - 底色 / 字色 / 框线按号牌种类，依据 GA 36-2018 表 1；式样与规格见 styles/plate.less
 * - 分隔点由 CSS 绘制（.rlp-plate-dot），不吃文本里的「·」
 * - 警 / 学 / 挂 / 应急 在真牌上是红字，单独包一层 .rlp-plate-mark
 * - 识别不出时不猜颜色，回落到中性虚线框
 */
function PlateBadge({ value, type, height, className, style, cdn, fontUrl }: PlateBadgeProps): JSX.Element {
  // 字库是文档级资源，牌面只需要负责把 cdn / fontUrl 下发一次
  usePlateFont({ cdn, fontUrl })
  const parsed = parsePlate(value, type ? { type } : undefined)
  const { kind, head, serial, hasDot, mark } = parsed
  const meta = PLATE_KINDS[kind]
  // 摩托车牌比汽车牌窄一半，外廓由类型模板覆盖，其余尺寸跟着高度等比缩放
  const size = (type ? PLATE_TYPES[type].sizeOverride : undefined) ?? meta.size

  const vars = {
    '--rlp-height': `${height ?? 48}px`,
    '--rlp-width-mm': size.widthMm,
    '--rlp-height-mm': size.heightMm,
  } as React.CSSProperties

  // 承载红色标识的那一段：有点的牌在序号末尾，使馆这类无点牌在整串末尾。
  // 拆成「主字 + 标识」两段，标识另上色，拼回去不能重复
  const markHost = hasDot ? serial : head
  const markIndex = mark ? markHost.lastIndexOf(mark) : -1
  const bodyText = markIndex >= 0 ? markHost.slice(0, markIndex) : markHost
  const markText = markIndex >= 0 ? markHost.slice(markIndex) : ''

  const body = (
    <>
      {bodyText}
      {markText ? <span className="rlp-plate-mark">{markText}</span> : null}
    </>
  )

  const cls = `rlp-plate${className ? ` ${className}` : ''}`
  const plateStyle = { ...vars, ...style }

  // 大型新能源是黄、绿左右分：黄区放点前内容与分隔点，绿区只放序号，
  // 这样分隔点完整落在单一底色上，唯一分界线就在点与序号之间
  if (kind === 'newEnergyLarge') {
    return (
      <span className={cls} data-kind={kind} style={plateStyle}>
        <span className="rlp-plate-yellow">
          {head}
          {hasDot ? <i className="rlp-plate-dot" /> : null}
        </span>
        <span className="rlp-plate-green">{body}</span>
      </span>
    )
  }

  // 武警的「WJ」字头是红字，后面字母数字是黑字
  if (kind === 'armedPolice') {
    return (
      <span className={cls} data-kind={kind} style={plateStyle}>
        <span className="rlp-plate-wj">{head}</span>
        {hasDot ? <i className="rlp-plate-dot" /> : null}
        {body}
      </span>
    )
  }

  return (
    <span className={cls} data-kind={kind} style={plateStyle}>
      {hasDot ? head : null}
      {hasDot ? <i className="rlp-plate-dot" /> : null}
      {body}
    </span>
  )
}

export { PlateBadge }
