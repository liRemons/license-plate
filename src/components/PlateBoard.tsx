import React from 'react'
import type { CellLayout } from '../core/cells'
import type { PlateSegment } from '../core/templates'
import '../styles/sheet.less'

export interface PlateBoardProps {
  /** 摊平后的牌面布局（只读格与可编辑格混排） */
  cells: CellLayout[]
  segments: PlateSegment[]
  values: string[]
  /** 当前光标：可编辑格序号 */
  cursorIndex: number
  /** 校验出错格定位键 `${segmentIndex}:${offset}` */
  badCells: Record<string, string>
  onFocus: (index: number) => void
  /** 键盘收起时不闪光标 */
  showCaret?: boolean
}

/** 真牌上是红字的固定段 */
const RED_FIXED = ['警', '学', '挂', '应急']

/**
 * 编辑态牌面：一格一格摆，只读格由类型带出
 *
 * 不做成一个 input，就是因为要「点第 3 格改第 3 格」——
 * 号牌错一位整串就废了，逐格定位比在字符串里挪光标可靠得多。
 */
function PlateBoard({
  cells,
  segments,
  values,
  cursorIndex,
  badCells,
  onFocus,
  showCaret = true,
}: PlateBoardProps): JSX.Element {
  // 光标用「第几个可编辑格」表示，渲染时是混排在只读格里的，所以要边遍历边数
  let editableOrdinal = -1

  return (
    <div className="rlp-board">
      {cells.map((cell, i) => {
        const dot = cell.dotBefore ? <i className="rlp-board__dot" key={`dot-${i}`} /> : null

        if (cell.role === 'fixed') {
          const isRed = RED_FIXED.includes(segments[cell.segmentIndex]?.text ?? '')
          return (
            <React.Fragment key={i}>
              {dot}
              <span className={`rlp-cell rlp-cell--fixed${isRed ? ' rlp-cell--mark' : ''}`}>{cell.fixedText}</span>
            </React.Fragment>
          )
        }

        editableOrdinal += 1
        const index = editableOrdinal
        const char = (values[cell.segmentIndex] ?? '')[cell.offset] ?? ''
        const active = index === cursorIndex
        // 整段级别的规则问题（新能源字母位置）不标到单格，只进提示行
        const bad = Boolean(badCells[`${cell.segmentIndex}:${cell.offset}`])

        return (
          <React.Fragment key={i}>
            {dot}
            <button
              type="button"
              className={`rlp-cell${active ? ' rlp-cell--active' : ''}${bad ? ' rlp-cell--bad' : ''}`}
              aria-label={`第 ${index + 1} 位`}
              onClick={() => onFocus(index)}
            >
              {char || (active && showCaret ? <i className="rlp-cell__caret" /> : null)}
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}

export { PlateBoard }
