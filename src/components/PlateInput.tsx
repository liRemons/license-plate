import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { normalizePlate, parsePlate } from '../core/parse'
import { PLATE_KINDS } from '../core/kinds'
import { segmentHint } from '../core/keyboard'
import { PLATE_TYPES } from '../core/templates'
import type { PlateSegment, PlateType } from '../core/templates'
import { usePlateDraft } from '../hooks/usePlateDraft'
import { usePlateFont } from '../hooks/usePlateFont'
import type { PlateFontProps } from '../hooks/usePlateFont'
import { PlateBadge } from './PlateBadge'
import { PlateBoard } from './PlateBoard'
import { PlateKeyboard } from './PlateKeyboard'
import { PlateTypePicker } from './PlateTypePicker'
import '../styles/sheet.less'

export interface PlateInputProps extends PlateFontProps {
  /** 受控值：完整号牌串（可带「·」） */
  value?: string
  /** 非受控初始值 */
  defaultValue?: string
  /** 受控的车辆 / 号牌类型 */
  type?: PlateType
  /** 初始类型；传了就直接进输入步，不传先让用户选类型 */
  defaultType?: PlateType
  /** 业务白名单里的可选类型，默认全部 16 种；传了则按数组顺序展示（不传时类型屏按使用频率排） */
  types?: PlateType[]
  /** 覆盖内置模板（当地产管口径与本包存疑项不一致时用） */
  templates?: Partial<Record<PlateType, PlateSegment[]>>
  placeholder?: string
  title?: string
  /** 键盘右下角确认键的文案 */
  okText?: string
  /** 锁定类型：抽屉里不给「重选」入口 */
  lockType?: boolean
  disabled?: boolean
  /**
   * 强制外壳深色。不传则跟随系统 prefers-color-scheme；
   * 宿主自己用 class 切主题时，也可以直接在祖先上加 .rlp-dark
   */
  dark?: boolean
  /** 展示徽标的渲染高度（触发字段里那块牌） */
  height?: number
  /** 输满且校验通过就自动收起并回调 onConfirm，适合挪车、停车缴费这类一步录入 */
  autoConfirm?: boolean
  /** 每次按键后回调，值可能是没填满的半串，别直接当合法号牌提交 */
  onChange?: (plate: string, type: PlateType) => void
  /** 校验通过并确认时回调 */
  onConfirm?: (plate: string, type: PlateType) => void
  /** 没提交就关掉时抛（点遮罩，或类型屏点关闭） */
  onCancel?: () => void
  className?: string
  style?: React.CSSProperties
}

type Step = 'type' | 'input'

/**
 * 移动端号牌输入器
 *
 * 分两屏：第一屏选车辆类型（带本地搜索），第二屏录入。
 * 第二屏把示例、牌面格、键盘（含完成按钮）堆在一屏内，不用再下滑找输入入口。
 *
 * 号牌录入全程自绘键盘，不出现 input/textarea，所以不会唤起系统输入法 ——
 * 号牌里的「粤」「警」这类字要切中文输入法才打得出，而输入法又拦不住 I、O，
 * 只能把输入面整个接管过来。（类型搜索框是唯一的例外，那里要打的本来就是汉字与拼音。）
 */
