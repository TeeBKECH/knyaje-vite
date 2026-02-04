// Кастомный select с режимами single и multiple.
// single: при выборе опции dropdown закрывается
// multiple: при выборе опции dropdown не закрывается; закрытие — по клику вне, по кнопке или ESC

export class Select {
  constructor(root, config = {}) {
    this.root = root || null

    this.refs = {
      toggle: this.root?.querySelector('[data-ref="toggle"]') || null,
      dropdown: this.root?.querySelector('[data-ref="dropdown"]') || null,
      list: this.root?.querySelector('[data-ref="list"]') || null,
      value: this.root?.querySelector('[data-ref="value"]') || null,
      input: this.root?.querySelector('[data-ref="input"]') || null,
      inputs: this.root?.querySelector('[data-ref="inputs"]') || null,
    }

    const readBoolData = (el, name, def = false) => {
      if (!el) return def
      if (!el.hasAttribute(name)) return def
      const raw = el.getAttribute(name)
      if (raw == null || raw === '' || raw === name) return true
      const v = String(raw).toLowerCase()
      if (v === 'false' || v === '0') return false
      if (v === 'true' || v === '1') return true
      return true
    }

    this.cfg = {
      multiple:
        config.multiple !== undefined
          ? !!config.multiple
          : readBoolData(this.root, 'data-multiple', false),
      placeholder: this.root?.dataset.placeholder || config.placeholder || 'Выберите…',
      name: this.root?.dataset.name || config.name || '',
      delimiter: config.delimiter || ',',
      disabled: !!config.disabled,
      multiInput:
        config.multiInput !== undefined
          ? !!config.multiInput
          : readBoolData(this.root, 'data-multi-input', false),
    }

    this.state = {
      open: false,
      options: [],
      selected: new Set(),
      focusedIndex: -1,
    }

    // Флаг: погасить следующий click внутри селекта (для кейса, когда click "падает" на кнопку)
    this._blockNextInnerClick = false

    // Флаг: блокировать открытие других селектов после выбора опции (для мобильных устройств)
    this._blockOtherSelectsOpen = false

    // Состояние для отслеживания touch-событий (чтобы различать выбор и скролл)
    this._touchState = {
      startElement: null,
      startY: 0,
      startX: 0,
      hasMoved: false,
      startScrollTop: 0,
    }

    this._inactive =
      !this.root || !this.refs.list || !this.refs.toggle || !this.refs.dropdown || !this.refs.value

    this.state.options = this._readOptionsFromDOM()
    this.state.options.forEach((o) => {
      if (o.selected) this.state.selected.add(o.value)
    })

    this._syncLabel()
    this._syncHiddenInput()

    if (this.cfg.disabled) this.disable()

    this._bind()
  }

  _readOptionsFromDOM() {
    const nodes = Array.from(this.refs.list?.querySelectorAll('.c-select__option') || [])
    return nodes.map((el, index) => ({
      el,
      index,
      value: String(el.getAttribute('data-value') ?? ''),
      label: (el.textContent || '').trim(),
      selected: el.classList.contains('is-selected') || el.getAttribute('aria-selected') === 'true',
    }))
  }

