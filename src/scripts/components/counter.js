export class Counter {
  constructor(root, config = {}) {
    this.root = root || null
    this.refs = {
      minus: this.root?.querySelector('.counter__btn--minus') || null,
      plus: this.root?.querySelector('.counter__btn--plus') || null,
      valueSpan: this.root?.querySelector('[data-ref="value"]') || null,
      valueInput: this.root?.querySelector('[data-ref="value-input"]') || null,
      hidden: this.root?.querySelector('[data-ref="hidden"]') || null,
    }
    this._inactive =
      !this.root ||
      !this.refs.minus ||
      !this.refs.plus ||
      (!this.refs.valueSpan && !this.refs.valueInput)

    const ds = this.root?.dataset || {}
    const toNum = (v, d) => (Number.isFinite(+v) ? +v : d)

    this.cfg = {
      name: ds.name || config.name || '',
      min: toNum(ds.min, config.min ?? 0),
      max: ds.max !== undefined ? toNum(ds.max, config.max ?? Infinity) : (config.max ?? Infinity),
      step: toNum(ds.step, config.step ?? 1),
      holdDelay: config.holdDelay ?? 350,
      holdInterval: config.holdInterval ?? 75,
      allowManual: config.allowManual ?? true,
    }

    this.state = {
      value: this._readInitialValue(),
      holdTimer: null,
      holdTick: null,
    }
    this.state.value = this._clamp(this._roundToStep(this.state.value))

    this._render()
    this._bind()
  }

  _readInitialValue() {
    if (this.refs.valueInput) {
      const n = +this.refs.valueInput.value
      if (Number.isFinite(n)) return n
    }
    if (this.refs.valueSpan) {
      const n = +(this.refs.valueSpan.textContent || '').trim()
      if (Number.isFinite(n)) return n
    }
    if (this.refs.hidden) {
      const n = +this.refs.hidden.value
      if (Number.isFinite(n)) return n
    }
    return this.cfg.min ?? 0
  }

  _bind() {
    if (this._inactive) return

    // Удержание/клик: только pointerdown / pointerup. Никаких click!
    this._onMinusDown = (e) => this._startHold(-1, e)
    this._onPlusDown = (e) => this._startHold(+1, e)
    this._onHoldStop = () => this._stopHold()

    this.refs.minus.addEventListener('pointerdown', this._onMinusDown)
    this.refs.plus.addEventListener('pointerdown', this._onPlusDown)
    document.addEventListener('pointerup', this._onHoldStop)
    this.refs.minus.addEventListener('pointerleave', this._onHoldStop)
    this.refs.plus.addEventListener('pointerleave', this._onHoldStop)

    // Клавиатура по кнопкам (+ доступность)
    this._onBtnKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (e.currentTarget === this.refs.plus) this.inc()
        if (e.currentTarget === this.refs.minus) this.dec()
      }
      if (e.key === 'ArrowUp' && e.currentTarget === this.refs.plus) {
        e.preventDefault()
        this.inc()
      }
      if (e.key === 'ArrowDown' && e.currentTarget === this.refs.minus) {
        e.preventDefault()
        this.dec()
      }
    }
    this.refs.minus.addEventListener('keydown', this._onBtnKeyDown)
    this.refs.plus.addEventListener('keydown', this._onBtnKeyDown)

    // Ручной ввод (если useInput = true)
    if (this.refs.valueInput && this.cfg.allowManual) {
      this._onInput = () => {
        const n = +this.refs.valueInput.value
        if (Number.isFinite(n)) this.set(n, { silent: false })
      }
      this._onBlur = () => {
        const v = +this.refs.valueInput.value
        const fixed = this._clamp(this._roundToStep(Number.isFinite(v) ? v : this.state.value))
        this.set(fixed, { silent: false })
      }
      this._onWheel = (e) => {
        if (!this.refs.valueInput.matches(':focus')) return
        if (e.deltaY < 0) this.inc()
        else if (e.deltaY > 0) this.dec()
      }
      this._onInputKey = (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          this.inc()
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          this.dec()
        }
      }

      this.refs.valueInput.addEventListener('input', this._onInput)
      this.refs.valueInput.addEventListener('blur', this._onBlur)
      this.refs.valueInput.addEventListener('wheel', this._onWheel, { passive: true })
      this.refs.valueInput.addEventListener('keydown', this._onInputKey)
    }
  }

  destroy() {
    if (this._inactive) return
    this._stopHold()
    this.refs.minus?.removeEventListener('pointerdown', this._onMinusDown)
    this.refs.plus?.removeEventListener('pointerdown', this._onPlusDown)
    document.removeEventListener('pointerup', this._onHoldStop)
    this.refs.minus?.removeEventListener('pointerleave', this._onHoldStop)
    this.refs.plus?.removeEventListener('pointerleave', this._onHoldStop)
    this.refs.minus?.removeEventListener('keydown', this._onBtnKeyDown)
    this.refs.plus?.removeEventListener('keydown', this._onBtnKeyDown)

    if (this.refs.valueInput && this.cfg.allowManual) {
      this.refs.valueInput.removeEventListener('input', this._onInput)
      this.refs.valueInput.removeEventListener('blur', this._onBlur)
      this.refs.valueInput.removeEventListener('wheel', this._onWheel, { passive: true })
      this.refs.valueInput.removeEventListener('keydown', this._onInputKey)
    }
  }

  inc() {
    const next = this._clamp(this._roundToStep(this.state.value + this.cfg.step))
    this.set(next)
  }
  dec() {
    const next = this._clamp(this._roundToStep(this.state.value - this.cfg.step))
    this.set(next)
  }

  set(value, { silent = false } = {}) {
    if (this._inactive) return
    const v = this._clamp(this._roundToStep(Number(value)))
    if (!Number.isFinite(v)) return
    if (v === this.state.value) {
      this._render()
      return
    }
    this.state.value = v
    this._render()
    if (!silent) this._emitChange()
  }
  get() {
    return this.state.value
  }

  _render() {
    const v = String(this.state.value)
    this.refs.valueSpan && (this.refs.valueSpan.textContent = v)
    this.refs.valueInput && (this.refs.valueInput.value = v)
    this.refs.hidden && (this.refs.hidden.value = v)

    const atMin = this.state.value <= this.cfg.min
    const atMax = this.state.value >= this.cfg.max
    this.refs.minus?.toggleAttribute('disabled', atMin)
    this.refs.plus?.toggleAttribute('disabled', atMax)
  }

  _emitChange() {
    this.root.dispatchEvent(
      new CustomEvent('counter:change', { detail: { value: this.state.value }, bubbles: true }),
    )
  }

  _clamp(n) {
    const min = Number.isFinite(this.cfg.min) ? this.cfg.min : -Infinity
    const max = Number.isFinite(this.cfg.max) ? this.cfg.max : Infinity
    return Math.min(max, Math.max(min, n))
  }

  _roundToStep(n) {
    const base = this.cfg.min || 0
    const step = this.cfg.step || 1
    const k = Math.round((n - base) / step)
    return Number((base + k * step).toFixed(10))
  }

  _startHold(dir, e) {
    e.preventDefault() // предотвращаем генерацию click после pointerup
    // Шаг сразу
    dir > 0 ? this.inc() : this.dec()
    // Запускаем автоинкремент после задержки
    this._stopHold()
    this.state.holdTimer = setTimeout(() => {
      this.state.holdTick = setInterval(() => {
        dir > 0 ? this.inc() : this.dec()
      }, this.cfg.holdInterval)
    }, this.cfg.holdDelay)
  }

  _stopHold() {
    if (this.state.holdTimer) clearTimeout(this.state.holdTimer)
    if (this.state.holdTick) clearInterval(this.state.holdTick)
    this.state.holdTimer = null
    this.state.holdTick = null
  }
}

// Массовая инициализация
export function initCounters(selector = '[data-component="counter"]', config = {}) {
  const nodes = Array.from(document.querySelectorAll(selector))
  return nodes.map((el) => new Counter(el, config))
}
