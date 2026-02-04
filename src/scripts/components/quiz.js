import { QuizProgress } from './quiz-progress.js'
import { PhoneMask } from './phone-mask.js'

/**
 * Переиспользуемый класс для управления квизом
 * @class Quiz
 */
export class Quiz {
  constructor(root, options = {}) {
    this.root = root
    if (!root) {
      console.warn('Quiz: корневой элемент не найден')
      return
    }

    // Конфигурация
    this.config = {
      stepsSelector: '.quiz_step',
      optionSelector: '.quiz_option',
      prevBtnSelector: '.quiz_btn--prev',
      nextBtnSelector: '.quiz_btn--next',
      progressSelector: '.quiz_progress',
      formSelector: '.form',
      summarySelector: '[data-summary]',
      changeLinkSelector: '[data-action="change"]',
      activeStepClass: 'quiz_step--active',
      selectedOptionClass: 'quiz_option--selected',
      disabledBtnClass: 'disabled',
      ...options,
    }

    // Состояние
    this.currentStep = 1
    this.totalSteps = 0
    this.answers = {}
    this.progressBar = null

    // Элементы
    this.steps = []
    this.prevBtn = null
    this.nextBtn = null
    this.form = null
    this.contactValueField = null
    this.phoneMaskInstance = null

    this.init()
  }

  /**
   * Инициализация квиза
   */
  init() {
    // Находим все шаги
    this.steps = Array.from(this.root.querySelectorAll(this.config.stepsSelector))
    this.totalSteps = this.steps.length

    if (this.totalSteps === 0) {
      console.warn('Quiz: шаги не найдены')
      return
    }

    // Инициализируем прогресс-бар
    const progressEl = this.root.querySelector(this.config.progressSelector)
    if (progressEl) {
      this.progressBar = new QuizProgress(progressEl)
    }

    // Находим кнопки навигации
    this.prevBtn = this.root.querySelector(this.config.prevBtnSelector)
    this.nextBtn = this.root.querySelector(this.config.nextBtnSelector)

    // Находим форму
    this.form = this.root.querySelector(this.config.formSelector)

    // Устанавливаем начальное состояние
    this.setStep(1)

    // Привязываем обработчики событий
    this.bindEvents()

    // Инициализируем обработчики для каждого шага
    this.initStepHandlers()
  }

