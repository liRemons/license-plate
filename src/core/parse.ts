import { MILITARY_HEADS, NE_ELECTRIC, NE_NONELECTRIC, PROVINCES, type PlateKind } from './kinds'
import { PLATE_TYPES, type PlateType } from './templates'

/**
 * 号牌识别：只给一个号牌串，反推它是哪类牌
 *
 * 判得出来的靠号牌本身（位数、字头、尾字、新能源序号里的字母位置），
 * 判不出来的（轻型货车还是中重型货车，同为 7 位）不硬猜：
 * 返回 exact = false，由业务侧传入 type 明确。
 */

/** 需单独上色的标识（真实号牌上这些字是红色） */
const MARKS = ['警', '学', '挂', '港', '澳', '领', '应急']

/**
 * 归一化：去掉分隔点与空白、全角转半角、字母大写
 * @param raw 原始号牌，可能带 ·、空格、全角字符
 */
export function normalizePlate(raw: string): string {
  return String(raw ?? '')
    .replace(/[\s·・.．\-_]/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toUpperCase()
}

export interface ParsedPlate {
  /** 归一化串（不含分隔点） */
  text: string
  /** 渲染用的号牌种类 */
  kind: PlateKind
  /** 推断出的业务类型；判不准时给出最可能的一个 */
  type: PlateType
  /** 分隔点之前的内容（省份简称 + 发牌机关代号，或军种字头等） */
  head: string
  /** 分隔点之后的内容（序号，含尾字标识） */
  serial: string
  /** 是否需要分隔点 */
  hasDot: boolean
  /** 尾字标识：警 / 学 / 挂 / 港 / 澳 / 领 / 应急 */
  mark: string
  /** 是否新能源 */
  newEnergy: boolean
  /**
   * 是否由号牌本身确定：false 表示只按位数猜测（如 7 位普通牌看不出是蓝牌还是黄牌），
   * 此时应优先采信业务侧传入的 type
   */
  exact: boolean
  /** 识别失败原因（人类可读，用于调试；成功时为空） */
  reason: string
}

const isProvince = (ch: string | undefined): boolean => !!ch && PROVINCES.includes(ch)
const isAreaLetter = (ch: string | undefined): boolean => !!ch && /[A-Z]/.test(ch) && ch !== 'I' && ch !== 'O'

function empty(raw: string, reason: string): ParsedPlate {
  return {
    text: raw,
    kind: 'unknown',
    type: 'car',
    head: raw,
    serial: '',
    hasDot: false,
    mark: '',
    newEnergy: false,
    exact: false,
    reason,
  }
}

/** 常规牌（省份 + 机关字母）的分段：点在两字符之后 */
function regular(text: string): Pick<ParsedPlate, 'head' | 'serial' | 'hasDot'> {
  return { head: text.slice(0, 2), serial: text.slice(2), hasDot: true }
}

/**
 * 按类型模板分段：分隔点排在哪个段前面，head 就到那个段为止
 * 应急（京·X1234应急）、使馆（使123456，无点）这类不在两字符处的牌面靠这个切，不能一律切前两位
 */
function splitByTemplate(text: string, type: PlateType): Pick<ParsedPlate, 'head' | 'serial' | 'hasDot'> {
  let cursor = 0
  for (const segment of PLATE_TYPES[type].segments) {
    if (segment.dotBefore) return { head: text.slice(0, cursor), serial: text.slice(cursor), hasDot: true }
    cursor += segment.length
  }
  return { head: text, serial: '', hasDot: false }
}

/** 取尾字标识：优先匹配「应急」这类多字标识 */
function findMark(text: string): string {
  const multi = MARKS.find((m) => m.length > 1 && text.includes(m))
  if (multi) return multi
  const last = text.slice(-1)
  return MARKS.includes(last) ? last : ''
}

/**
 * 解析号牌
 * @param raw 原始号牌串
 * @param hint 业务侧已知信息：type 会直接决定渲染种类，跳过推断
 */
export function parsePlate(raw: string, hint?: { type?: PlateType }): ParsedPlate {
  const text = normalizePlate(raw)
  if (!text) return empty('', '空号牌')

  // 业务侧已经明确类型时，只补充分段信息，不再推断
  if (hint?.type) {
    const kind = typeToKind(hint.type)
    const mark = findMark(text)
    return {
      text,
      kind,
      type: hint.type,
      ...splitByTemplate(text, hint.type),
      mark,
      newEnergy: kind === 'newEnergySmall' || kind === 'newEnergyLarge',
      exact: true,
      reason: '',
    }
  }

  // 1. 武警：WJ 字头
  if (text.startsWith('WJ')) {
    return {
      ...empty(text, ''),
      kind: 'armedPolice',
      type: 'armedPolice',
      head: 'WJ',
      serial: text.slice(2),
      hasDot: true,
      exact: true,
    }
  }
  // 2. 军车：军种字头
  if (MILITARY_HEADS.includes(text[0])) {
    return {
      ...empty(text, ''),
      kind: 'military',
      type: 'military',
      ...regular(text),
      hasDot: isAreaLetter(text[1]),
      exact: true,
    }
  }
  // 3. 使馆：使字头
  if (text.startsWith('使')) {
    return { ...empty(text, ''), kind: 'diplomatic', type: 'embassy', head: '使', serial: text.slice(1), exact: true }
  }
  // 4. 应急救援：带「应急」二字，分隔点在省份之后（京·X1234应急）
  if (text.includes('应急')) {
    return {
      ...empty(text, ''),
      kind: 'emergency',
      type: 'emergency',
      ...splitByTemplate(text, 'emergency'),
      mark: '应急',
      exact: true,
    }
  }

  const mark = findMark(text)
  // 5. 特种尾字
  if (mark === '警') {
    return { ...empty(text, ''), kind: 'police', type: 'police', ...regular(text), hasDot: isProvince(text[0]), mark, exact: true }
  }
  if (mark === '港' || mark === '澳') {
    return { ...empty(text, ''), kind: 'diplomatic', type: 'hkmc', ...regular(text), hasDot: true, mark, exact: true }
  }
  if (mark === '领') {
    return { ...empty(text, ''), kind: 'diplomatic', type: 'consulate', ...regular(text), hasDot: true, mark, exact: true }
  }
  if (mark === '学') {
    return { ...empty(text, ''), kind: 'yellow', type: 'coach', ...regular(text), hasDot: isProvince(text[0]), mark, exact: true }
  }
  if (mark === '挂') {
    return { ...empty(text, ''), kind: 'yellow', type: 'trailer', ...regular(text), hasDot: isProvince(text[0]), mark, exact: true }
  }

  const isRegular = isProvince(text[0]) && isAreaLetter(text[1])
  if (!isRegular) return empty(text, '首字不是省级简称或第二位不是发牌机关代号')

  // 6. 新能源：8 位（省份 + 字母 + 6 位序号）
  if (text.length === 8) {
    const serial = text.slice(2)
    const NE_LETTERS = [...NE_ELECTRIC, ...NE_NONELECTRIC]
    // 大型：末位 D/F，前 5 位全数字
    const lastIsNE = /[DF]$/.test(serial) && /^[0-9]+$/.test(serial.slice(0, -1))
    // 小型：字母在首位或次位，其余全数字（两种形态现行都在发，与校验的 checkNeSmall 同一口径）
    const letterAt = serial.search(/[A-Z]/)
    const headIsNE =
      letterAt >= 0 &&
      letterAt <= 1 &&
      NE_LETTERS.includes(serial[letterAt]) &&
      /^[0-9]+$/.test(serial.slice(0, letterAt) + serial.slice(letterAt + 1))
    if (lastIsNE) {
      return { ...empty(text, ''), kind: 'newEnergyLarge', type: 'neLarge', ...regular(text), hasDot: true, newEnergy: true, exact: true }
    }
    if (headIsNE) {
      return { ...empty(text, ''), kind: 'newEnergySmall', type: 'neSmall', ...regular(text), hasDot: true, newEnergy: true, exact: true }
    }
    return empty(text, '8 位号码但序号不符合新能源编排（小型：首/次位字母；大型：末位 D/F）')
  }

  // 7. 普通 7 位：号码本身分不出轻卡与重卡（要看行驶证总质量），不猜
  if (text.length === 7) {
    return {
      ...empty(text, ''),
      kind: 'blue',
      type: 'car',
      ...regular(text),
      hasDot: true,
      exact: false,
      reason: '7 位普通牌无法从号码区分小型汽车与中重型货车',
    }
  }

  return empty(text, `号码长度 ${text.length} 不符合现行号牌规格`)
}

/**
 * 业务类型 → 渲染种类
 * 这里是「输入侧」到「渲染侧」的唯一映射入口，避免两处各写一套 switch
 */
export function typeToKind(type: PlateType): PlateKind {
  const map: Record<PlateType, PlateKind> = {
    car: 'blue',
    motorcycle: 'yellow',
    lowSpeed: 'yellow',
    neSmall: 'newEnergySmall',
    neLarge: 'newEnergyLarge',
    large: 'yellow',
    trailer: 'yellow',
    coach: 'yellow',
    police: 'police',
    policeMotor: 'police',
    emergency: 'emergency',
    military: 'military',
    armedPolice: 'armedPolice',
    embassy: 'diplomatic',
    consulate: 'diplomatic',
    hkmc: 'diplomatic',
  }
  return map[type] ?? 'unknown'
}