  _bind() {
    if (this._inactive) return

    this._bound = {
      onDocPointerDown: (e) => this._onDocPointerDown(e), // закрытие по клику вне
      onDocClickCapture: (e) => this._onDocClickCapture(e), // погасить "следующий клик" внутри
      onKeyDown: (e) => this._onKeyDown(e), // клавиатура
      onToggleClick: (e) => this._onToggleClick(e), // клик по кнопке
      onDropdownPointerDownCapture: (e) => this._onDropdownPointerDownCapture(e), // начало взаимодействия внутри
      onDropdownPointerMove: (e) => this._onDropdownPointerMove(e), // отслеживание движения для различения скролла и выбора
      onDropdownPointerUp: (e) => this._onDropdownPointerUp(e), // выбор опции при отпускании
      onDropdownPointerCancel: (e) => this._onDropdownPointerCancel(e), // отмена события (например, при скролле страницы)
    }

    // Закрытие "вне" — на pointerdown
    document.addEventListener('pointerdown', this._bound.onDocPointerDown)

    // Гашение "следующего клика" — на document click CAPTURE
    document.addEventListener('click', this._bound.onDocClickCapture, { capture: true })

    this.root.addEventListener('keydown', this._bound.onKeyDown)
    this.refs.toggle.addEventListener('click', this._bound.onToggleClick)

    // Взаимодействие внутри dropdown — pointerdown CAPTURE
    this.refs.dropdown.addEventListener('pointerdown', this._bound.onDropdownPointerDownCapture, {
      capture: true,
    })
    // Отслеживание движения для различения скролла и выбора
    this.refs.dropdown.addEventListener('pointermove', this._bound.onDropdownPointerMove, {
      passive: true,
    })
    // Выбор опции при отпускании (если не было скролла)
    this.refs.dropdown.addEventListener('pointerup', this._bound.onDropdownPointerUp, {
      capture: true,
    })
    // Отмена события (например, при скролле страницы)
    this.refs.dropdown.addEventListener('pointercancel', this._bound.onDropdownPointerCancel, {
      capture: true,
    })
  }

  destroy() {
    if (this._inactive) return
    document.removeEventListener('pointerdown', this._bound.onDocPointerDown)
    document.removeEventListener('click', this._bound.onDocClickCapture, { capture: true })
    this.root.removeEventListener('keydown', this._bound.onKeyDown)
    this.refs.toggle.removeEventListener('click', this._bound.onToggleClick)
    this.refs.dropdown.removeEventListener(
      'pointerdown',
      this._bound.onDropdownPointerDownCapture,
      { capture: true },
    )
    this.refs.dropdown.removeEventListener('pointermove', this._bound.onDropdownPointerMove)
    this.refs.dropdown.removeEventListener('pointerup', this._bound.onDropdownPointerUp, {
      capture: true,
    })
    this.refs.dropdown.removeEventListener('pointercancel', this._bound.onDropdownPointerCancel, {
      capture: true,
    })
    this.close()
    this._inactive = true
  }

  open() {
    if (this._inactive || this.state.open || this.isDisabled()) return

    // Проверяем глобальный флаг блокировки открытия других селектов
    // (устанавливается при выборе опции в другом селекте)
    if (document._blockSelectsOpen) return

    this.state.open = true

    // Убираем hidden и display для видимости элемента
    this.refs.dropdown.removeAttribute('hidden')
    this.refs.dropdown.style.display = ''

    // Принудительный пересчет стилей для запуска transition
    // eslint-disable-next-line no-unused-expressions
    this.refs.dropdown.offsetHeight

    // Добавляем класс для запуска анимации
    this.root.classList.add('is-open')
    this.root.setAttribute('aria-expanded', 'true')
    this._emit('select:open')
    this._focusOption(Math.max(0, this._firstSelectedIndex()))
  }

  close() {
    if (this._inactive || !this.state.open) return
    this.state.open = false

    // Убираем класс для запуска анимации закрытия
    this.root.classList.remove('is-open')

    // Принудительный пересчет стилей для запуска transition
    // eslint-disable-next-line no-unused-expressions
    this.refs.dropdown.offsetHeight

    this.root.setAttribute('aria-expanded', 'false')
    this.state.focusedIndex = -1
    this._emit('select:close')

    // Ждем окончания анимации перед установкой hidden
    // Отслеживаем завершение обоих transition (opacity и transform)
    const completedProperties = new Set()
    let transitionEnded = false

    const cleanup = () => {
      if (!transitionEnded) {
        transitionEnded = true
        this.refs.dropdown.removeEventListener('transitionend', handleTransitionEnd)
        if (!this.state.open) {
          this.refs.dropdown.setAttribute('hidden', '')
          this.refs.dropdown.style.display = 'none'
        }
      }
    }

    const handleTransitionEnd = (e) => {
      // Проверяем, что это событие относится к нашему dropdown и нужным свойствам
      if (
        e.target === this.refs.dropdown &&
        !this.state.open &&
        (e.propertyName === 'opacity' || e.propertyName === 'transform')
      ) {
        completedProperties.add(e.propertyName)

        // Если оба transition завершены, выполняем cleanup
        if (completedProperties.has('opacity') && completedProperties.has('transform')) {
          cleanup()
        }
      }
    }

    this.refs.dropdown.addEventListener('transitionend', handleTransitionEnd)

    // Fallback на случай, если transitionend не сработает
    setTimeout(() => {
      cleanup()
    }, 350) // Немного больше длительности анимации
  }