function PlateInput({
  value,
  defaultValue,
  type: propType,
  defaultType,
  types,
  templates,
  placeholder = '输入车牌号',
  title = '车牌号',
  okText = '完成',
  lockType = false,
  disabled = false,
  dark = false,
  height = 34,
  autoConfirm = false,
  cdn,
  fontUrl,
  onChange,
  onConfirm,
  onCancel,
  className,
  style,
}: PlateInputProps): JSX.Element {
  const outerType = propType ?? defaultType
  // 抽屉里的输入格与牌面读同一份字库，在这里下发一次就够
  usePlateFont({ cdn, fontUrl })
  const [open, setOpen] = useState(false)
  const [innerType, setInnerType] = useState<PlateType | undefined>(outerType)
  const [step, setStep] = useState<Step>(outerType ? 'input' : 'type')
  const [showIssue, setShowIssue] = useState(false)

  // hook 必须无条件调用，未选类型时先挂在 car 模板上，此时 step 仍是 type，草稿不参与渲染
  const draft = usePlateDraft(innerType ?? 'car', templates)

  // 受控值由业务持有，开抽屉时以它为准；非受控时草稿归组件自己保管，
  // 重开不能把刚才输的内容抹掉（换类型也不抹，只把能对上位置的按位搬过去）
  const seed = useMemo(() => normalizePlate(value ?? defaultValue ?? ''), [value, defaultValue])
  const applyRef = useRef(draft.applyPlate)
  applyRef.current = draft.applyPlate
  // seed 只通过 ref 读、不进依赖：受控值每键都变，把它当回填时机会在输入中途把光标抢走
  const seedRef = useRef(seed)
  seedRef.current = seed
  const seeded = useRef(false)
  const lastType = useRef<PlateType | undefined>(undefined)
  // 「重选」时手上那串得先留住：换类型后段数变了，草稿会在渲染期被整副重算，
  // 到 effect 里再读 draft.plate 已经是空串了
  const carry = useRef('')
  useEffect(() => {
    if (!open || !innerType) return
    const typeChanged = lastType.current !== innerType
    lastType.current = innerType
    // 用户在抽屉里换了类型 → 把他刚填的那串按位搬过来；业务侧换车（type + value 一起变）→ 以业务值为真相
    const raw = typeChanged && carry.current ? carry.current : seedRef.current
    carry.current = ''
    if (value === undefined && seeded.current && !typeChanged) return
    seeded.current = true
    applyRef.current(raw)
    setShowIssue(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, innerType])

  // 业务侧改 type（比如列表里切了另一辆车）时，抽屉里的模板要跟着换；
  // 不然两个字段看起来都是受控，实际只有一个跟得上
  useEffect(() => {
    if (propType && propType !== innerType) {
      setInnerType(propType)
      setStep('input')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propType])

  // 实时把草稿抛给业务侧（用于预览、按钮是否可点），未打开时不刷
  const lastPlate = useRef<string | null>(null)
  const changeRef = useRef(onChange)
  changeRef.current = onChange
  useEffect(() => {
    if (!open || !innerType) return
    if (lastPlate.current === draft.plate) return
    lastPlate.current = draft.plate
    changeRef.current?.(draft.plate, innerType)
  }, [draft.plate, draft.type, innerType, open])

  // 弹层出现时锁背景滚动，否则抽屉底下页面会跟着手指一起滑
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    lastPlate.current = null
  }, [])

  const confirm = useCallback(() => {
    if (!innerType) return
    onConfirm?.(draft.plate, innerType)
    close()
  }, [innerType, draft.plate, onConfirm, close])

  // 输满即走：挪车这类场景少一次点击
  const completeRef = useRef(confirm)
  completeRef.current = confirm
  useEffect(() => {
    if (open && autoConfirm && draft.validation.valid) completeRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoConfirm, draft.validation.valid])

  const handleOk = useCallback(() => {
    if (draft.validation.valid) {
      confirm()
      return
    }
    // 没填满也允许点，点了要明确告诉用户差在哪
    setShowIssue(true)
  }, [draft.validation.valid, confirm])

  const currentSegment = draft.cursor ? draft.segments[draft.cursor.segmentIndex] : undefined
  const issueText = useMemo(() => {
    if (!showIssue) return ''
    return draft.validation.issues[0]?.message ?? ''
  }, [showIssue, draft.validation.issues])

  const shownPlate = value !== undefined ? normalizePlate(value) : draft.plate
  // 业务侧没给 type 时只能自己判，判不准（比如 7 位普通牌分不清蓝黄）就不贴标签，
  // 宁可少一个标签也不能贴错
  const inferred = shownPlate && !innerType && !propType ? parsePlate(shownPlate) : null
  const shownType = innerType ?? propType ?? (inferred && inferred.exact ? inferred.type : undefined)
  const darkCls = dark ? ' rlp-dark' : ''

  return (
    <>
      <button
        type="button"
        className={`rlp-trigger${darkCls}${className ? ` ${className}` : ''}`}
        style={style}
        disabled={disabled}
        aria-label={title}
        onClick={() => {
          if (disabled) return
          setStep(innerType ? 'input' : 'type')
          setOpen(true)
        }}
      >
        {shownPlate ? (
          <PlateBadge value={shownPlate} type={shownType} height={height} />
        ) : (
          <span className="rlp-trigger__hint">{placeholder}</span>
        )}
        {shownType && !lockType ? <span className="rlp-trigger__tag">{PLATE_TYPES[shownType].name}</span> : null}
      </button>

      {open ? (
        <>
          <div className={`rlp-mask${darkCls}`} onClick={() => { onCancel?.(); close() }} />
          {/* 抽屉高度由样式钉住（.rlp-sheet），两屏共用一个外框尺寸：
              类型屏搜索、录入屏换键盘都不会把整块牌面顶得上下抖 */}
          <div className={`rlp-sheet${darkCls}`} role="dialog" aria-modal="true" aria-label={title}>
            <div className="rlp-sheet__hd">
              <span className="rlp-sheet__acts">
                {step === 'input' && !lockType ? (
                  <button
                    type="button"
                    className="rlp-sheet__back"
                    onClick={() => setStep('type')}
                  >
                    重选
                  </button>
                ) : null}
                {step === 'input' ? (
                  <button
                    type="button"
                    className="rlp-sheet__clear"
                    onClick={draft.clearAll}
                    disabled={draft.filledCount === 0}
                  >
                    清空
                  </button>
                ) : null}
              </span>
              <span className="rlp-sheet__title">
                {step === 'type' ? '选择车辆类型' : PLATE_TYPES[innerType ?? 'car'].name}
              </span>
              {/* 完成不在这里（它在键盘右栏，填完不用把手抬到屏幕顶），
                  标题栏只留关闭；顺手把清空放这片冷区，离拇指最远 */}
              <button
                type="button"
                className="rlp-sheet__close"
                aria-label="关闭"
                onClick={() => {
                  onCancel?.()
                  close()
                }}
              >
                ×
              </button>
            </div>

            <div className="rlp-sheet__body">
              {step === 'type' ? (
                <PlateTypePicker
                  types={types}
                  value={innerType}
                  onPick={(t) => {
                    // 换类型不等于重填：漏勾新能源这种只差一两位，
                    // 旧模板带出的「警」「港」由 migrateToTemplate 拦住，不会挤进序号格
                    carry.current = draft.plate
                    setInnerType(t)
                    setStep('input')
                  }}
                />
              ) : (
                <>
                  {/* 示例牌面压在输入屏顶部：之前它跟着类型列表放在下面，
                      要下滑才能看到，而真正要填的格子反而在上面 */}
                  {innerType ? (
                    <div className="rlp-sample">
                      <span className="rlp-sample__label">示例</span>
                      <PlateBadge value={PLATE_TYPES[innerType].sample} type={innerType} height={26} />
                      <span className="rlp-sample__note" title={PLATE_TYPES[innerType].note}>
                        {PLATE_KINDS[PLATE_TYPES[innerType].kind].colorSpec}
                        {PLATE_TYPES[innerType].note ? ` · ${PLATE_TYPES[innerType].note}` : ''}
                      </span>
                    </div>
                  ) : null}
                  <PlateBoard
                    cells={draft.cells}
                    segments={draft.segments}
                    values={draft.values}
                    cursorIndex={draft.cursor?.cellIndex ?? 0}
                    badCells={draft.validation.badCells}
                    onFocus={draft.focus}
                  />
                  <div className={`rlp-hint${issueText ? ' rlp-hint--bad' : ''}`}>
                    {/* 出错时只报错；平时说清这一格能按什么（光写个「序号」没人看得懂） */}
                    {issueText || segmentHint(currentSegment) || '按格选择字符'}
                  </div>
                </>
              )}
            </div>

            {step === 'input' && currentSegment?.kind ? (
              <PlateKeyboard
                kind={currentSegment.kind}
                okText={okText}
                okEnabled={draft.validation.complete}
                onKey={draft.input}
                onBackspace={draft.backspace}
                onOk={handleOk}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </>
  )
}

export { PlateInput }
