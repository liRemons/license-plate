/**
 * remons-license-plate
 *
 * 三条边界：
 * - core（也单独暴露成 remons-license-plate/core）：纯 TS，号牌规格 / 模板 / 解析 / 校验 / 键盘布局 / 类型搜索
 * - PlateBadge：只读展示，按 GA 36-2018 的 mm 规格等比换算
 * - PlateInput：移动端输入器，第一屏选类型（带本地搜索），第二屏逐格点选；
 *   号牌录入不调起系统输入法，只有类型搜索框走系统输入法
 *
 * 样式需要业务方自己引：import 'remons-license-plate/style.css'
 */
export * from './core'
export { PlateBadge } from './components/PlateBadge'
export type { PlateBadgeProps } from './components/PlateBadge'
export { PlateBoard } from './components/PlateBoard'
export type { PlateBoardProps } from './components/PlateBoard'
export { PlateKeyboard } from './components/PlateKeyboard'
export type { PlateKeyboardProps } from './components/PlateKeyboard'
export { PlateTypePicker } from './components/PlateTypePicker'
export type { PlateTypePickerProps } from './components/PlateTypePicker'
export { PlateInput } from './components/PlateInput'
export type { PlateInputProps } from './components/PlateInput'
export { usePlateDraft } from './hooks/usePlateDraft'
export type { PlateDraft, CursorPosition } from './hooks/usePlateDraft'
export { usePlateFont } from './hooks/usePlateFont'
export type { PlateFontProps } from './hooks/usePlateFont'
