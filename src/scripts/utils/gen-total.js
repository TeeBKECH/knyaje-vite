// generator-total.js
export function initGeneratorTotal({
  selectEl, // CSS-селектор или элемент корня кастомного select
  counterEl, // CSS-селектор или элемент корня counter
  outEl, // CSS-селектор или элемент вывода (span.generator-form__total-count)
  uppercase = true, // делать ли label верхним регистром
  dash = ' – ', // разделитель между числом и названием
  defaultCount = 1, // если counter отсутствует — какое число подставлять
} = {}) {
  const selectRoot =
    typeof selectEl === 'string' ? document.querySelector(selectEl) : selectEl || null
  const counterRoot =
    typeof counterEl === 'string' ? document.querySelector(counterEl) : counterEl || null
  const out = typeof outEl === 'string' ? document.querySelector(outEl) : outEl || null

  if (!out) return { destroy: () => {} }

  const getCount = () => {
    if (!counterRoot) return null
    const input = counterRoot.querySelector('[data-ref="value-input"]')
    if (input) return Number(input.value) || 0
    const hidden = counterRoot.querySelector('[data-ref="hidden"]')
    if (hidden) return Number(hidden.value) || 0
    const span = counterRoot.querySelector('[data-ref="value"]')
    if (span) return Number(span.textContent.trim()) || 0
    return null
  }

  const getLabel = () => {
    if (!selectRoot) return ''
    // для нашего кастомного select лейбл всегда есть в [data-ref="value"]
    const valueEl = selectRoot.querySelector('[data-ref="value"]')
    if (valueEl) return valueEl.textContent.trim()
    return ''
  }

  const format = (count, label) => {
    const lbl = uppercase ? (label || '').toUpperCase() : label || ''
    return `${count}${dash}${lbl}`.trim()
  }

  const render = (count, label) => {
    out.textContent = format(count, label)
  }

  const refresh = () => {
    const count = getCount()
    const label = getLabel()
    render(count ?? defaultCount, label)
  }

  const onSelectChange = (e) => {
    const label = (e.detail?.labels && e.detail.labels[0]) || getLabel()
    const count = getCount() ?? defaultCount
    render(count, label)
  }

  const onCounterChange = (e) => {
    const count = Number(e.detail?.value)
    const safeCount = Number.isFinite(count) ? count : (getCount() ?? defaultCount)
    const label = getLabel()
    render(safeCount, label)
  }

  if (selectRoot) selectRoot.addEventListener('select:change', onSelectChange)
  if (counterRoot) counterRoot.addEventListener('counter:change', onCounterChange)

  // начальная отрисовка
  refresh()

  return {
    destroy() {
      if (selectRoot) selectRoot.removeEventListener('select:change', onSelectChange)
      if (counterRoot) counterRoot.removeEventListener('counter:change', onCounterChange)
    },
  }
}
