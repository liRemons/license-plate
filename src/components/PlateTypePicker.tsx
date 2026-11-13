import React from 'react'
import { searchPlateTypes } from '../core/search'
import { PLATE_TYPE_LIST } from '../core/templates'
import type { PlateType, PlateTypeOption } from '../core/templates'
import '../styles/sheet.less'

export interface PlateTypePickerProps {
  /** 可选类型白名单，不传则全部 16 种；传了就以这个数组的顺序展示 */
  types?: PlateType[]
  /** 当前类型（从输入屏「重选」回来时给它一个高亮） */
  value?: PlateType
  /** 点卡片直接进输入屏 —— 示例已经挪到输入屏顶部，这里不用再背一个确认按钮 */
  onPick: (type: PlateType) => void
}

/**
 * 第一屏：车辆 / 号牌类型选择
 *
 * 为什么单独占一屏：警、挂、学、应急、军、使领馆这些牌的格式跟普通牌完全不同
 * （位数、字头、有没有分隔点都不一样），必须先定模板，键盘才知道摆哪些键。
 *
 * 16 项按 390px 宽排是 3 列 6 行，靠下滑找太累，所以顶部给一个本地搜索框：
 * 名称、分组、种类、拼音全拼、首字母缩写、口语叫法都能命中（详见 core/search.ts）。
 * 项序按使用频率而非分组（见 templates 的 TYPE_USAGE_RANK），首屏那几格就是绝大多数人要点的那个。
 */
function PlateTypePicker({ types, value, onPick }: PlateTypePickerProps): JSX.Element {
  const [query, setQuery] = React.useState('')

  // 白名单同时把顺序交给业务方：PLATE_TYPE_LIST 是全国口径的频率序，
  // 驾校、物流园、口岸这些场景自己的高频序跟它对不上，只能按传进来的数组摆
  const candidates = React.useMemo<PlateTypeOption[]>(() => {
    if (!types) return PLATE_TYPE_LIST
    const byType = new Map(PLATE_TYPE_LIST.map((o) => [o.type, o] as const))
    const picked: PlateTypeOption[] = []
    const seen = new Set<PlateType>()
    for (const t of types) {
      const option = byType.get(t)
      if (!option || seen.has(t)) continue
      seen.add(t)
      picked.push(option)
    }
    return picked
  }, [types])
  const results = React.useMemo(() => searchPlateTypes(query, candidates), [query, candidates])
  const searching = !!query.trim()

  // 搜完本来就该从列表顶部看起，所以直接回顶 —— 否则结果变少时浏览器会把滚动
  // 位置夹回可用范围，看着像内容闪了一下
  const searchBox = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    searchBox.current?.parentElement?.scrollTo(0, 0)
  }, [query])

  return (
    <>
      <div className="rlp-search" ref={searchBox}>
        <span className="rlp-search__box">
          {/* 放大镜放在框内左侧，右边给清除按钮留固定内边距，输入框本身撑满整行 */}
          <svg className="rlp-search__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.6 10.6 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {/* 搜索框是组件里唯一一处要用户用系统输入法打字的原生 input；号牌录入仍走自绘键盘 */}
          <input
            className="rlp-search__input"
            type="search"
            value={query}
            placeholder="搜索类型：警车 / jc / 新能源…"
            aria-label="搜索车辆类型"
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
          {/* 命中数走 aria-live，只给读屏用户，不占视觉空间 */}
          <span className="rlp-sr-only" aria-live="polite">
            {searching ? `${results.length} 项匹配` : ''}
          </span>
          {searching ? (
            <button type="button" className="rlp-search__clear" aria-label="清空搜索" onClick={() => setQuery('')}>
              ✕
            </button>
          ) : null}
        </span>
      </div>

      {results.length ? (
        <div className="rlp-picker" role="listbox" aria-label="车辆类型">
          {results.map((o) => (
            <button
              type="button"
              className="rlp-type-card"
              key={o.type}
              role="option"
              aria-selected={o.type === value}
              onClick={() => onPick(o.type)}
            >
              {/* 列表里放不下整块牌（375px 三列每列约 100px，而 440mm 按比例要 151px），
                  这里只给一张底色色卡，整块示例牌面放到输入屏顶部 */}
              <i className="rlp-swatch" data-kind={o.kind} />
              <span>{o.name}</span>
              {/* 整个列表都是跨分组的频率序，分组名常驻右下角，免得只剩一堆看不出归属的名称 */}
              <em className="rlp-type-card__group">{o.group}</em>
            </button>
          ))}
        </div>
      ) : (
        <div className="rlp-picker__empty">
          <span>没有匹配「{query.trim()}」的类型</span>
          <button type="button" className="rlp-picker__empty-btn" onClick={() => setQuery('')}>
            清空搜索，看全部 {candidates.length} 种
          </button>
        </div>
      )}
    </>
  )
}

export { PlateTypePicker }
