/**
 * 无 React 依赖的核心层：规格、种类、模板、解析、单元格、键盘、校验、搜索、字库
 * 单独暴露成 remons-license-plate/core，业务只想识别号牌时不必把组件和样式一起拖进包
 */
export * from './spec'
export * from './kinds'
export * from './templates'
export * from './parse'
export * from './cells'
export * from './keyboard'
export * from './validate'
export * from './search'
export * from './font'
