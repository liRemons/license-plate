import { PLATE_KINDS } from './kinds'
import { PLATE_TYPE_LIST } from './templates'
import type { PlateTypeOption } from './templates'

/**
 * 类型选择的本地搜索
 *
 * 16 种类型在 390px 宽的屏上要翻好几屏，而用户通常一开始就知道自己要哪一种，
 * 打「警车」「jc」「新能源」就该到位。所以搜索整个跑在本地：
 * 词表就是类型元数据本身（名称、分组、种类、alias 里的拼音全拼与首字母缩写），
 * 不引分词库、不发请求，包体只多 templates 里那 16 行 alias。
 */

/** 归一化：小写、去空白与分隔点、全角转半角 */
export function normalizeQuery(raw: string): string {
  return String(raw ?? '')
    .toLowerCase()
    .replace(/[\s·・.．\-_]+/g, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}

/** 一个类型的可搜文本，各字段拼成一条串 */
function haystack(option: PlateTypeOption): string {
  return [
    option.name,
    option.type ?? '',
    option.group,
    PLATE_KINDS[option.kind]?.name ?? '',
    // note 不参与：那是写给人看格式来源的说明（还带「存疑」），拿它当搜索词会让
    // 大型汽车因为注记里的「半挂牵引车」串进挂车的搜索结果
    ...(option.alias ?? []),
  ]
    .map(normalizeQuery)
    .join('|')
}

/**
 * 命中等级，越小越靠前：名称前缀 &gt; 名称包含 &gt; 其它字段命中
 * 输入「新」时要看到小型 / 大型新能源排在最前，而不是某个 note 里恰好带「新」的类型
 */
function rank(option: PlateTypeOption, token: string): number {
  const name = normalizeQuery(option.name)
  if (name.startsWith(token)) return 0
  if (name.includes(token)) return 1
  return 2
}

/**
 * 搜类型
 *
 * 多个词按「与」处理（「电动 小型」这类组合能继续收窄）；空输入原样返回，顺序就是列表的使用频率序。
 * @param query 用户输入
 * @param options 候选列表（业务白名单过滤后的结果），默认全部类型
 */
export function searchPlateTypes(
  query: string,
  options: PlateTypeOption[] = PLATE_TYPE_LIST,
): PlateTypeOption[] {
  const tokens = String(query ?? '')
    .split(/[\s·・.．\-_]+/)
    .map(normalizeQuery)
    .filter(Boolean)
  if (!tokens.length) return options

  const hits: { option: PlateTypeOption; score: number }[] = []
  for (const option of options) {
    const text = haystack(option)
    let matched = true
    let score = 0
    for (const token of tokens) {
      if (!text.includes(token)) {
        matched = false
        break
      }
      score = Math.max(score, rank(option, token))
    }
    if (matched) hits.push({ option, score })
  }
  // 同分维持原顺序（Array.prototype.sort 在现代引擎里是稳定的），使用频率序不被打散
  return hits.sort((a, b) => a.score - b.score).map((h) => h.option)
}
