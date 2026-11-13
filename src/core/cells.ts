import {
  EMERGENCY_HEADS,
  MILITARY_HEADS,
  NE_ELECTRIC,
  NE_NONELECTRIC,
  PLATE_LETTERS,
  PROVINCES,
} from './kinds'
import type { PlateSegment, SegmentKind } from './templates'

/**
 * 槽位与格子的底层工具
 *
 * 牌面被摊平成一格一格的布局（只读格与可编辑格混排），
 * 输入器点哪格就把光标移过去，值按「段」存放，两者用 segmentIndex + offset 关联。
 */

export interface CellLayout {
  /** editable 可编辑格，fixed 由类型带出的只读格 */
  role: 'editable' | 'fixed'
  /** 所属段（模板 segments 的下标） */
  segmentIndex: number
  /** 段内第几个字符 */
  offset: number
  /** 只读格的文本 */
  fixedText?: string
  /** 可编辑格的槽位种类，决定用哪套键盘 */
  slotKind?: SegmentKind
  /** 该格之前是否排分隔点（由段上的 dotBefore 落到第一格） */
  dotBefore?: boolean
}

/** 把模板摊成牌面布局 */
export function buildLayout(segments: PlateSegment[]): CellLayout[] {
  const cells: CellLayout[] = []
  segments.forEach((segment, segmentIndex) => {
    if (segment.role === 'fixed') {
      const text = segment.text ?? ''
      // 固定段可能多字（如「粤Z」「WJ」「应急」），按字符拆格，保证与真牌一格一字一致
      const chars = Array.from(text)
      chars.forEach((ch, offset) => {
        cells.push({ role: 'fixed', segmentIndex, offset, fixedText: ch, dotBefore: offset === 0 && segment.dotBefore })
      })
      return
    }
    for (let offset = 0; offset < segment.length; offset += 1) {
      cells.push({
        role: 'editable',
        segmentIndex,
        offset,
        slotKind: segment.kind,
        dotBefore: offset === 0 && segment.dotBefore,
      })
    }
  })
  return cells
}

/**
 * 槽位允许的按键
 * 标准规定 I、O 不使用（与 1、0 易混），新能源序号的字母限定在 D/A/B/C/E 与 F/G/H/J/K
 */
export function allowedKeys(kind: SegmentKind): string[] {
  const digits = '0123456789'.split('')
  const neLetters = [...NE_ELECTRIC, ...NE_NONELECTRIC]
  switch (kind) {
    case 'province':
      return PROVINCES
    case 'militaryHead':
      return MILITARY_HEADS
    case 'emergencyHead':
      return EMERGENCY_HEADS
    case 'portFlag':
      return ['港', '澳']
    case 'areaLetter':
      return PLATE_LETTERS
    case 'serial':
      return [...digits, ...PLATE_LETTERS]
    case 'serialDigit':
      return digits
    case 'neSerialSmall':
      // 首位字母（D/A/B/C/E 纯电、F/G/H/J/K 非纯电），其余数字；实际发放中字母也可能落在次位
      return [...digits, ...neLetters]
    case 'neSerialLarge':
      return [...digits, 'D', 'F']
    default:
      return [...digits, ...PLATE_LETTERS]
  }
}

/** 按模板把各段的值拼成完整号牌串（不含分隔点） */
export function assemblePlate(segments: PlateSegment[], values: string[]): string {
  let out = ''
  segments.forEach((segment, i) => {
    if (segment.role === 'fixed') out += segment.text ?? ''
    else out += values[i] ?? ''
  })
  return out
}

/** 空值数组（每段一个空串） */
export function emptyValues(segments: PlateSegment[]): string[] {
  return segments.map(() => '')
}

/**
 * 把一个号牌串按模板拆回各段的值，用于回填输入器
 * 对不上的段留空，多出的字符丢弃（宁可少填也不填错位置）
 */
export function splitToValues(segments: PlateSegment[], raw: string): string[] {
  const text = raw.replace(/[\s·・.．\-_]/g, '').toUpperCase()
  const values = emptyValues(segments)
  // 固定段的字是模板带出来的，不是号牌里要占槽位的内容：先把它们从串上摘掉，
  // 剩下的才是纯槽位内容，按段长依次切。
  // 少了这一步，尾部没填齐的牌（京A194 + 固定「警」）会把「警」当序号吞进最后一格
  const editableText = segments
    .filter((segment) => segment.role === 'fixed')
    .map((segment) => segment.text ?? '')
    .filter(Boolean)
    .reduce((acc, fixedText) => {
      const at = acc.lastIndexOf(fixedText)
      return at < 0 ? acc : acc.slice(0, at) + acc.slice(at + fixedText.length)
    }, text)
  let cursor = 0
  segments.forEach((segment, i) => {
    if (segment.role === 'fixed') return
    values[i] = editableText.slice(cursor, cursor + segment.length)
    cursor += values[i].length
  })
  return values
}

/**
 * 换模板时把旧值往新模板上搬（重选类型、业务侧换车都走这里）
 *
 * splitToValues 只切位置不判字符，旧模板带出来的「警」「港」这类标记
 * 在新模板里没有单元格归属，会被当成序号吞进最后一格。这里逐格对一遍槽位字符集：
 * 撞第一个不收的字符就到此为止，后面的格子留空，光标自然停在缺口。
 * 这样漏勾新能源这种改类型只补差的那几位，不把人家的前缀清零；
 * 串本身就属于新模板时（接口下发的牌原样回填），结果与 splitToValues 一致。
 */
export function migrateToTemplate(segments: PlateSegment[], raw: string): string[] {
  const values = splitToValues(segments, raw)
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i]
    if (segment.role === 'fixed') continue
    const keys = segment.kind ? allowedKeys(segment.kind) : null
    if (!keys) continue
    const chars = values[i].split('')
    const bad = chars.findIndex((ch) => !keys.includes(ch))
    if (bad < 0) continue
    values[i] = chars.slice(0, bad).join('')
    for (let j = i + 1; j < segments.length; j += 1) values[j] = ''
    break
  }
  return values
}
