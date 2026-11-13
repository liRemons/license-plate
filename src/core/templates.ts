import type { PlateKind } from './kinds'
import type { PlateSize } from './spec'

/**
 * 输入模板：把「选完车辆类型之后要输什么」写成数据结构
 *
 * 牌面被拆成两种段：
 * - slot：可编辑槽位，kind 决定用哪套键盘（省份宫格 / 字母 / 数字 / 受限序号…）
 * - fixed：只读固定段，由类型直接带出（警、学、挂、应急、使、WJ、粤Z）
 *
 * 也就是说「警 / 挂 / 学 / 应急」这类标识不是用户输入的，是选类型时模板自带的，
 * 因此不存在"用键盘打一个警字"这种容易打错的路径。
 */

/** 槽位种类：决定键盘形态、字符集与校验规则 */
export type SegmentKind =
  /** 31 个省级简称，宫格选择 */
  | 'province'
  /** 发牌机关代号 A-Z（禁 I、O） */
  | 'areaLetter'
  /** 序号：数字与字母混排（禁 I、O） */
  | 'serial'
  /** 序号：仅数字 */
  | 'serialDigit'
  /** 小型新能源序号 6 位：首位必须是字母（D/A/B/C/E 纯电，F/G/H/J/K 非纯电） */
  | 'neSerialSmall'
  /** 大型新能源序号 6 位：末位必须是 D/F */
  | 'neSerialLarge'
  /** 军种字头（军/空/海/北/沈/兰/济/成/广/南） */
  | 'militaryHead'
  /** 应急救援类别：X 消防救援、S 森林消防 */
  | 'emergencyHead'
  /** 通行地：港 / 澳 */
  | 'portFlag'

export interface PlateSegment {
  /** slot 可编辑，fixed 只读 */
  role: 'slot' | 'fixed'
  /** 槽位种类（role === 'slot' 时必填） */
  kind?: SegmentKind
  /** 占位格数 */
  length: number
  /** 固定段文本（role === 'fixed' 时必填） */
  text?: string
  /** 段落名：拼在校验文案里（「序号还差 2 位」），也是提示文案的兜底 */
  label?: string
  /** 本段之前是否排分隔点（发牌机关代号与序号之间那个点） */
  dotBefore?: boolean
}

/** 业务可选的车辆 / 号牌类型 */
export type PlateType =
  | 'car'
  | 'motorcycle'
  | 'lowSpeed'
  | 'neSmall'
  | 'neLarge'
  | 'large'
  | 'trailer'
  | 'coach'
  | 'police'
  | 'policeMotor'
  | 'emergency'
  | 'military'
  | 'armedPolice'
  | 'embassy'
  | 'consulate'
  | 'hkmc'

export interface PlateTypeMeta {
  /** 类型标识 */
  type?: PlateType
  /** 类型选择器里的名称 */
  name: string
  /** 分组标题 */
  group: PlateTypeGroup
  /** 渲染用的号牌种类（决定配色与框线） */
  kind: PlateKind
  /** 选完类型后展示的示例牌面（带分隔点） */
  sample: string
  /** 输入模板 */
  segments: PlateSegment[]
  /** 覆盖默认外廓尺寸（摩托车牌比汽车牌小） */
  sizeOverride?: PlateSize
  /** 格式来源说明；标「存疑」的是没有核到明文的部分 */
  note?: string
  /**
   * 本地搜索用的别名：拼音全拼、首字母缩写、口语叫法
   * 移动端在搜索框里打全拼最省事（不用切输入法），所以缩写与别称都要补上
   */
  alias?: string[]
}

export const PLATE_TYPE_GROUPS = ['乘用车', '新能源', '货车与专用', '特种车辆', '使领馆与出入境'] as const
export type PlateTypeGroup = (typeof PLATE_TYPE_GROUPS)[number]

const slot = (kind: SegmentKind, length: number, label: string, extra: Partial<PlateSegment> = {}): PlateSegment => ({
  role: 'slot',
  kind,
  length,
  label,
  ...extra,
})

const fixed = (text: string): PlateSegment => ({ role: 'fixed', text, length: text.length })

/** 常规燃油牌前两段：省份简称 + 发牌机关代号 */
const head = (): PlateSegment[] => [slot('province', 1, '省份简称'), slot('areaLetter', 1, '发牌机关代号')]

/**
 * 类型 → 模板表
 *
 * 存疑与否不在这里复述清单，以各项 note 开头是否写「存疑」为准，避免两处口径对不上。
 * 位数的推导依据也记在 note 里；业务口径不一致时用 props.templates 覆盖。
 * 运行时不拿默认值当合规结论。
 */
