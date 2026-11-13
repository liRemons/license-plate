// 样式由构建工具处理，TS 只需要认得这些模块的形状
// 放在 src/ 下而不是项目根：生成 .d.ts 的程序只吃 src，声明在根目录会漏掉，
// 于是 side-effect import 报 TS2882「找不到类型声明」
declare module '*.less' {
  const css: string
  export default css
}

declare module '*.css' {
  const css: string
  export default css
}
