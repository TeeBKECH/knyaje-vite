/**
 * Phone Mask Component
 * Автоматически применяет маску для полей телефона
 * Формат: +7 (___) ___-__-__
 */

// Глобальное хранилище для отслеживания предыдущего активного элемента
let previousActiveElement = null

// Один глобальный обработчик для отслеживания изменений фокуса
let focusHandlersAttached = false

function attachGlobalFocusHandler() {
  if (focusHandlersAttached) return
  
  // Определяем, является ли поле телефонным
  const isPhoneField = (input) => {
    if (!input || input.tagName !== 'INPUT') return false
    // Проверяем type, классы и name
    const type = input.type || 'text'
    return type === 'tel' || 
           input.classList.contains('form_input-tel') ||
           input.name === 'tel' || 
           input.name === 'phone'
  }
  
  // Определяем, является ли поле текстовым
  const isTextField = (input) => {
    if (!input) return false
    if (input.tagName === 'TEXTAREA') return true
    if (input.tagName !== 'INPUT') return false
    if (isPhoneField(input)) return false
    const type = input.type || 'text'
    return type === 'text' || type === 'email' || type === 'search' || type === 'url'
  }
  
  // Сохраняем предыдущий активный элемент при потере фокуса и перед получением нового фокуса
  document.addEventListener('focusout', (e) => {
    const target = e.target
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      previousActiveElement = target
    }
  }, true)
  
  document.addEventListener('focusin', (e) => {
    const activeEl = document.activeElement
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      previousActiveElement = activeEl
    }
  }, true)
  
  // Обрабатываем переход фокуса для переключения клавиатуры
  document.addEventListener('focusin', (e) => {
    const currentInput = e.target
    if (!currentInput || (currentInput.tagName !== 'INPUT' && currentInput.tagName !== 'TEXTAREA')) return
    
    const currentIsPhone = isPhoneField(currentInput)
    const currentIsText = isTextField(currentInput)
    
    // Проверяем, был ли предыдущий элемент
    if (!previousActiveElement) {
      // Если нет предыдущего элемента, но текущий - телефон, просто убеждаемся что type="tel"
      if (currentIsPhone && currentInput.type !== 'tel') {
        currentInput.type = 'tel'
      }
      return
    }
    
    const prevWasPhone = isPhoneField(previousActiveElement)
    const prevWasText = isTextField(previousActiveElement)
    
    // Переключение клавиатуры: телефон -> текст
    if (prevWasPhone && currentIsText && currentInput !== previousActiveElement) {
      setTimeout(() => {
        if (document.activeElement === currentInput) {
          const cursorPos = currentInput.selectionStart || 0
          // Убеждаемся, что type="text" для текстового поля
          if (currentInput.tagName === 'INPUT' && currentInput.type !== 'text' && currentInput.type !== 'email') {
            currentInput.type = 'text'
          }
          // Переустанавливаем фокус для переключения клавиатуры
          currentInput.blur()
          requestAnimationFrame(() => {
            currentInput.focus()
            if (cursorPos > 0) {
              currentInput.setSelectionRange(cursorPos, cursorPos)
            }
          })
        }
      }, 50)
    }
  }, false) // Bubble phase - срабатывает после того, как элемент получил фокус
  
  focusHandlersAttached = true
}

/**
 * Инициализирует маску телефона для всех найденных полей
 * @param {string|HTMLElement|NodeList} selector - Селектор или элементы для инициализации
 * @returns {Array} Массив экземпляров PhoneMask
 */
export function initPhoneMasks(selector = null) {
  // Прикрепляем глобальный обработчик при первой инициализации
  attachGlobalFocusHandler()

  let elements = []

  if (selector) {
    if (typeof selector === 'string') {
      elements = Array.from(document.querySelectorAll(selector))
    } else if (selector instanceof NodeList) {
      elements = Array.from(selector)
    } else if (selector instanceof HTMLElement) {
      elements = [selector]
    } else if (Array.isArray(selector)) {
      elements = selector
    }
  } else {
    // Автоматический поиск полей телефона
    elements = Array.from(
      document.querySelectorAll(
        'input.form_input-tel, input[name="tel"], input[name="phone"], input[type="tel"]'
      )
    )
    // Исключаем поля, которые управляются квизом
    elements = elements.filter((el) => !el.hasAttribute('data-quiz-contact-field'))
  }

  return elements
    .filter((el) => el instanceof HTMLInputElement)
    .map((el) => new PhoneMask(el))
}

/**
 * Класс для работы с маской телефона
 */