  toggle() {
    if (this._inactive) return
    this.state.open ? this.close() : this.open()
  }

  getValue() {
    const arr = Array.from(this.state.selected)
    return this.cfg.multiple ? arr : (arr[0] ?? null)
  }

  setValue(value, { silent = false } = {}) {
    if (this._inactive) return

    const values = this.cfg.multiple
      ? new Set(
          Array.isArray(value)
            ? value.map(String)
            : String(value ?? '')
                .split(this.cfg.delimiter)
                .filter(Boolean),
        )
      : new Set(value != null ? [String(value)] : [])

    this.state.selected.clear()

    this.state.options.forEach((opt) => {
      const sel = values.has(opt.value)
      opt.selected = sel
      opt.el.classList.toggle('is-selected', sel)
      opt.el.setAttribute('aria-selected', String(sel))
      if (sel) this.state.selected.add(opt.value)
    })

    this._syncLabel()
    this._syncHiddenInput()
    if (!silent) this._emitChange()

    if (!this.cfg.multiple) {
      this.close()
      this.refs.toggle?.focus()
    }
  }

  select(value, { silent = false } = {}) {
    if (this._inactive) return

    const v = String(value)
    const opt = this.state.options.find((o) => o.value === v)
    if (!opt) return

    if (this.cfg.multiple) {
      const on = !this.state.selected.has(v)
      opt.selected = on
      opt.el.classList.toggle('is-selected', on)
      opt.el.setAttribute('aria-selected', String(on))
      if (on) this.state.selected.add(v)
      else this.state.selected.delete(v)
    } else {
      this.state.options.forEach((o) => {
        const on = o.value === v
        o.selected = on
        o.el.classList.toggle('is-selected', on)
        o.el.setAttribute('aria-selected', String(on))
      })
      this.state.selected = new Set([v])
    }

    this._syncLabel()
    this._syncHiddenInput()
    if (!silent) this._emitChange()

    if (!this.cfg.multiple) {
      this.close()
      this.refs.toggle?.focus()
    }
  }

  deselect(value, { silent = false } = {}) {
    if (this._inactive || !this.cfg.multiple) return
    const v = String(value)
    const opt = this.state.options.find((o) => o.value === v)
    if (!opt) return
    opt.selected = false
    this.state.selected.delete(v)
    opt.el.classList.remove('is-selected')
    opt.el.setAttribute('aria-selected', 'false')
    this._syncLabel()
    this._syncHiddenInput()
    if (!silent) this._emitChange()
  }

  clear({ silent = false } = {}) {
    if (this._inactive) return
    this.state.options.forEach((o) => {
      o.selected = false
      o.el.classList.remove('is-selected')
      o.el.setAttribute('aria-selected', 'false')
    })
    this.state.selected.clear()
    this._syncLabel()
    this._syncHiddenInput()
    if (!silent) this._emitChange()
  }

  enable() {
    if (this._inactive) return
    this.root.classList.remove('is-disabled')
    this.refs.toggle.removeAttribute('disabled')
  }

  disable() {
    if (this._inactive) return
    this.root.classList.add('is-disabled')
    this.refs.toggle.setAttribute('disabled', 'true')
    this.close()
  }

  isDisabled() {
    if (this._inactive) return true
    return this.root.classList.contains('is-disabled')
  }

  _emit(name, detail = {}) {
    if (this._inactive) return
    this.root.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
  }

