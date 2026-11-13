# remons-license-plate

中国机动车号牌 React 组件包：号牌种类识别、按 GA 36-2018 / GA 666-2018 规格换算的展示徽标，以及移动端专用号牌输入器（自绘键盘，不调起系统输入法）。

## 功能

1. **三条边界分明**：`core`（纯 TS，无 React 依赖）、`PlateBadge`（只读展示）、`PlateInput`（移动端录入），只用识别能力时不必把组件和样式一起拖进包
2. **覆盖 16 种号牌类型**：乘用车、新能源（大小微型）、货车与专用、警车 / 教练车 / 挂车 / 应急救援 / 军车 / 武警、使领馆与港澳入出境
3. **录入器分两屏**：第一屏选车辆类型（本地搜索，支持汉字、全拼、首字母、口语别称），第二屏把「示例牌面 + 待填格 + 键盘」堆在同一屏，不用下滑找输入入口
4. **输入面被接管**：号牌录入全程没有 `input` / `textarea`，所以唤不起系统输入法 —— 「粤」「警」这类字要切中文输入法才打得出，而输入法拦不住 I、O，只能从源头只摆合法按键。唯一例外是类型搜索框（那里要打的本来就是汉字与拼音）
5. **深色模式**：跟随 `prefers-color-scheme`，也可以强制深色
6. **号牌字库三种来源**：包内自带、CDN、业务自托管
7. **仅面向移动端**：靶尺寸按 44px 下限设计，桌面端只做窄视口调试，不考虑鼠标形态

## 安装

```bash
npm install remons-license-plate
# peer 依赖：react >= 18、react-dom >= 18
```

样式必须自己引一次（库构建把 CSS 抽成独立文件，JS 里不会自动带）：

```tsx
import 'remons-license-plate/style.css'
```

## 快速上手

### 1. 移动端录入（受控）

```tsx
import { useState } from 'react'
import { PlateInput } from 'remons-license-plate'
import type { PlateType } from 'remons-license-plate'
import 'remons-license-plate/style.css'

export function MoveCarForm() {
  const [plate, setPlate] = useState('')
  const [type, setType] = useState<PlateType>('car')

  return (
    <PlateInput
      title="车牌号"
      value={plate}
      type={type}
      // 挪车这类场景只放开乘用车，免得用户翻到军牌
      types={['car', 'neSmall', 'neLarge', 'large']}
      autoConfirm
      onChange={(next) => setPlate(next)}
      onConfirm={(next, t) => {
        setPlate(next)
        setType(t)
      }}
    />
  )
}
```

编辑接口下发的数据只需传**车牌串 + 类型**，组件自己把号码落到格子上：

```tsx
<PlateInput type={order.type} value={order.plate} onChange={...} onConfirm={...} />
```

### 2. 只展示号牌徽标

```tsx
import { PlateBadge } from 'remons-license-plate'

<PlateBadge value="粤B·12345" height={40} />
// 7 位普通牌从号码本身分不清蓝牌还是黄牌，业务侧知道就传 type
<PlateBadge value="粤B12345" type="large" height={40} />
```

### 3. 不要组件，只要识别（无 React 依赖）

```ts
import { parsePlate, PLATE_TYPES, validateSegments } from 'remons-license-plate/core'

const p = parsePlate('粤BD12345')
// p.head '粤B'、p.serial 'D12345'、p.newEnergy true、p.kind 'newEnergySmall'
// p.hasDot 是否需要分隔点、p.mark 尾字标识（警 / 学 / 挂 / 港 / 澳 / 领 / 应急）
// p.exact === false 表示只按位数猜（例如 7 位普通牌），此时应优先采信业务侧的 type
// p.text 归一化串（不含分隔点）、p.reason 识别失败原因（成功时为空）

const v = validateSegments(PLATE_TYPES.neSmall.segments, ['粤', 'B', 'D12345'])
// v.complete 是否填满、v.valid 字符与专项规则是否通过、v.issues 说明、v.badCells 定位到格
```

## PlateInput API

| 属性 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| value | `string` | - | 受控值，完整号牌串（可带 `·`、可全角） |
| defaultValue | `string` | - | 非受控初始值 |
| type | `PlateType` | - | 受控的车辆类型 |
| defaultType | `PlateType` | - | 初始类型；传了直接进录入屏，不传先选类型 |
| types | `PlateType[]` | 全部 16 种 | 业务白名单，限定能选哪些；**传了就按你数组里的顺序展示** |
| templates | `Partial<Record<PlateType, PlateSegment[]>>` | - | 覆盖内置模板（口径不一致时用，见下） |
| lockType | `boolean` | `false` | 锁定类型，抽屉里不给「重选」入口 |
| autoConfirm | `boolean` | `false` | 输满且校验通过就自动收起并回调 `onConfirm` |
| okText | `string` | `'完成'` | 键盘右下角确认键文案 |
| placeholder / title | `string` | `'输入车牌号'` / `'车牌号'` | 触发字段占位文案 / 抽屉与无障碍标题 |
| height | `number` | `34` | 触发字段里那块示例牌的渲染高度 |
| dark | `boolean` | `false` | 强制深色（详见「主题」） |
| disabled | `boolean` | `false` | 禁用触发字段 |
| cdn | `boolean` | - | 字库走 CDN；不传走包内 |
| fontUrl | `string \| string[] \| false` | - | 自托管地址，优先级高于 `cdn`；传 `false` 撤销覆盖 |
| onChange | `(plate, type) => void` | - | 每次按键后回调，**可能是没填满的半串，别直接当合法号牌提交** |
| onConfirm | `(plate, type) => void` | - | 校验通过并确认时回调 |
| onCancel | `() => void` | - | 没提交就关掉时回调（点遮罩或类型屏点关闭） |
| className / style | - | - | 加在触发字段上 |

