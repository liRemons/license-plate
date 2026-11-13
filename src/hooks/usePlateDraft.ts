import { useCallback, useMemo, useState } from 'react'
import { assemblePlate, buildLayout, emptyValues, migrateToTemplate } from '../core/cells'
import { getSegments } from '../core/templates'
import type { PlateSegment, PlateType } from '../core/templates'
import { validateSegments } from '../core/validate'
import type { PlateValidation } from '../core/validate'

/**
 * 输入草稿：把「一格格按键盘」的状态机收在一处
 *
 * 值按模板段存放（values[i] 对应 segments[i]），牌面却是一格一格的，
 * 所以对外统一用「可编辑格下标」当光标，内部再翻译成 段下标 + 段内偏移。
 * 这样点任意一格能把光标移过去，连续按键又能自动往后走。
 */

export interface CursorPosition {
  /** 可编辑格序号（0 起，跳过只读格） */
  cellIndex: number
  /** 所属模板段下标 */
  segmentIndex: number
  /** 段内第几个字符 */
  offset: number
}

export interface PlateDraft {
  type: PlateType
  segments: PlateSegment[]
  /** 摊平后的牌面布局，只读格与可编辑格混排 */
  cells: ReturnType<typeof buildLayout>
  /** 可编辑格在 cells 里的下标，光标位置就是它在本数组里的下标 */
  editableAt: number[]
  values: string[]
  cursor: CursorPosition | null
  /** 归一化后的完整号牌串（不含分隔点） */
  plate: string
  validation: PlateValidation
  /** 已输入的字符数 */
  filledCount: number
  /** 光标回到第一格、整副清空 */
  reset: () => void
  /** 把光标移到第 n 个可编辑格 */
  focus: (index: number) => void
  /** 在当前格落一个字符 */
  input: (ch: string) => void
  /** 删掉光标及之前最后一个有字的格 */
  backspace: () => void
  /** 清空当前段 */
  clearSegment: () => void
  /** 整副清空 */
  clearAll: () => void
  /** 回填一个号牌串：能对上位置的留着，本槽位不收的字符往后清空 */
  applyPlate: (raw: string) => void
}

/** 段的第 offset 格是否已有值 */
const filledAt = (value: string, offset: number): boolean => offset < value.length