  /**
   * Привязка обработчиков событий
   */
  bindEvents() {
    // Кнопка "Назад"
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.goToPrevStep())
    }

    // Кнопка "Далее"
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.goToNextStep())
    }

    // Обработка формы
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleFormSubmit(e))
      
      // Обработка изменения канала связи для поля "Переменная"
      const contactChannelSelect = this.form.querySelector('[data-component="select"][data-name="contact-channel"]')
      this.contactValueField = this.form.querySelector('input[name="contact-value"]')
      
      if (contactChannelSelect && this.contactValueField) {
        // Обработчик изменения канала связи
        const handleChannelChange = (e) => {
          const channelValue = e.detail?.value || ''
          this.updateContactField(channelValue)
        }
        
        // Слушаем событие select:change
        contactChannelSelect.addEventListener('select:change', handleChannelChange)
        
        // Инициализируем поле при загрузке (если уже есть выбранное значение)
        const hiddenInput = contactChannelSelect.querySelector('input[type="hidden"]')
        if (hiddenInput && hiddenInput.value) {
          this.updateContactField(hiddenInput.value)
        }
      }
    }

    // Обработка ссылок "Изменить"
    const changeLinks = this.root.querySelectorAll(this.config.changeLinkSelector)
    changeLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const step = parseInt(link.dataset.step)
        if (step) {
          this.setStep(step)
        }
      })
    })
  }

  /**
   * Инициализация обработчиков для каждого шага
   */
  initStepHandlers() {
    this.steps.forEach((step, index) => {
      const stepNumber = index + 1
      const options = step.querySelectorAll(this.config.optionSelector)

      options.forEach((option) => {
        option.addEventListener('click', () => {
          this.selectOption(stepNumber, option)
        })
      })
    })
  }

  /**
   * Выбор опции на шаге
   */
  selectOption(stepNumber, option) {
    const step = this.steps[stepNumber - 1]
    if (!step) return

    // Убираем выделение с других опций этого шага
    const allOptions = step.querySelectorAll(this.config.optionSelector)
    allOptions.forEach((opt) => opt.classList.remove(this.config.selectedOptionClass))

    // Выделяем выбранную опцию
    option.classList.add(this.config.selectedOptionClass)

    // Сохраняем ответ
    const value = option.dataset.value || option.textContent.trim()
    
    // Получаем label из карточки (ищем в .card_title span или .card_size span)
    let label = value
    const titleEl = option.querySelector('.card_title span')
    if (titleEl) {
      label = titleEl.textContent.trim()
    } else {
      // Для карточек с размером (шаг 2)
      const sizeEl = option.querySelector('.card_size span')
      if (sizeEl) {
        label = sizeEl.textContent.trim()
      }
    }
    
    // Получаем изображение из карточки (нужно только для отображения в сводке)
    const img = option.querySelector('.card_img img')
      ? option.querySelector('.card_img img').getAttribute('src')
      : null

    this.answers[stepNumber] = {
      value,
      label,
      img,
    }

    // Обновляем сводку на шаге формы
    this.updateSummary(stepNumber, label, img)

    // Автоматически переходим на следующий шаг (опционально)
    // Можно убрать, если нужна ручная навигация
    // this.goToNextStep()
  }

  /**
   * Обновление сводки на шаге формы
   */
  updateSummary(stepNumber, label, img = null) {
    const step = this.steps[4] // Шаг формы (индекс 4, шаг 5)
    if (!step) return

    const summaryMap = {
      1: 'location',
      2: 'size',
      3: 'design',
      4: 'type',
    }

    const summaryKey = summaryMap[stepNumber]
    if (!summaryKey) return

    const summaryEl = step.querySelector(`[data-summary="${summaryKey}"]`)
    if (summaryEl) {
      summaryEl.textContent = label
    }

    // Обновляем изображение в сводке
    const summaryImageEl = step.querySelector(`[data-summary-image="${summaryKey}"]`)
    if (summaryImageEl) {
      if (summaryKey === 'size') {
        // Для шага размера показываем размер в специальном блоке
        const sizeValueEl = summaryImageEl.querySelector('[data-summary-size="size"]')
        if (sizeValueEl) {
          sizeValueEl.textContent = label
        }
      } else {
        // Для остальных шагов показываем изображение
        const imgEl = summaryImageEl.querySelector('img')
        if (imgEl && img) {
          imgEl.src = img
          imgEl.alt = label
        }
      }
    }
  }

  /**
   * Переход на предыдущий шаг
   */
  goToPrevStep() {
    if (this.currentStep > 1) {
      this.setStep(this.currentStep - 1)
    }
  }

  /**
   * Переход на следующий шаг
   */
  goToNextStep() {
    // Проверяем, выбран ли ответ на текущем шаге
    if (this.currentStep < 5 && !this.answers[this.currentStep]) {
      // Можно добавить визуальную индикацию ошибки
      return
    }

    // На шаге формы (5) отправляем форму вместо перехода
    if (this.currentStep === 5) {
      if (this.form) {
        this.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))
      }
      return
    }

    if (this.currentStep < this.totalSteps) {
      this.setStep(this.currentStep + 1)
    }
  }

  /**
   * Установка активного шага
   */
  setStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > this.totalSteps) {
      return
    }

    // Скрываем все шаги
    this.steps.forEach((step) => {
      step.classList.remove(this.config.activeStepClass)
    })

    // Показываем текущий шаг
    const currentStepEl = this.steps[stepNumber - 1]
    if (currentStepEl) {
      currentStepEl.classList.add(this.config.activeStepClass)
      
      // Обновляем Swiper для текущего шага после показа (чтобы избежать скачков размеров)
      this.updateSwiperForStep(currentStepEl)
    }

    this.currentStep = stepNumber

    // Обновляем прогресс
    this.updateProgress()

    // Обновляем состояние кнопок
    this.updateButtons()

    // Если перешли на шаг успеха, пересчитываем AOS и прокручиваем к нему
    if (stepNumber === 6) {
      // Даем время DOM обновиться и элементу стать видимым
      setTimeout(() => {
        const successStep = this.steps[5] // Шаг 6 (индекс 5)
        if (successStep && successStep.classList.contains(this.config.activeStepClass)) {
          // Находим родительскую секцию quiz для прокрутки
          let quizSection = this.root.closest('.section--quiz')
          // Если не нашли через closest, ищем через родителя
          if (!quizSection) {
            quizSection = this.root.closest('section.section--quiz')
          }
          // Если все еще не нашли, ищем через родителя root
          if (!quizSection && this.root.parentElement) {
            quizSection = this.root.parentElement.closest('.section--quiz')
          }
          
          if (quizSection) {
            // Получаем высоту header
            const header = document.querySelector('.header')
            const headerHeight = header ? header.offsetHeight : 0
            
            // Функция для прокрутки к секции
            const scrollToSection = () => {
              const rect = quizSection.getBoundingClientRect()
              const scrollPosition = rect.top + window.pageYOffset - headerHeight - 20
              
              window.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior: 'smooth'
              })
            }
            
            // Прокручиваем сразу
            scrollToSection()
            
            // Обновляем AOS и прокручиваем еще раз
            if (typeof window.AOS !== 'undefined') {
              setTimeout(() => {
                // Временно уменьшаем offset AOS для следующего блока
                const originalOffset = window.AOS.options.offset
                window.AOS.options.offset = 50 // Уменьшаем offset для более раннего срабатывания
                
                window.AOS.refresh()
                scrollToSection()
                
                // Восстанавливаем offset и обновляем AOS еще раз
                setTimeout(() => {
                  window.AOS.options.offset = originalOffset
                  window.AOS.refresh()
                  scrollToSection()
                }, 300)
              }, 400)
            }
          }
        }
      }, 200)
    }
  }

  /**
   * Обновление прогресс-бара
   */
  updateProgress() {
    if (this.progressBar) {
      // Прогресс рассчитывается как (текущий шаг / общее количество шагов) * 100
      // Но на шаге формы (5) показываем 100%, на шаге успеха (6) тоже 100%
      let progress = this.currentStep
      if (this.currentStep === 6) {
        progress = this.totalSteps - 1 // Шаг успеха не считается
      }
      this.progressBar.updateProgress(progress, this.totalSteps - 1)
    }
  }

  /**
   * Обновление состояния кнопок навигации
   */
  updateButtons() {
    // Кнопка "Назад"
    if (this.prevBtn) {
      if (this.currentStep === 1) {
        this.prevBtn.disabled = true
        this.prevBtn.classList.add(this.config.disabledBtnClass)
      } else {
        this.prevBtn.disabled = false
        this.prevBtn.classList.remove(this.config.disabledBtnClass)
      }
    }

    // Кнопка "Далее"
    if (this.nextBtn) {
      if (this.currentStep === this.totalSteps) {
        this.nextBtn.style.display = 'none'
      } else {
        this.nextBtn.style.display = ''
        // На шаге формы меняем текст на "Отправить"
        if (this.currentStep === 5) {
          const textEl = this.nextBtn.querySelector('.btn__quiz-text')
          if (textEl) {
            textEl.textContent = 'ОТПРАВИТЬ'
          }
        } else {
          const textEl = this.nextBtn.querySelector('.btn__quiz-text')
          if (textEl) {
            textEl.textContent = 'ДАЛЕЕ'
          }
        }
      }
    }
  }

  /**
   * Валидация формы
   */
  validateForm() {
    if (!this.form) return true

    const requiredFields = this.form.querySelectorAll('[required]')
    let isValid = true

    requiredFields.forEach((field) => {
      if (!field.value.trim()) {
        isValid = false
        field.classList.add('error')
      } else {
        field.classList.remove('error')
      }
    })

    // Валидация кастомного select
    const selectEl = this.form.querySelector('[data-component="select"]')
    if (selectEl) {
      const hiddenInput = selectEl.querySelector('input[type="hidden"]')
      if (hiddenInput && !hiddenInput.value) {
        isValid = false
        selectEl.classList.add('error')
      } else {
        selectEl.classList.remove('error')
      }
    }

    return isValid
  }

  /**
   * Обработка отправки формы
   */
  async handleFormSubmit(e) {
    e.preventDefault()

    if (!this.validateForm()) {
      return
    }

    // Создаем FormData для всех данных
    const formData = new FormData()

    // Добавляем данные из квиза (ответы на вопросы)
    Object.keys(this.answers).forEach((stepNumber) => {
      const answer = this.answers[stepNumber]
      formData.append(`quiz_step_${stepNumber}_value`, answer.value)
      formData.append(`quiz_step_${stepNumber}_label`, answer.label)
      // Изображения не добавляем в FormData, они нужны только для отображения в сводке
    })

    // Добавляем данные из формы
    const formFormData = new FormData(this.form)
    formFormData.forEach((value, key) => {
      formData.append(key, value)
    })

    // Преобразуем FormData в объект для вывода в консоль
    const formDataObject = {}
    formData.forEach((value, key) => {
      if (formDataObject[key]) {
        // Если ключ уже существует, преобразуем в массив
        if (Array.isArray(formDataObject[key])) {
          formDataObject[key].push(value)
        } else {
          formDataObject[key] = [formDataObject[key], value]
        }
      } else {
        formDataObject[key] = value
      }
    })

    // Выводим данные в консоль
    console.log('Quiz FormData:', formDataObject)
    console.log('Quiz FormData (raw):', formData)

    // Имитация отправки
    try {
      // Пример отправки:
      // const response = await fetch('/api/quiz', {
      //   method: 'POST',
      //   body: formData,
      // })
      // if (!response.ok) throw new Error('Ошибка отправки')

      // Имитация отправки
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Переходим на шаг успеха
      this.setStep(6)

      // Можно вызвать событие для других компонентов
      this.root.dispatchEvent(
        new CustomEvent('quiz:submit', {
          detail: { formData: formDataObject, rawFormData: formData },
          bubbles: true,
        }),
      )
    } catch (error) {
      console.error('Quiz: ошибка отправки формы', error)
      // Можно показать сообщение об ошибке
    }
  }

  /**
   * Обновление поля контакта в зависимости от выбранного канала связи
   */
  updateContactField(channelValue) {
    if (!this.contactValueField) return

    // Удаляем предыдущую маску телефона, если она была
    if (this.phoneMaskInstance) {
      // Удаляем обработчики событий
      const input = this.phoneMaskInstance.input
      if (input) {
        // Клонируем элемент, чтобы удалить все обработчики
        const newInput = input.cloneNode(true)
        input.parentNode.replaceChild(newInput, input)
        this.contactValueField = newInput
      }
      this.phoneMaskInstance = null
    }

    // Очищаем поле
    this.contactValueField.value = ''
    this.contactValueField.removeAttribute('inputmode')

    // Настройки для разных каналов связи
    const configs = {
      phone: {
        type: 'tel',
        placeholder: 'Номер телефона',
        applyMask: true,
      },
      whatsapp: {
        type: 'tel',
        placeholder: 'Номер WhatsApp',
        applyMask: true,
      },
      email: {
        type: 'email',
        placeholder: 'Email адрес',
        applyMask: false,
      },
      telegram: {
        type: 'text',
        placeholder: 'Telegram username',
        applyMask: false,
      },
    }

    const config = configs[channelValue] || {
      type: 'text',
      placeholder: 'Переменная',
      applyMask: false,
    }

    // Применяем настройки
    this.contactValueField.type = config.type
    this.contactValueField.placeholder = config.placeholder

    // Применяем маску телефона только для phone и whatsapp
    if (config.applyMask) {
      // Убеждаемся, что поле имеет type="tel" перед применением маски
      this.contactValueField.type = 'tel'
      this.phoneMaskInstance = new PhoneMask(this.contactValueField)
    } else {
      // Убираем атрибуты, связанные с телефоном
      this.contactValueField.removeAttribute('inputmode')
      // Для email и telegram убеждаемся, что type правильный
      if (config.type === 'email') {
        this.contactValueField.type = 'email'
      } else {
        this.contactValueField.type = 'text'
      }
    }
  }

  /**
   * Обновление Swiper для шага (чтобы избежать скачков размеров при переключении)
   */
  updateSwiperForStep(stepEl) {
    if (!stepEl) return
    
    // Находим контейнер с опциями
    const optionsContainer = stepEl.querySelector('.quiz_step__options')
    if (!optionsContainer) return
    
    // Проверяем, инициализирован ли Swiper для этого контейнера
    if (optionsContainer.dataset.rsMounted === 'true') {
      // Swiper сохраняет экземпляр в свойстве swiper элемента
      // Также можно найти через класс .swiper внутри контейнера
      const swiperEl = optionsContainer.classList.contains('swiper') 
        ? optionsContainer 
        : optionsContainer.querySelector('.swiper')
      
      if (swiperEl) {
        const swiperInstance = swiperEl.swiper
        if (swiperInstance && typeof swiperInstance.update === 'function') {
          // Обновляем Swiper после небольшой задержки, чтобы DOM успел обновиться
          setTimeout(() => {
            swiperInstance.update()
            swiperInstance.updateSlides()
            swiperInstance.updateSize()
          }, 100)
        }
      }
    }
  }

  /**
   * Получить все ответы
   */
  getAnswers() {
    return { ...this.answers }
  }

  /**
   * Сброс квиза
   */
  reset() {
    this.currentStep = 1
    this.answers = {}
    this.steps.forEach((step) => {
      const options = step.querySelectorAll(this.config.optionSelector)
      options.forEach((opt) => opt.classList.remove(this.config.selectedOptionClass))
    })
    if (this.form) {
      this.form.reset()
    }
    this.setStep(1)
  }
}

// Экспортируем также QuizProgress для обратной совместимости
export { QuizProgress } from './quiz-progress.js'