export class PhoneMask {
  constructor(input) {
    if (!(input instanceof HTMLInputElement)) {
      console.warn('PhoneMask: input должен быть HTMLInputElement')
      return
    }

    this.input = input
    this.mask = '+7 (___) ___-__-__'
    this.placeholder = this.mask

    // Устанавливаем placeholder, если его нет
    if (!this.input.placeholder) {
      this.input.placeholder = this.placeholder
    }

    // Устанавливаем type="tel" для мобильных устройств
    if (this.input.type !== 'tel') {
      this.input.type = 'tel'
    }
    
    // Добавляем inputmode="numeric" для принудительного переключения на номерную клавиатуру
    if (!this.input.hasAttribute('inputmode')) {
      this.input.setAttribute('inputmode', 'numeric')
    }

    this._bind()
    this._formatValue()
  }

  /**
   * Привязывает обработчики событий
   */
  _bind() {
    this.input.addEventListener('input', this._handleInput.bind(this))
    this.input.addEventListener('keydown', this._handleKeydown.bind(this))
    this.input.addEventListener('paste', this._handlePaste.bind(this))
    this.input.addEventListener('focus', this._handleFocus.bind(this))
    this.input.addEventListener('blur', this._handleBlur.bind(this))
  }

  /**
   * Обработчик ввода
   */
  _handleInput(e) {
    const cursorPosition = this.input.selectionStart
    const oldValue = this.input.value
    const oldLength = oldValue.length

    // Получаем новое значение и форматируем
    const newValue = this._formatPhone(this.input.value)
    const newLength = newValue.length

    // Устанавливаем новое значение
    this.input.value = newValue

    // Вычисляем новую позицию курсора
    // Подсчитываем количество цифр до курсора в старом значении
    const digitsBeforeCursor = this._countDigitsBefore(oldValue, cursorPosition)
    
    // Находим позицию в новом значении, где находится та же цифра
    let newCursorPosition = this._findDigitPosition(newValue, digitsBeforeCursor)

    // Если не удалось найти позицию, ставим курсор в конец
    if (newCursorPosition === -1) {
      newCursorPosition = newLength
    }

    // Устанавливаем курсор
    setTimeout(() => {
      this.input.setSelectionRange(newCursorPosition, newCursorPosition)
    }, 0)
  }

  /**
   * Подсчитывает количество цифр до указанной позиции
   */
  _countDigitsBefore(value, position) {
    let count = 0
    for (let i = 0; i < position && i < value.length; i++) {
      if (/\d/.test(value[i])) {
        count++
      }
    }
    return count
  }

  /**
   * Находит позицию n-й цифры в строке
   */
  _findDigitPosition(value, digitIndex) {
    let count = 0
    for (let i = 0; i < value.length; i++) {
      if (/\d/.test(value[i])) {
        if (count === digitIndex) {
          return i + 1 // Возвращаем позицию после цифры
        }
        count++
      }
    }
    return value.length // Если не нашли, возвращаем конец строки
  }

  /**
   * Обработчик нажатия клавиш
   */
  _handleKeydown(e) {
    // Разрешаем удаление, навигацию и специальные клавиши
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ]