  _emitChange() {
    const values = this.getValue()
    this._emit('select:change', {
      value: Array.isArray(values) ? (values[0] ?? null) : values,
      values: Array.isArray(values) ? values : values != null ? [values] : [],
      labels: this._selectedLabels(),
    })
  }

  _syncLabel() {
    if (this._inactive) return
    const labels = this._selectedLabels()
    const hasValue = labels.length > 0
    this.refs.value.textContent = hasValue ? labels.join(', ') : this.cfg.placeholder
    // Добавляем класс для стилизации выбранного значения
    this.refs.value.classList.toggle('has-value', hasValue)
  }

  _selectedLabels() {
    const set = this.state.selected
    return this.state.options.filter((o) => set.has(o.value)).map((o) => o.label)
  }

  _syncHiddenInput() {
    if (this._inactive) return

    if (this.cfg.multiple && this.cfg.multiInput && this.refs.inputs) {
      this.refs.inputs.innerHTML = ''
      const name = this.cfg.name
      if (!name) return
      for (const v of this.state.selected) {
        const i = document.createElement('input')
        i.type = 'hidden'
        i.name = name
        i.value = v
        this.refs.inputs.appendChild(i)
      }
      return
    }

    if (!this.refs.input) return

    if (this.cfg.multiple) {
      this.refs.input.value = Array.from(this.state.selected).join(this.cfg.delimiter)
    } else {
      this.refs.input.value = Array.from(this.state.selected)[0] ?? ''
    }
  }

  _firstSelectedIndex() {
    const idx = this.state.options.findIndex((o) => o.selected)
    return idx === -1 ? 0 : idx
  }

  _focusOption(index) {
    if (this._inactive) return
    const len = this.state.options.length
    if (!len) return
    index = Math.max(0, Math.min(index, len - 1))
    this.state.focusedIndex = index
    const el = this.state.options[index].el
    this.state.options.forEach((o) => o.el.classList.remove('is-focused'))
    el.classList.add('is-focused')
    el.focus({ preventScroll: true })
    el.scrollIntoView({ block: 'nearest' })
  }

  // Закрытие по клику вне (pointerdown по документу)
  _onDocPointerDown(e) {
    if (!this.state.open) return

    // Проверяем, что клик был не внутри нашего селекта
    const path = typeof e.composedPath === 'function' ? e.composedPath() : null
    const inside = path ? path.includes(this.root) : this.root.contains(e.target)

    if (!inside) {
      this.close()
    }
  }

  // CAPTURE на document.click: гасим "следующий клик" внутри селекта
  _onDocClickCapture(e) {
    if (!this._blockNextInnerClick) return
    // Гасим только клики внутри нашего селекта, чтобы не съедать клики по внешним элементам
    if (this.root.contains(e.target)) {
      this._blockNextInnerClick = false
      e.stopPropagation()
      e.preventDefault()
    } else {
      // Если клик снаружи — не мешаем, просто сбросим флаг
      this._blockNextInnerClick = false
    }
  }

  // Клавиатура
  _onKeyDown(e) {
    const key = e.key

    if (e.target === this.refs.toggle) {
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault()
        this.open()
        return
      }
      if (key === 'Enter' || key === ' ') {
        e.preventDefault()
        this.toggle()
        return
      }
      if (key === 'Escape') {
        this.close()
        return
      }
    }

