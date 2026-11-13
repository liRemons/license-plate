/**
 * 号牌物理规格（GA 36-2018 的 mm 尺寸）
 *
 * 组件不做绝对像素布局：这里只留标准明文规定的外廓，字符高、间隙、笔画这些 mm 数值
 * 唯一的实现处在 styles/plate.less 的 --rlp-*-mm 变量上，由 --rlp-height 统一等比缩放，
 * 这样业务方只改一个变量就能整体缩放号牌，不必回头同步这里的换算函数。
 */

/** 外廓尺寸：标准明文规定的部分 */
export interface PlateSize {
  /** 宽（mm） */
  widthMm: number
  /** 高（mm） */
  heightMm: number
}