export const PLATE_TYPES: Record<PlateType, PlateTypeMeta> = {
  car: {
    name: '小型汽车',
    alias: ['xiaoxingqiche', 'xxqc', 'qiche', '蓝牌', 'lanpai', '轿车'],
    group: '乘用车',
    kind: 'blue',
    sample: '粤B·12345',
    segments: [...head(), slot('serial', 5, '序号', { dotBefore: true })],
  },
  motorcycle: {
    name: '摩托车',
    alias: ['motuoche', 'mtc', '摩托', 'motuo', '两轮'],
    group: '乘用车',
    kind: 'yellow',
    sample: '京A·12345',
    segments: [...head(), slot('serial', 5, '序号', { dotBefore: true })],
    sizeOverride: { widthMm: 220, heightMm: 140 },
    note: '存疑：摩托车牌外廓前牌 220×95、后牌 220×140，本包按后牌单排渲染',
  },
  lowSpeed: {
    name: '低速货车',
    alias: ['disuhuoche', 'dshc', '低速', '三轮汽车', 'sanlun', '机械'],
    group: '乘用车',
    kind: 'yellow',
    sample: '京A·12345',
    segments: [...head(), slot('serial', 5, '序号', { dotBefore: true })],
    note: '低速载货汽车、三轮汽车和轮式自行机械车，黄底黑字黑框线',
  },
  neSmall: {
    name: '小型新能源',
    alias: ['xiaoxingxinnengyuan', 'xxny', 'xinnengyuan', 'xny', '绿牌', 'dipai', '纯电'],
    group: '新能源',
    kind: 'newEnergySmall',
    sample: '粤B·D12345',
    segments: [...head(), slot('neSerialSmall', 6, '序号（首位为字母）', { dotBefore: true })],
  },
  neLarge: {
    name: '大型新能源',
    alias: ['daxingxinnengyuan', 'dxny', 'xinnengyuan', 'xny', '绿牌', 'dipai'],
    group: '新能源',
    kind: 'newEnergyLarge',
    sample: '京A·12345D',
    segments: [...head(), slot('neSerialLarge', 6, '序号（末位为 D/F）', { dotBefore: true })],
  },
  large: {
    name: '大型汽车',
    alias: ['daxingqiche', 'dxqc', '货车', 'huoche', 'huangpai', '黄牌', '中型'],
    group: '货车与专用',
    kind: 'yellow',
    sample: '京A·88888',
    segments: [...head(), slot('serial', 5, '序号', { dotBefore: true })],
    note: '中型（含）以上载客、载货汽车和专项作业车、半挂牵引车、电车',
  },
  trailer: {
    name: '挂车',
    alias: ['guache', 'gc', '半挂', 'bangua', 'huoguache'],
    group: '货车与专用',
    kind: 'yellow',
    sample: '粤B·5678挂',
    segments: [...head(), slot('serialDigit', 4, '序号', { dotBefore: true }), fixed('挂')],
  },
  coach: {
    name: '教练车',
    alias: ['jiaolianche', 'jlc', 'jiaolian', '教练', '学车'],
    group: '货车与专用',
    kind: 'yellow',
    sample: '粤B·1234学',
    segments: [...head(), slot('serialDigit', 4, '序号', { dotBefore: true }), fixed('学')],
  },
  police: {
    name: '警车',
    alias: ['jingche', 'jc', 'jingcha', '警察', '警用'],
    group: '特种车辆',
    kind: 'police',
    sample: '京A·1234警',
    segments: [...head(), slot('serialDigit', 4, '序号', { dotBefore: true }), fixed('警')],
  },
  policeMotor: {
    name: '警用摩托车',
    alias: ['jingyongmotuoche', 'jymtc', '警用摩托', 'jingmotuo'],
    group: '特种车辆',
    kind: 'police',
    sample: '京A·123警',
    segments: [...head(), slot('serialDigit', 3, '序号', { dotBefore: true }), fixed('警')],
    sizeOverride: { widthMm: 220, heightMm: 140 },
    note: '存疑：警用摩托序号位数未核到明文，如与当地产管不符请用 templates 覆盖',
  },
  emergency: {
    name: '应急救援',
    alias: ['yingjiyingjiu', 'yjy', 'xiaofang', '消防', '森林', 'senlin', '救援'],
    group: '特种车辆',
    kind: 'emergency',
    sample: '京·X1234应急',
    segments: [
      slot('province', 1, '省份简称'),
      slot('emergencyHead', 1, '救援类别（X 消防 / S 森林消防）', { dotBefore: true }),
      slot('serialDigit', 4, '序号'),
      fixed('应急'),
    ],
    note: '格式为「省份·X1234应急」，分隔点在省份之后；X 消防救援、S 森林消防，第二位无字母的为应急管理部用车',
  },
  military: {
    name: '军车',
    alias: ['junche', 'jundui', 'budui', 'jiefangjun', 'jfj', '部队'],
    group: '特种车辆',
    kind: 'military',
    sample: '军A·12345',
    segments: [
      slot('militaryHead', 1, '军种字头'),
      slot('areaLetter', 1, '序列字母'),
      slot('serial', 5, '序号', { dotBefore: true }),
    ],
    note: '存疑：2012 式军牌序号位数与字母规则未核到明文',
  },
  armedPolice: {
    name: '武警',
    alias: ['wujing', 'wj', 'wuzhuang', '武装', 'neiwu'],
    group: '特种车辆',
    kind: 'armedPolice',
    sample: 'WJ·N0001',
    segments: [
      fixed('WJ'),
      slot('areaLetter', 1, '序列字母', { dotBefore: true }),
      slot('serialDigit', 4, '序号'),
    ],
    note: '存疑：WJ 字头 + 字母 + 4 位数字，白底红 WJ 黑字',
  },
  embassy: {
    name: '使馆汽车',
    alias: ['shiguanqiche', 'sgqc', 'shiguan', '使馆', 'waitiao', '外交'],
    group: '使领馆与出入境',
    kind: 'diplomatic',
    sample: '使123456',
    segments: [fixed('使'), slot('serialDigit', 6, '编号')],
    note: '使字头黑底牌，编号 6 位（使 / 领 字着色各来源冲突，见 PLATE_MARK_COLORS 说明）',
  },
  consulate: {
    name: '领馆汽车',
    alias: ['lingguanqiche', 'lgqc', 'lingguan', '领馆', 'lingshi'],
    group: '使领馆与出入境',
    kind: 'diplomatic',
    sample: '粤A·1234领',
    segments: [...head(), slot('serialDigit', 4, '序号', { dotBefore: true }), fixed('领')],
    note: '存疑：领馆牌编号位数未核到明文',
  },
  hkmc: {
    name: '港澳入出境',
    alias: ['gangaoruchujing', 'gangao', 'gg', '港澳', '粤z', 'yuez'],
    group: '使领馆与出入境',
    kind: 'diplomatic',
    sample: '粤Z·1234港',
    segments: [fixed('粤Z'), slot('serialDigit', 4, '序号', { dotBefore: true }), slot('portFlag', 1, '通行地')],
    note: '粤Z 为港澳入出境专用代号，末位「港 / 澳」二选一',
  },
}