    if (this.state.open) {
      if (key === 'ArrowDown') {
        e.preventDefault()
        this._focusOption(this.state.focusedIndex + 1)
        return
      }
      if (key === 'ArrowUp') {
        e.preventDefault()
        this._focusOption(this.state.focusedIndex - 1)
        return
      }
      if (key === 'Home') {
        e.preventDefault()
        this._focusOption(0)
        return
      }
      if (key === 'End') {
        e.preventDefault()
        this._focusOption(this.state.options.length - 1)
        return
      }
      if (key === 'Enter' || key === ' ') {
        e.preventDefault()
        const idx = this.state.focusedIndex
        const opt = this.state.options[idx]
        if (opt) {
          if (this.cfg.multiple) {
            this.select(opt.value) // не закрываем
            // Важно: блокируем ближайший клик внутри, который может приземлиться на toggle
            this._blockNextInnerClick = true
          } else {
            this.select(opt.value)
            this.close()
            this.refs.toggle?.focus()
          }
        }
        return
      }
      if (key === 'Escape') {
        e.preventDefault()
        this.close()
        this.refs.toggle?.focus()
      }
    }
  }

  // Клик по кнопке: учитываем блокировку "следующего клика"
  _onToggleClick(e) {
    if (this._blockNextInnerClick) {
      this._blockNextInnerClick = false
      e.stopPropagation()
      e.preventDefault()
      return
    }
    this.toggle()
  }

  // Начало взаимодействия внутри dropdown на pointerdown CAPTURE
  // Запоминаем начальную позицию для определения, был ли это скролл или выбор
  _onDropdownPointerDownCapture(e) {
    if (!(e.target instanceof Element)) return

    const item = e.target.closest('.c-select__option')
    if (!item) return

    // Запоминаем состояние для отслеживания движения
    this._touchState.startElement = item
    this._touchState.startY = e.clientY
    this._touchState.startX = e.clientX
    this._touchState.hasMoved = false
    this._touchState.startScrollTop = this.refs.list?.scrollTop || 0

    // Не выбираем опцию сразу, ждем pointerup
    // Но предотвращаем стандартное поведение для опций
    if (item.classList.contains('c-select__option')) {
      e.preventDefault()
      // Останавливаем всплытие только до document, но не блокируем обработку на самом элементе
      e.stopPropagation()
    }
  }

  // Отслеживание движения для различения скролла и выбора
  _onDropdownPointerMove(e) {
    if (!this._touchState.startElement) return

    const deltaY = Math.abs(e.clientY - this._touchState.startY)
    const deltaX = Math.abs(e.clientX - this._touchState.startX)
    const scrollDelta = Math.abs((this.refs.list?.scrollTop || 0) - this._touchState.startScrollTop)

    // Если было движение больше порога (5px) или скролл, считаем это скроллом
    const moveThreshold = 5
    if (deltaY > moveThreshold || deltaX > moveThreshold || scrollDelta > 0) {
      this._touchState.hasMoved = true
    }
  }

  // Выбор опции при отпускании (если не было скролла)
  _onDropdownPointerUp(e) {
    if (!(e.target instanceof Element)) {
      this._resetTouchState()
      return
    }

    // Если было значительное движение (скролл), не выбираем опцию
    if (this._touchState.hasMoved) {
      this._resetTouchState()
      return
    }

    // Находим опцию, на которой произошло отпускание
    const targetItem = e.target.closest('.c-select__option')
    if (!targetItem) {
      this._resetTouchState()
      return
    }

    const value = targetItem.getAttribute('data-value')
    if (value == null) {
      this._resetTouchState()
      return
    }

    // Выбираем опцию только если не было скролла
    if (this.cfg.multiple) {
      this.select(value) // не закрываем
      this._blockNextInnerClick = true // заблокировать следующий click внутри селекта (например, по toggle)
    } else {
      this.select(value)
      this.close()
      this.refs.toggle?.focus()
    }

    // Устанавливаем глобальный флаг для блокировки открытия других селектов
    // Это предотвращает открытие второго селекта под dropdown первого на мобильных
    document._blockSelectsOpen = true
    setTimeout(() => {
      document._blockSelectsOpen = false
    }, 100) // Блокируем на 100ms после выбора опции

    e.preventDefault()
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation()
    e.stopPropagation()

    this._resetTouchState()
  }

  // Отмена события (например, при скролле страницы)
  _onDropdownPointerCancel(e) {
    this._resetTouchState()
  }

  // Сброс состояния touch-событий
  _resetTouchState() {
    this._touchState.startElement = null
    this._touchState.startY = 0
    this._touchState.startX = 0
    this._touchState.hasMoved = false
    this._touchState.startScrollTop = 0
  }
}

export function initSelects(selector = '[data-component="select"]', config = {}) {
  const nodes = Array.from(document.querySelectorAll(selector))
  return nodes.map((el) => new Select(el, config))
}
