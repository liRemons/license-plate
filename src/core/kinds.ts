import type { PlateSize } from './spec'

/**
 * 号牌种类：只关心「怎么渲染」——底色、字色、框线、外廓尺寸
 * 与 PlateType（业务侧车辆/号牌类型，关心「怎么输入」）分开，两者由 templates 关联
 */
export type PlateKind =
  /** 小型汽车（燃油） */
  | 'blue'
  /** 大型汽车、中重型货车、挂车、教练车、低速车、摩托车 */
  | 'yellow'
  /** 小型新能源：渐变绿 */
  | 'newEnergySmall'
  /** 大型新能源：黄绿双拼 */
  | 'newEnergyLarge'
  /** 警车 */
  | 'police'
  /** 应急救援（消防 / 森林消防） */
  | 'emergency'
  /** 军车 */
  | 'military'
  /** 武警 */
  | 'armedPolice'
  /** 使领馆、港澳入出境 */
  | 'diplomatic'
  /** 识别不出：跟随主题，不猜颜色也不画框线 */
  | 'unknown'

export interface KindMeta {
  /** 标准里的号牌名称 */
  name: string
  /** 标准表 1 的「底-字-框线」原文描述，便于逐条核对 */
  colorSpec: string
  /** 框线色系，对应 CSS 的 --rlp-line-color */
  line: 'black' | 'white' | 'none'
  /** 外廓尺寸；单排渲染，双排后牌不在本包范围 */
  size: PlateSize
  /** 序号位数（5 位为传统牌，6 位为新能源牌） */
  serialLength: number
}

const SIZE_CAR: PlateSize = { widthMm: 440, heightMm: 140 }
const SIZE_NE: PlateSize = { widthMm: 480, heightMm: 140 }

/**
 * 各号牌种类的渲染元数据
 *
 * 已核到明文依据：blue / yellow / newEnergySmall / newEnergyLarge / police / emergency / diplomatic 的
 * 「底-字-框线」组合，以及 440×140（普通）与 480×140（新能源）外廓尺寸。
 * 存疑项（标准未查见明文，暂按汽车牌处理）：military、armedPolice 的框线色与外廓尺寸。
 */
export const PLATE_KINDS: Record<PlateKind, KindMeta> = {
  blue: {
    name: '小型汽车号牌',
    colorSpec: '蓝底白字白框线',
    line: 'white',
    size: SIZE_CAR,
    serialLength: 5,
  },
  yellow: {
    name: '大型汽车号牌',
    colorSpec: '黄底黑字黑框线',
    line: 'black',
    size: SIZE_CAR,
    serialLength: 5,
  },
  newEnergySmall: {
    name: '小型新能源汽车号牌',
    colorSpec: '渐变绿底黑字黑框线',
    line: 'black',
    size: SIZE_NE,
    serialLength: 6,
  },
  newEnergyLarge: {
    name: '大型新能源汽车号牌',
    colorSpec: '黄绿双拼底黑字黑框线',
    line: 'black',
    size: SIZE_NE,
    serialLength: 6,
  },
  police: {
    name: '警用汽车号牌',
    colorSpec: '白底黑字红「警」黑框线',
    line: 'black',
    size: SIZE_CAR,
    serialLength: 4,
  },
  emergency: {
    name: '应急救援车辆号牌',
    colorSpec: '白底黑字红「应急」黑框线',
    line: 'black',
    size: SIZE_CAR,
    serialLength: 4,
  },
  military: {
    name: '军车号牌',
    colorSpec: '白底红字（框线未查见明文）',
    line: 'black',
    size: SIZE_CAR,
    serialLength: 5,
  },
  armedPolice: {
    name: '武警号牌',
    colorSpec: '白底红「WJ」黑字（框线未查见明文）',
    line: 'black',
    size: SIZE_CAR,
    serialLength: 4,
  },
  diplomatic: {
    name: '使领馆 / 港澳入出境号牌',
    colorSpec: '黑底白字白框线',
    line: 'white',
    size: SIZE_CAR,
    serialLength: 6,
  },
  unknown: {
    name: '未识别号牌',
    colorSpec: '跟随主题',
    line: 'none',
    size: SIZE_CAR,
    serialLength: 5,
  },
}

/** 31 个省级简称（号牌首字），顺序与键盘宫格排版一致 */
export const PROVINCES = [
  '京', '津', '沪', '渝',
  '冀', '豫', '云', '辽',
  '黑', '湘', '皖', '鲁',
  '新', '苏', '浙', '赣',
  '鄂', '桂', '甘', '晋',
  '蒙', '陕', '吉', '闽',
  '贵', '粤', '青', '藏',
  '川', '宁', '琼',
]

/** 军车字头（2012 式） */
export const MILITARY_HEADS = ['军', '空', '海', '北', '沈', '兰', '济', '成', '广', '南']

/** 应急救援第二字：X 消防救援、S 森林消防 */
export const EMERGENCY_HEADS = ['X', 'S']

/**
 * 号牌字母集：26 个字母去掉 I、O（标准规定 I/O 不使用，避免与 1、0 混淆）
 */
export const PLATE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')

/** 序号里可用的非纯电 / 纯电标志字母（新能源序号规则） */
export const NE_ELECTRIC = ['D', 'A', 'B', 'C', 'E']
export const NE_NONELECTRIC = ['F', 'G', 'H', 'J', 'K']
