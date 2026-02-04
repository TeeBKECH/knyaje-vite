export class CountersUp {
  constructor(root, config = {}) {
    this.root = root || null
    this.refs = {
      valueEl: this.root?.querySelector('.counters_item-value') || null,
    }

    this._inactive = !this.root || !this.refs.valueEl

    // Сохраняем оригинальный текст при инициализации
    this.originalText = this.refs.valueEl?.textContent.trim() || ''

    const ds = this.root?.dataset || {}
    const toNum = (v, d) => (Number.isFinite(+v) ? +v : d)

    this.cfg = {
      duration: toNum(ds.duration, config.duration ?? 2000), // длительность анимации в мс
      easing: config.easing ?? 'easeOutCubic', // функция плавности
      threshold: config.threshold ?? 0.1, // порог видимости для Intersection Observer
      once: config.once ?? true, // запускать только один раз
    }

    // Извлекаем данные из оригинального текста
    const extracted = this._extractValueData(this.originalText)

    this.state = {
      targetValue: extracted.value,
      suffix: extracted.suffix,
      prefix: extracted.prefix,
      currentValue: 0,
      isAnimated: false,
      animationFrame: null,
      startTime: null,
    }

    // Устанавливаем начальное значение 0
    this._render()

    // Проверяем, виден ли элемент сразу при загрузке
    this._checkInitialVisibility()
    this._initObserver()
  }

  _checkInitialVisibility() {
    if (this._inactive) return

    // Простая проверка видимости элемента
    const rect = this.root.getBoundingClientRect()
    const isVisible =
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0

    if (isVisible) {
      // Если элемент уже виден, запускаем анимацию сразу
      // Intersection Observer все равно подключится, но не запустит анимацию повторно
      requestAnimationFrame(() => {
        if (!this.state.isAnimated) {
          this._startAnimation()
        }
      })
    }
  }

  _extractValueData(text) {
    if (!text) return { value: 0, suffix: '', prefix: '' }

    // Извлекаем число из текста (например, "570+", "15 лет", "98%", "34")
    const numberMatch = text.match(/(\d+(?:\.\d+)?)/)
    if (!numberMatch) return { value: 0, suffix: text, prefix: '' }

    const numberStr = numberMatch[1]
    const numberIndex = text.indexOf(numberStr)

    const prefix = text.substring(0, numberIndex)
    const suffix = text.substring(numberIndex + numberStr.length)
    const value = parseFloat(numberStr)

    return {
      value: Number.isFinite(value) ? value : 0,
      suffix: suffix || '',
      prefix: prefix || '',
    }
  }

  _initObserver() {
    if (this._inactive) return

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!this.state.isAnimated) {
              this._startAnimation()
            }
            if (this.cfg.once && this.state.isAnimated) {
              this.observer.disconnect()
            }
          }
        })
      },
      {
        threshold: this.cfg.threshold,
        rootMargin: '0px',
      },
    )

    this.observer.observe(this.root)
  }

  _startAnimation() {
    if (this.state.isAnimated) return
    this.state.isAnimated = true
    this.state.startTime = null
    this.state.currentValue = 0
    this._animate()
  }

  _animate() {
    const now = performance.now()
    if (!this.state.startTime) {
      this.state.startTime = now
    }

    const elapsed = now - this.state.startTime
    const progress = Math.min(elapsed / this.cfg.duration, 1)

    // Применяем функцию плавности
    const easedProgress = this._ease(progress, this.cfg.easing)

    // Вычисляем текущее значение
    this.state.currentValue = easedProgress * this.state.targetValue

    // Обновляем отображение
    this._render()

    if (progress < 1) {
      this.state.animationFrame = requestAnimationFrame(() => this._animate())
    } else {
      // Убеждаемся, что финальное значение точно равно целевому
      this.state.currentValue = this.state.targetValue
      this._render()
    }
  }

  _ease(t, type) {
    switch (type) {
      case 'easeOutCubic':
        return 1 - Math.pow(1 - t, 3)
      case 'easeInOutCubic':
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      case 'easeOutQuad':
        return 1 - (1 - t) * (1 - t)
      case 'linear':
        return t
      default:
        return 1 - Math.pow(1 - t, 3) // по умолчанию easeOutCubic
    }
  }

  _render() {
    if (!this.refs.valueEl) return

    // Форматируем число (убираем лишние знаки после запятой)
    let displayValue = this.state.currentValue
    if (this.state.targetValue % 1 === 0) {
      // Если целевое значение целое, показываем целое
      displayValue = Math.floor(displayValue)
    } else {
      // Иначе округляем до 1 знака после запятой
      displayValue = Math.round(displayValue * 10) / 10
    }

    // Формируем строку с префиксом и суффиксом
    const formattedValue = this.state.prefix + displayValue + this.state.suffix
    this.refs.valueEl.textContent = formattedValue
  }

  destroy() {
    if (this.state.animationFrame) {
      cancelAnimationFrame(this.state.animationFrame)
    }
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

// Массовая инициализация
export function initCountersUp(selector = '.counters_item', config = {}) {
  const nodes = Array.from(document.querySelectorAll(selector))
  // Фильтруем только элементы, которые имеют .counters_item-value
  return nodes
    .filter((el) => el.querySelector('.counters_item-value'))
    .map((el) => new CountersUp(el, config))
}
