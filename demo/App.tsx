import { useState } from 'react'
import { PLATE_KINDS, PLATE_TYPE_GROUPS, PLATE_TYPE_LIST, PlateBadge, PlateInput, parsePlate } from '../src'
import type { PlateType } from '../src'

/** 一批各种形态的号牌串，用来看识别结果 */
const SAMPLE_PLATES = [
  '粤B12345',
  '京A88888',
  '粤B·D12345',
  '京A12345D',
  '沪C1D2345',
  '粤B5678挂',
  '京A1234学',
  '京A1234警',
  '京·X1234应急',
  '军A12345',
  'WJN0001',
  '使123456',
  '粤A1234领',
  '粤Z1234港',
  '渝S5678应急',
  '粤B1234',
  'AB12CD3',
]

/** 接口下发的几种号牌，用来看「只给类型 + 车牌串」能不能编辑对 */
const EDIT_CASES: { label: string; plate: string; type: PlateType }[] = [
  { label: '警车', plate: '京A1234警', type: 'police' },
  { label: '小型新能源', plate: '粤B·D12345', type: 'neSmall' },
  { label: '挂车', plate: '粤B·5678挂', type: 'trailer' },
  { label: '港澳入出境', plate: '粤Z·1234港', type: 'hkmc' },
]

interface ILog {
  plate: string
  type: PlateType
  from: string
}

function App(): JSX.Element {
  const [logs, setLogs] = useState<ILog[]>([])
  const [carPlate, setCarPlate] = useState('')
  const [quick, setQuick] = useState('粤B12345')
  const [fixed, setFixed] = useState<{ plate: string; type: PlateType }>({ plate: '京A1234警', type: 'police' })
  // 外壳主题开关：验证不依赖系统设置也能切黑（包内部同时跟随 prefers-color-scheme）
  const [dark, setDark] = useState(false)
  // 字库开关：默认走包内字库，开了走 CDN（注入一条同名 @font-face 把包内那条替掉）
  const [cdn, setCdn] = useState(false)

  const push = (from: string) => (plate: string, type: PlateType): void => {
    setLogs((prev) => [{ plate, type, from }, ...prev].slice(0, 8))
  }

  return (
    <div className={`demo${dark ? ' demo--dark' : ''}`}>
      <h1 className="demo__title">remons-license-plate</h1>
      <p className="demo__desc">
        移动端号牌输入器 demo。键盘全部自绘，不会唤起系统输入法；牌面尺寸按 GA 36-2018 的 mm 规格等比换算。
      </p>
      <div className="demo__switches">
        <button type="button" className="demo__switch" onClick={() => setDark((v) => !v)}>
          外壳主题：{dark ? '深色' : '浅色'}
        </button>
        <button type="button" className="demo__switch" onClick={() => setCdn((v) => !v)}>
          字库：{cdn ? 'CDN' : '包内'}
        </button>
      </div>

      <section className="demo__card">
        <h2 className="demo__h">1. 全类型录入（第一屏选类型，第二屏逐格点选）</h2>
        <PlateInput
          title="车牌号"
          placeholder="点击输入车牌号"
          dark={dark}
          cdn={cdn}
          onChange={push('onChange')}
          onConfirm={push('onConfirm')}
        />
        <p className="demo__tip">
          16 种类型全开。类型屏顶部有本地搜索（警车 / jc / 新能源 都能命中），点卡片直接进录入；
          示例、格子、键盘在录入屏同屏看完。这里没传 value，所以是非受控 —— 关掉抽屉再开，刚才输的还在。
        </p>
      </section>

      <section className="demo__card">
        <h2 className="demo__h">2. 已知类型，输满自动收起</h2>
        <PlateInput
          defaultType="car"
          value={quick}
          autoConfirm
          lockType
          dark={dark}
          cdn={cdn}
          onChange={(p) => setQuick(p)}
          onConfirm={(p) => {
            setQuick(p)
            push('autoConfirm')(p, 'car')
          }}
        />
        <p className="demo__tip">
          当前值：{quick || '（空）'}；lockType 后抽屉里不再提供「重选」。
        </p>
      </section>

      <section className="demo__card">
        <h2 className="demo__h">3. 业务白名单（只放开四种）</h2>
        <PlateInput
          types={['car', 'neSmall', 'neLarge', 'large']}
          onConfirm={push('白名单')}
          value={carPlate}
          dark={dark}
          cdn={cdn}
          onChange={setCarPlate}
        />
        <p className="demo__tip">挪车这类场景只放开乘用车，避免用户翻到军牌、使领馆牌。</p>
      </section>

      <section className="demo__card">
        <h2 className="demo__h">4. 编辑接口下发的数据（只传车牌和类型）</h2>
        <PlateInput
          type={fixed.type}
          value={fixed.plate}
          dark={dark}
          cdn={cdn}
          onChange={(p) => setFixed((prev) => ({ ...prev, plate: p }))}
          onConfirm={(p, t) => {
            setFixed({ plate: p, type: t })
            push('编辑保存')(p, t)
          }}
        />
        <div className="demo__switches">
          {EDIT_CASES.map((c) => (
            <button
              type="button"
              className="demo__switch"
              key={c.label}
              onClick={() => setFixed({ plate: c.plate, type: c.type })}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="demo__tip">
          两个字段就够：type 定模板（位数、固定段、键盘），value 是完整号牌串，带不带「·」都行。
          打开时按模板回填，光标落在第一个空格；在外部换车（类型和车牌一起改）也会跟着重排。
          要锁住类型再传 lockType。
        </p>
      </section>

      <section className="demo__card">
        <h2 className="demo__h">回调</h2>
        {!logs.length ? <p className="demo__tip">还没有输入</p> : null}
        <ul className="demo__logs">
          {logs.map((l, i) => (
            <li key={`${l.plate}-${i}`}>
              <code>
                {l.from} → {l.plate || '（空）'}
              </code>
              <span className="demo__muted">
                {l.type} / {PLATE_KINDS[parsePlate(l.plate, { type: l.type }).kind].name}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="demo__card">
        <h2 className="demo__h">类型与示例牌面</h2>
        {PLATE_TYPE_GROUPS.map((group) => (
          <div className="demo__group" key={group}>
            <div className="demo__muted">{group}</div>
            {PLATE_TYPE_LIST.filter((o) => o.group === group).map((o) => (
              <div className="demo__row" key={o.type}>
                <PlateBadge value={o.sample} type={o.type} height={34} />
                <span className="demo__name">
                  {o.name}
                  <em>{o.type}</em>
                </span>
              </div>
            ))}
          </div>
        ))}
      </section>

      <section className="demo__card">
        <h2 className="demo__h">仅凭号牌串的识别结果</h2>
        {SAMPLE_PLATES.map((raw) => {
          const p = parsePlate(raw)
          return (
            <div className="demo__row" key={raw}>
              <PlateBadge value={raw} height={30} />
              <span className="demo__name">
                {PLATE_KINDS[p.kind].name}
                <em>{p.exact ? '确定' : `不确定：${p.reason}`}</em>
              </span>
            </div>
          )
        })}
      </section>
    </div>
  )
}

export default App
