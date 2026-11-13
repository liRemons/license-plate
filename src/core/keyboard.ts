import { allowedKeys } from './cells'
import { MILITARY_HEADS, NE_ELECTRIC, NE_NONELECTRIC, PLATE_LETTERS, PROVINCES } from './kinds'
import type { PlateSegment, SegmentKind } from './templates'

/**
 * 键盘布局：把槽位种类翻译成一块块按键行
 *
 * 移动端只做「点选」，所以这里只负责排布，不处理物理键盘事件。
 * 排版原则是按键越大越好按：
 * - 选项少的（省份 / 军种 / 港澳 / X·S）用宫格，一行放得下就一行
 * - 数字行一律一行 5 个，混排键盘也不例外：右边让给功能栏之后，一行塞 10 个只剩 26px 宽，
 *   比字母行还窄，缩间距也救不回来（gap 归零才多 5px）
 * - I、O 从源头上不进键盘（标准规定不参与编排），用户没有打错的机会
 */

export interface KeyboardLayout {
  /** 逐行按键，行内顺序即渲染顺序 */
  rows: string[][]
  /** 行内最多几个按键，供 CSS 反推按键宽度上限 */
  columns: number
  /** 宫格（汉字类，等宽铺满）还是键位式（字母数字） */
  shape: 'grid' | 'keys'
}

const DIGITS = '0123456789'.split('')
const NE_LETTERS = [...NE_ELECTRIC, ...NE_NONELECTRIC]

/** 按 size 切块，最后一块可能不足 */
function chunk(list: string[], size: number): string[][] {
  const rows: string[][] = []
  for (let i = 0; i < list.length; i += size) rows.push(list.slice(i, i + size))
  return rows
}

function of(rows: string[][], shape: KeyboardLayout['shape']): KeyboardLayout {
  return { rows, shape, columns: rows.reduce((max, r) => Math.max(max, r.length), 0) }
}

/** 槽位种类 → 键盘 */
export function buildKeyboard(kind: SegmentKind): KeyboardLayout {
  switch (kind) {
    case 'province':
      // 31 个省级简称，7 列 5 行，375px 宽下每键约 45px，够按
      return of(chunk(PROVINCES, 7), 'grid')
    case 'militaryHead':
      return of(chunk(MILITARY_HEADS, 5), 'grid')
    case 'emergencyHead':
      return of([allowedKeys('emergencyHead')], 'grid')
    case 'portFlag':
      return of([['港', '澳']], 'grid')
    case 'areaLetter':
      // 只要字母，给满 24 键（已去掉 I、O），3 行 8 列
      return of(chunk(PLATE_LETTERS, 8), 'keys')
    case 'serial':
      // 数字 + 字母混排：数字照一行 5 个切两行，字母一行 8 个
      return of([...chunk(DIGITS, 5), ...chunk(PLATE_LETTERS, 8)], 'keys')
    case 'serialDigit':
      return of(chunk(DIGITS, 5), 'keys')
    case 'neSerialSmall':
      // 字母只能是新能源那 10 个，直接砍掉其余字母，比事后报错更好
      return of([...chunk(DIGITS, 5), ...chunk(NE_LETTERS, 5)], 'keys')
    case 'neSerialLarge':
      // 末位固定 D / F，其它位数字
      return of([['D', 'F'], ...chunk(DIGITS, 5)], 'keys')
    default:
      return of([...chunk(DIGITS, 5), ...chunk(PLATE_LETTERS, 8)], 'keys')
  }
}

/** 该槽位是否只有两三个选项（这类直接在牌面上方做成一排按钮，不必占满键盘区） */
export function isCompactKeyboard(kind: SegmentKind): boolean {
  return kind === 'portFlag' || kind === 'emergencyHead'
}

/**
 * 槽位 → 牌面与键盘之间那句提示
 *
 * 光印个段落名（「序号」「发牌机关代号」）看不出要干什么，这里把「这一格能按什么」说全。
 * 键盘本身只摆合法键，所以提示只补键盘上看不出来的信息：位数、哪个位置要字母、
 * I・O 不参与、新能源的纯电非纯电。填错了另有一套红色校验文案接住。
 */
export function segmentHint(segment?: PlateSegment): string {
  if (!segment || segment.role === 'fixed' || !segment.kind) return ''
  const n = segment.length
  switch (segment.kind) {
    case 'province':
      return '选省份简称'
    case 'areaLetter':
      return '发牌机关代号：一个字母，不用 I、O'
    case 'serial':
      return `序号 ${n} 位：数字或字母，不用 I、O`
    case 'serialDigit':
      return `序号 ${n} 位：只填数字`
    case 'neSerialSmall':
      return `序号 ${n} 位：数字 + 一位字母，字母排在首位或次位`
    case 'neSerialLarge':
      return `序号 ${n} 位：数字，末位 D（纯电）或 F（非纯电）`
    case 'militaryHead':
      return '选军种字头'
    case 'emergencyHead':
      return 'X 消防救援 / S 森林消防'
    case 'portFlag':
      return '选「港」或「澳」'
    default:
      return segment.label ?? ''
  }
}