export function usePlateDraft(type: PlateType, overrides?: Partial<Record<PlateType, PlateSegment[]>>): PlateDraft {
  const segments = useMemo(() => getSegments(type, overrides), [type, overrides])
  const [values, setValues] = useState<string[]>(() => emptyValues(segments))
  const [cellIndex, setCellIndex] = useState(0)

  const cells = useMemo(() => buildLayout(segments), [segments])
  const editableAt = useMemo(
    () => cells.reduce<number[]>((acc, cell, i) => (cell.role === 'editable' ? [...acc, i] : acc), []),
    [cells],
  )

  // 模板换了（改类型或业务侧覆盖）段数与段长都变了，旧值必须整副丢掉，
  // 否则会把上一种牌的残留字符拼进新模板。用「渲染期对齐 state」而不是 effect，避免多渲染一帧脏值
  const [lastSegments, setLastSegments] = useState(segments)
  if (lastSegments !== segments) {
    setLastSegments(segments)
    setValues(emptyValues(segments))
    setCellIndex(0)
  }

  const cursor = useMemo<CursorPosition | null>(() => {
    const at = editableAt[cellIndex]
    if (at === undefined) return null
    const cell = cells[at]
    return { cellIndex, segmentIndex: cell.segmentIndex, offset: cell.offset }
  }, [cellIndex, editableAt, cells])

  const plate = useMemo(() => assemblePlate(segments, values), [segments, values])
  const validation = useMemo(() => validateSegments(segments, values), [segments, values])
  const filledCount = useMemo(
    () => values.reduce((sum, v) => sum + v.length, 0),
    [values],
  )

  /** 光标回到第一格、整副清空（换成另一种类型的模板后调） */
  const reset = useCallback(() => {
    setValues(emptyValues(segments))
    setCellIndex(0)
  }, [segments])

  const focus = useCallback(
    (next: number) => {
      if (next >= 0 && next < editableAt.length) setCellIndex(next)
    },
    [editableAt.length],
  )

  /**
   * 落一个字符：本格已有字就覆盖，否则往后追加
   *
   * 早期这里用的是插入式（splice），结果改中间一格会把末位数字静静挤掉
   * （京A1234 把第 2 位改成 9 → 京A1923，4 丢了）。编辑已有号牌时这比丢一位更坑，
   * 而且没人期望改一个字符能带动后面整串。段内永远是前缀填充，所以两种情况都不会有空洞。
   */
  const input = useCallback(
    (ch: string) => {
      if (!cursor) return
      const { segmentIndex, offset } = cursor
      const length = segments[segmentIndex].length
      setValues((prev) => {
        const next = [...prev]
        const chars = next[segmentIndex].split('')
        if (offset < chars.length) chars[offset] = ch
        // 点到段尾之后的空格：当成接着输，落位到本段末尾（不会插出空洞）
        else chars.push(ch)
        next[segmentIndex] = chars.slice(0, length).join('')
        return next
      })
      if (cellIndex < editableAt.length - 1) setCellIndex(cellIndex + 1)
    },
    [cursor, segments, cellIndex, editableAt.length],
  )

  /**
   * 退格：删掉「光标及之前最后一个有字的格」，段内左移补齐
   * 与普通输入框一致 —— 当前格是空的（点到了后面的格）也能删到前面已输入的内容
   */
  const backspace = useCallback(() => {
    if (!cursor) return
    let target = cursor.cellIndex
    for (let i = cursor.cellIndex; i >= 0; i -= 1) {
      const at = editableAt[i]
      const cell = at === undefined ? undefined : cells[at]
      if (cell && filledAt(values[cell.segmentIndex], cell.offset)) {
        target = i
        break
      }
    }
    const at = editableAt[target]
    const cell = at === undefined ? undefined : cells[at]
    if (!cell) return
    setValues((prev) => {
      const next = [...prev]
      const chars = next[cell.segmentIndex].split('')
      chars.splice(cell.offset, 1)
      next[cell.segmentIndex] = chars.join('')
      return next
    })
    setCellIndex(target)
  }, [cursor, values, editableAt, cells])

  /** 清空当前段（连点两下删除键的直觉：整段重来） */
  const clearSegment = useCallback(() => {
    if (!cursor) return
    const segmentIndex = cursor.segmentIndex
    setValues((prev) => {
      const next = [...prev]
      next[segmentIndex] = ''
      return next
    })
    const firstOfSegment = editableAt.findIndex((i) => cells[i].segmentIndex === segmentIndex)
    if (firstOfSegment >= 0) setCellIndex(firstOfSegment)
  }, [cursor, editableAt, cells])

  /** 整副清空 */
  const clearAll = useCallback(() => {
    setValues(emptyValues(segments))
    setCellIndex(0)
  }, [segments])

  /** 回填一个已有号牌串（编辑场景：接口回来的牌要能落到格子上，换类型时旧内容也往新模板上搬） */
  const applyPlate = useCallback(
    (raw: string) => {
      const next = migrateToTemplate(segments, raw)
      setValues(next)
      // 光标落在第一个空格，接着往下填；整串填满了就停在最后一格。
      // 这里必须用刚算好的 next 而不是 state 里的旧 values，
      // 否则第二次打开时位置跟内容对不上（内容被清了光标却还在末位）
      let firstEmpty = -1
      for (let i = 0; i < editableAt.length; i += 1) {
        const cell = cells[editableAt[i]]
        if (next[cell.segmentIndex].length <= cell.offset) {
          firstEmpty = i
          break
        }
      }
      setCellIndex(firstEmpty < 0 ? Math.max(editableAt.length - 1, 0) : firstEmpty)
    },
    [segments, editableAt, cells],
  )

  return {
    type,
    segments,
    cells,
    editableAt,
    values,
    cursor,
    plate,
    validation,
    filledCount,
    reset,
    focus,
    input,
    backspace,
    clearSegment,
    clearAll,
    applyPlate,
  }
}