/** 带 type 字段的选项，供类型选择器渲染 */
export type PlateTypeOption = PlateTypeMeta & { type: PlateType }

/**
 * 类型屏默认序（小的在前）：按「表单里真会遇到这块牌的频率」而非分组排，让首屏前两行盖住绝大多数录入。
 * 量级依据公安部 2026-06 底通报与行业统计：汽车 3.71 亿里载客约占 80%（其中小型 96%），
 * 新能源 4897 万且已占当年新注册汽车的 49%，摩托车约 1 亿但限摩城市录入少，载货汽车约占汽车 11%，
 * 挂车数百万、教练车约 80 万、港澳备案车约 20 万，警用 / 应急 / 使领 / 军警牌都在十万量级以下且不公开。
 * 9 名往后都是罕见牌，次序按民用场景能见度判，差别不大；驾校 / 物流园 / 口岸这类场景差异大的业务，
 * 传 types 时按传入顺序摆。
 */
const TYPE_USAGE_RANK: Record<PlateType, number> = {
  car: 1,
  neSmall: 2,
  motorcycle: 3,
  large: 4,
  neLarge: 5,
  trailer: 6,
  lowSpeed: 7,
  coach: 8,
  police: 9,
  hkmc: 10,
  emergency: 11,
  policeMotor: 12,
  embassy: 13,
  consulate: 14,
  military: 15,
  armedPolice: 16,
}

/** 类型选择器用的有序列表：按使用频率排，频率相同时保持声明顺序 */
export const PLATE_TYPE_LIST: PlateTypeOption[] = (Object.keys(PLATE_TYPES) as PlateType[])
  .sort((a, b) => TYPE_USAGE_RANK[a] - TYPE_USAGE_RANK[b])
  .map((type) => ({ ...PLATE_TYPES[type], type }))

/** 取模板，允许业务侧覆盖（标准存疑项在当地产管口径不一致时用得上） */
export function getSegments(type: PlateType, overrides?: Partial<Record<PlateType, PlateSegment[]>>): PlateSegment[] {
  return overrides?.[type] ?? PLATE_TYPES[type].segments
}
