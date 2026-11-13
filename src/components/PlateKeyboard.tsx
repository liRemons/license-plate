import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { buildKeyboard, isCompactKeyboard } from '../core/keyboard'
import type { SegmentKind } from '../core/templates'
import '../styles/keyboard.less'

export interface PlateKeyboardProps {
  /** 当前光标所在槽位的种类，决定这块键盘长什么样 */
  kind: SegmentKind
  onKey: (ch: string) => void
  onBackspace: () => void
  /** 确认键文案与状态：填满前也能点，由上层提示还差几位 */
  okText?: string
  okEnabled?: boolean
  onOk: () => void
}

/**
 * 自绘键盘：移动端不调起系统输入法，按键集合由槽位种类限定
 *
 * 之所以整块自己画，是因为系统键盘既打不出「粤」「警」这类字（要切中文输入法，
 * 还会把页面顶得乱跳），也没法禁止用户输入 I、O 这种号牌里根本不存在的字母。
 * 这里从源头只摆合法按键，用户没有打错的机会。
 */
function PlateKeyboard({ kind, onKey, onBackspace, okText = '完成', okEnabled, onOk }: PlateKeyboardProps): JSX.Element {
  const layout = useMemo(() => buildKeyboard(kind), [kind])
  const compact = isCompactKeyboard(kind)

  return (
    // 列数交给 CSS 当宫格列数：宫格最后一行凑不满时也得按最大列数切格，键宽才跟上面几行一致
    <div className={`rlp-kbd rlp-kbd--${layout.shape}`} style={{ '--rlp-kbd-cols': layout.columns } as CSSProperties}>
      {/* 键盘上不再写提示：那句“这一格能按什么”归抽屉里的 .rlp-hint，两处各写一份会长得不一样 */}
      {/* 左边铺字符键，右边一竖栏放功能键：
          右下角那格是系统键盘退格的位置，而为一个键多开一整行会把键盘撑高半屏 */}
      <div className="rlp-kbd__body">
        <div className="rlp-kbd__keys">
          {layout.rows.map((row) => (
            <div className={compact ? 'rlp-kbd__chips' : 'rlp-kbd__row'} key={row.join('')}>
              {row.map((ch) => (
                <button
                  type="button"
                  className={compact ? 'rlp-kbd__chip' : 'rlp-kbd__key'}
                  key={ch}
                  // 键盘按键一律不该抢表单提交，type=button 是底线
                  onClick={() => onKey(ch)}
                >
                  {ch}
                </button>
              ))}
            </div>
          ))}
        </div>
        {/* 右栏两枚：删除固定占右下角那两格高（系统键盘退格的位置），剩下的整条给完成，
            栏顶不留空。两个都是“不想接着填了”之后的动作，拇指不用离开这片热区。
            清空不在这里——它一下毁掉整串，放到抽屉标题栏左手边，离拇指最远 */}
        <div className="rlp-kbd__side">
          <button
            type="button"
            className="rlp-kbd__key rlp-kbd__key--ok"
            aria-disabled={!okEnabled}
            onClick={onOk}
          >
            {okText}
          </button>
          <button type="button" className="rlp-kbd__key rlp-kbd__key--del" onClick={onBackspace}>
            删除
          </button>
        </div>
      </div>
    </div>
  )
}

export { PlateKeyboard }
