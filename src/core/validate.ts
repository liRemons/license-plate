import { allowedKeys } from './cells'
import { NE_ELECTRIC, NE_NONELECTRIC } from './kinds'
import type { PlateSegment, SegmentKind } from './templates'

/**
 * 号牌校验：按模板逐段判「填满没有、字符合不合法、新能源字母位置对不对」
 *
 * 只按标准明文能站得住的规则判：字符集、位数、新能源序号里字母的位置。
 * 序号内部的编码规则（哪几位可字母、哪几位必数字）各地发放口径有差异，这里保持宽松，
 * 避免把合法号判成非法。
 */

export type IssueCode = 'incomplete' | 'charset' | 'newEnergySmallRule' | 'newEnergyLargeRule'

export interface PlateIssue {
  code: IssueCode
  /** 出问题的段下标 */
  segmentIndex: number
  /** 中文说明，可直接展示 */
  message: string
}

export interface PlateValidation {
  /** 填满且全部合法 */
  valid: boolean
  /** 每一位都填上了（不代表合法） */
  complete: boolean
  issues: PlateIssue[]
  /** 出错格定位键 `${segmentIndex}:${offset}`，供 UI 标红 */
  badCells: Record<string, string>
}

const NE_LETTERS = [...NE_ELECTRIC, ...NE_NONELECTRIC]

const isDigit = (ch: string): boolean => /[0-9]/.test(ch)
const isNeLetter = (ch: string): boolean => NE_LETTERS.includes(ch)

/** 单字符是否属于该槽位的可用按键 */
export function isCharAllowed(kind: SegmentKind, ch: string): boolean {
  return allowedKeys(kind).includes(ch)
}

/**
 * 新能源小型序号：6 位、有且仅有一个字母、字母落在首位或次位、其余为数字
 * 现行发放里两种形态都存在（粤B·D12345 与 粤B·1D2345），所以位置放宽到前两位
 */
function checkNeSmall(serial: string): string | undefined {
  const letters = serial.split('').filter((ch) => !isDigit(ch))
  if (letters.length !== 1) return '小型新能源序号需含 1 位字母（D/A/B/C/E 纯电，F/G/H/J/K 非纯电）'
  const at = serial.indexOf(letters[0])
  if (at > 1) return '小型新能源序号的字母需排在首位或次位'
  if (!isNeLetter(letters[0])) return '小型新能源序号的字母不在规定范围内'
  return undefined
}

/** 新能源大型序号：6 位、末位为 D/F、前 5 位为数字 */
function checkNeLarge(serial: string): string | undefined {
  if (!/[DF]$/.test(serial)) return '大型新能源序号末位需为 D（纯电）或 F（非纯电）'
  if (!serial.slice(0, -1).split('').every(isDigit)) return '大型新能源序号前 5 位需为数字'
  return undefined
}

/**
 * 按模板校验整副输入值
 * @param segments 模板段
 * @param values 与 segments 等长的值数组（固定段传空串即可）
 */
export function validateSegments(segments: PlateSegment[], values: string[]): PlateValidation {
  const issues: PlateIssue[] = []
  const badCells: Record<string, string> = {}
  let complete = true

  segments.forEach((segment, segmentIndex) => {
    if (segment.role !== 'slot') return
    const value = values[segmentIndex] ?? ''
    if (value.length < segment.length) complete = false

    value.split('').forEach((ch, offset) => {
      if (!isCharAllowed(segment.kind as SegmentKind, ch)) {
        badCells[`${segmentIndex}:${offset}`] = `${ch} 不可用`
        if (!issues.some((i) => i.code === 'charset' && i.segmentIndex === segmentIndex)) {
          issues.push({
            code: 'charset',
            segmentIndex,
            message: `${segment.label ?? '号牌'}含不可用字符（I、O 不参与编排）`,
          })
        }
      }
    })

    if (value.length < segment.length) {
      issues.push({
        code: 'incomplete',
        segmentIndex,
        message: `${segment.label ?? '号牌'}还差 ${segment.length - value.length} 位`,
      })
      return
    }

    if (segment.kind === 'neSerialSmall') {
      const msg = checkNeSmall(value)
      if (msg) {
        issues.push({ code: 'newEnergySmallRule', segmentIndex, message: msg })
        badCells[`${segmentIndex}:all`] = msg
      }
    }
    if (segment.kind === 'neSerialLarge') {
      const msg = checkNeLarge(value)
      if (msg) {
        issues.push({ code: 'newEnergyLargeRule', segmentIndex, message: msg })
        badCells[`${segmentIndex}:all`] = msg
      }
    }
  })

  return { valid: complete && issues.length === 0, complete, issues, badCells }
}