## PlateBadge API

| 属性 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| value | `string` | 必填 | 号牌串，内部会归一化（去空格与 `·`、全角转半角） |
| type | `PlateType` | 自动识别 | 传了就以它为准；判不准的位数会回落中性虚线框而不是乱猜颜色 |
| height | `number` | `48` | 渲染高度 px，宽度、字号、间距按标准 mm 比例跟着换算 |
| cdn / fontUrl | 同上 | - | 号牌字库来源 |
| className / style | - | - | - |

尺寸的换算全在 CSS 里：`PlateBadge` 只把外廓 mm 写成 `--rlp-width-mm` / `--rlp-height-mm`，`styles/plate.less` 再用 `--rlp-scale = 渲染高度 / 外廓高` 推出字符高（70mm）、字符间隙（12mm）、分隔点间隙（34mm）这些。想单独微调某一项，覆盖对应的 `--rlp-*-mm` 变量即可；core 层不提供 mm→px 的换算函数。

## 主题

三层入口，按需要选一层：

1. 什么都不传 —— 跟随系统 `prefers-color-scheme`
2. 给 `<PlateInput dark>` —— 组件自己强制深色
3. 宿主已经用 class 切主题 —— 直接给祖先加 `.rlp-dark`，包内的触发字段、遮罩、抽屉都跟着变

当前只能强制深色，**没有「系统深色下仍强制浅色」的开关**；需要的话在业务侧给外壳祖先加浅色 token 覆盖。

## 号牌字库

牌面上的号码走专用号牌字体（`LicensePlate`），三种来源按优先级 `fontUrl` > `cdn` > 包内：

```tsx
<PlateBadge value="粤B12345" cdn />                                   // 用 CDN，不占业务打包体积
<PlateBadge value="粤B12345" fontUrl="/fonts/my-license.woff2" />      // 自托管
import { setPlateFont } from 'remons-license-plate/core'              // 不给 props 时也能全局切
setPlateFont({ url: ['/a.woff2', '/a.woff'], family: 'MyPlate' })
```

- 默认（都不传）用包内 `dist/fonts/license-plate.woff2|woff|ttf`，CSS 里是相对地址（`src:url("./fonts/license-plate.woff2")format("woff2"),...`），需要打包器能重写 `node_modules/remons-license-plate/dist/index.css` 里的这些 `url`；webpack / vite 都可以，配不了字体加载时改传 `cdn`
- 分隔点由 CSS 绘制，不吃文本里的 `·`；`警` `学` `挂` `应急` 这类真牌上的红字单独着红

## 支持的号牌类型

下表顺序就是类型屏的默认顺序 —— 按「表单里真会遇到这块牌的频率」而非分组排，所以前两行（小型汽车、小型新能源、摩托车、大型汽车）就盖住了绝大多数录入。频率量级参考公安部 2026 年中通报（汽车 3.71 亿、新能源 4897 万且已占当年新注册汽车 49%、摩托车约 1 亿）与行业统计，具体口径见 `core/templates.ts` 的 `TYPE_USAGE_RANK` 注释。分组只是卡片右下角的副标题，不参与排序；业务场景差异大（驾校、物流园、口岸）时用 `types` 白名单自定义顺序。

| type | 名称 | 分组 | 示例 | 模板段 |
| --- | --- | --- | --- | --- |
| `car` | 小型汽车 | 乘用车 | 粤B·12345 | 省份 + 字母 + 序号 5 |
| `neSmall` | 小型新能源 | 新能源 | 粤B·D12345 | 省份 + 字母 + 序号 6（字母在首/次位） |
| `motorcycle` | 摩托车 | 乘用车 | 京A·12345 | 省份 + 字母 + 序号 5 |
| `large` | 大型汽车 | 货车与专用 | 京A·88888 | 省份 + 字母 + 序号 5 |
| `neLarge` | 大型新能源 | 新能源 | 京A·12345D | 省份 + 字母 + 序号 6（末位 D/F） |
| `trailer` | 挂车 | 货车与专用 | 粤B·5678挂 | 省份 + 字母 + 数字 4 + 固定「挂」 |
| `lowSpeed` | 低速货车 | 乘用车 | 京A·12345 | 省份 + 字母 + 序号 5 |
| `coach` | 教练车 | 货车与专用 | 粤B·1234学 | 省份 + 字母 + 数字 4 + 固定「学」 |
| `police` | 警车 | 特种车辆 | 京A·1234警 | 省份 + 字母 + 数字 4 + 固定「警」 |
| `hkmc` | 港澳入出境 | 使领馆与出入境 | 粤Z·1234港 | 固定「粤Z」+ 数字 4 + 港/澳 |
| `emergency` | 应急救援 | 特种车辆 | 京·X1234应急 | 省份 + X/S + 数字 4 + 固定「应急」 |
| `policeMotor` | 警用摩托车 | 特种车辆 | 京A·123警 | 省份 + 字母 + 数字 3 + 固定「警」 |
| `embassy` | 使馆汽车 | 使领馆与出入境 | 使123456 | 固定「使」+ 数字 6 |
| `consulate` | 领馆汽车 | 使领馆与出入境 | 粤A·1234领 | 省份 + 字母 + 数字 4 + 固定「领」 |
| `military` | 军车 | 特种车辆 | 军A·12345 | 军种字头 + 字母 + 序号 5 |
| `armedPolice` | 武警 | 特种车辆 | WJ·N0001 | 固定「WJ」+ 字母 + 数字 4 |