    if (allowedKeys.includes(e.key)) {
      // При удалении Backspace, если курсор находится на разделителе, удаляем предыдущую цифру
      if (e.key === 'Backspace') {
        const cursorPos = this.input.selectionStart
        const value = this.input.value

        // Если курсор находится на разделителе (скобка, пробел, дефис), перемещаем его назад
        if (cursorPos > 0 && /[)\s-]/.test(value[cursorPos - 1])) {
          e.preventDefault()
          // Перемещаем курсор на позицию перед разделителем
          this.input.setSelectionRange(cursorPos - 1, cursorPos - 1)
          // Удаляем символ перед разделителем
          const before = value.substring(0, cursorPos - 2)
          const after = value.substring(cursorPos)
          const newValue = before + after
          this.input.value = this._formatPhone(newValue)
          // Устанавливаем курсор
          const newCursorPos = Math.max(0, cursorPos - 2)
          this.input.setSelectionRange(newCursorPos, newCursorPos)
        }
      }
      return
    }

    // Разрешаем Ctrl/Cmd + A, C, V, X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      return
    }

    // Если нажата не цифра, блокируем
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault()
      return
    }
  }

  /**
   * Обработчик вставки
   */
  _handlePaste(e) {
    e.preventDefault()
    const pastedData = (e.clipboardData || window.clipboardData).getData('text')
    const cleaned = this._cleanPhone(pastedData)
    const formatted = this._formatPhone(cleaned)
    this.input.value = formatted

    // Устанавливаем курсор в конец
    setTimeout(() => {
      this.input.setSelectionRange(formatted.length, formatted.length)
    }, 0)
  }

  /**
   * Обработчик фокуса
   */
  _handleFocus(e) {
    // Если поле пустое, устанавливаем начало маски
    if (!this.input.value || this.input.value === '') {
      this.input.value = '+7 ('
    }

    // Убеждаемся, что type="tel" и inputmode установлены для корректной работы клавиатуры
    if (this.input.type !== 'tel') {
      this.input.type = 'tel'
    }
    if (!this.input.hasAttribute('inputmode')) {
      this.input.setAttribute('inputmode', 'numeric')
    }
    
    // Если предыдущий элемент был текстовым input, принудительно переключаем клавиатуру
    if (previousActiveElement && 
        previousActiveElement !== this.input &&
        previousActiveElement.tagName === 'INPUT' &&
        (previousActiveElement.type === 'text' || previousActiveElement.type === '' || !previousActiveElement.hasAttribute('type'))) {
      setTimeout(() => {
        if (document.activeElement === this.input) {
          const cursorPos = this.input.selectionStart || 0
          const inputValue = this.input.value
          
          // Временно меняем type для принудительного переключения клавиатуры
          this.input.blur()
          requestAnimationFrame(() => {
            this.input.type = 'text'
            setTimeout(() => {
              this.input.type = 'tel'
              this.input.setAttribute('inputmode', 'numeric')
              setTimeout(() => {
                if (this.input.value !== inputValue) {
                  this.input.value = inputValue
                }
                this.input.focus()
                if (cursorPos > 0) {
                  setTimeout(() => {
                    this.input.setSelectionRange(cursorPos, cursorPos)
                  }, 0)
                }
              }, 50)
            }, 50)
          })
        }
      }, 10)
    }
  }

  /**
   * Обработчик потери фокуса
   */
  _handleBlur(e) {
    const value = this.input.value
    // Если поле содержит только "+7 (" или пустое, очищаем
    if (!value || value === '+7 (' || value.length < 4) {
      this.input.value = ''
    } else {
      // Форматируем значение при потере фокуса
      this.input.value = this._formatPhone(value)
    }
  }

  /**
   * Очищает строку от всех символов кроме цифр
   */
  _cleanPhone(value) {
    if (!value) return ''
    return value.replace(/\D/g, '')
  }

  /**
   * Форматирует телефонный номер
   */
  _formatPhone(value) {
    if (!value) return ''

    // Проверяем, есть ли префикс +7
    const hasPrefix = value.trim().startsWith('+7')

    // Очищаем от всех символов кроме цифр
    let cleaned = this._cleanPhone(value)

    // Если номер начинается с 8, заменяем на 7
    if (cleaned.startsWith('8')) {
      cleaned = '7' + cleaned.substring(1)
    }

    // Если номер начинается не с 7 и есть цифры, добавляем 7 в начало
    if (cleaned && cleaned.length > 0 && !cleaned.startsWith('7')) {
      cleaned = '7' + cleaned
    }

    // Если нет цифр, возвращаем пустую строку или начало маски
    if (!cleaned || cleaned.length === 0) {
      return hasPrefix ? '+7 (' : ''
    }

    // Ограничиваем длину до 11 цифр (7 + 10 цифр)
    if (cleaned.length > 11) {
      cleaned = cleaned.substring(0, 11)
    }

    // Форматируем по маске +7 (___) ___-__-__
    let formatted = '+7 ('

    if (cleaned.length > 1) {
      formatted += cleaned.substring(1, 4) // код оператора (3 цифры)
    }

    if (cleaned.length > 4) {
      formatted += ') ' + cleaned.substring(4, 7) // первая группа (3 цифры)
    }

    if (cleaned.length > 7) {
      formatted += '-' + cleaned.substring(7, 9) // вторая группа (2 цифры)
    }

    if (cleaned.length > 9) {
      formatted += '-' + cleaned.substring(9, 11) // третья группа (2 цифры)
    }

    return formatted
  }

  /**
   * Форматирует текущее значение в поле
   */
  _formatValue() {
    if (this.input.value) {
      this.input.value = this._formatPhone(this.input.value)
    }
  }

  /**
   * Получает очищенный номер телефона (только цифры)
   */
  getCleanValue() {
    return this._cleanPhone(this.input.value)
  }

  /**
   * Получает отформатированный номер телефона
   */
  getFormattedValue() {
    return this.input.value
  }

  /**
   * Проверяет, является ли номер валидным (11 цифр)
   */
  isValid() {
    const clean = this.getCleanValue()
    return clean.length === 11 && clean.startsWith('7')
  }
}