## 模板覆盖

`PLATE_TYPES[type].segments` 是内置模板，当地产管口径不一致时用 `templates` 整副换掉：

```tsx
import type { PlateSegment, PlateType } from 'remons-license-plate'

const policeMotor: PlateSegment[] = [
  { role: 'slot', kind: 'province', length: 1, label: '省份简称' },
  { role: 'slot', kind: 'areaLetter', length: 1, label: '发牌机关代号' },
  { role: 'slot', kind: 'serialDigit', length: 4, label: '序号', dotBefore: true },
  { role: 'fixed', text: '警', length: 1 },
]

<PlateInput defaultType="policeMotor" templates={{ policeMotor }} />
```

- `role: 'slot'` 可编辑，`kind` 决定这一格能按哪些键；`role: 'fixed'` 只读，直接印在上面
- `dotBefore` 控制本段之前那个分隔点（发牌机关代号与序号之间）
- 换类型时不会把已填的内容整副清空：`migrateToTemplate` 逐格按目标槽位字符集搬，撞第一个不收的字符就截断（漏勾新能源这种只差一两位的，只需补差的那几位）

## 键盘与交互

1. 键盘按键集合由光标所在槽位决定：省份 31 键宫格、字母区不含 I、O、纯数字槽位一行 5 键（数字一律一行 5 个，10 个一行只剩 26px 宽不好按）
2. 功能键排布：删除占右下角（系统键盘退格的位置），完成在其上方并撑满右栏剩余高度；**清空不放在键盘上** —— 它一次毁掉整串，挪到抽屉标题栏左侧冷区，空盘时禁用
3. 牌面与键盘之间那行提示说清「这一格能按什么」（位数、哪个位置要字母、I・O 不参与），填错了换成红色校验文案
4. 抽屉高度由样式钉住（`min(92dvh, 600px)`），搜索收窄、换键盘都不抖；多出的高度归中间滚动区，键行始终贴底
5. 未填满时点完成不关闭，提示还差几位；点遮罩等价于取消并触发 `onCancel`

## 已知存疑

下列项目前未从 GA 36-2018 正文核到明文，或与当地产管口径可能有差异，接入前先对齐，必要时用 `templates` 覆盖。1-5 在源码里以 `PLATE_TYPES[type].note` 开头写「存疑」标出（推导依据也在 note 里），6-7 属于视觉取值取舍：

1. `motorcycle`：外廓前牌 220×95、后牌 220×140，本包按后牌单排渲染
2. `policeMotor`：序号位数
3. `military`：2012 式序号位数与字母规则；框线色与外廓尺寸暂按汽车牌
4. `armedPolice`：WJ 字头 + 字母 + 4 位数字的排布；框线色与尺寸同上
5. `consulate`：编号位数
6. `embassy` / `consulate`：「使」「领」字着色各来源冲突
7. 新能源绿：GA 666-2018 的解读里比漆膜绿更浅、接近碧绿，本包取偏黄绿一档（`#5cb451`），让相邻的黄底不至于一个荧光一个深绿

## 本地开发

```bash
npm run dev        # demo 页（移动端视口调试）
npm run build      # dist/：index.js / index.cjs / core.js / index.css / fonts（含字库后处理）
npm run typecheck  # tsc --noEmit
npm test           # = typecheck + build
npm run build:demo && npm run preview
```

本包没有单测，core 层的规则正确性靠 demo 页 + 下方产物清单人工核对。

### 发布前核对产物

`build` 成功不等于产物正确：字库那步是独立的后处理脚本（`scripts/post-build.mjs`），vite 的 lib 模式会把 CSS 引的资源整份 base64 内联进来，少了这一步只会得到一个 5.5 MB 的 CSS，不会报错。

```bash
stat -c "%n %s" dist/index.css            # 15 kB 量级；几 MB 就是 base64 没还原
ls dist/fonts                             # license-plate.{ttf,woff,woff2}
grep -o "@font-face{[^}]*}" dist/index.css # src 应是 url("./fonts/...")，不含 base64
```

## 许可

[MIT](./LICENSE)
