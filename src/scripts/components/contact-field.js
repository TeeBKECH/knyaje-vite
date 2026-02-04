import { PhoneMask } from './phone-mask.js'

/**
 * Класс для управления полем контакта на основе выбранного канала связи
 * @class ContactField
 */
export class ContactField {
  constructor(form) {
    this.form = form
    this.contactValueField = null
    this.contactChannelSelect = null
    this.phoneMaskInstance = null
    
    this.init()
  }
  
  init() {
    if (!this.form) return
    
    // Находим select для выбора канала связи
    this.contactChannelSelect = this.form.querySelector('[data-component="select"][data-name="contact-channel"]')
    // Находим поле для ввода значения контакта
    this.contactValueField = this.form.querySelector('input[name="contact-value"][data-quiz-contact-field]')
    
    if (!this.contactChannelSelect || !this.contactValueField) {
      return
    }
    
    // Обработчик изменения канала связи
    const handleChannelChange = (e) => {
      const channelValue = e.detail?.value || ''
      this.updateContactField(channelValue)
    }
    
    // Слушаем событие select:change
    this.contactChannelSelect.addEventListener('select:change', handleChannelChange)
    
    // Инициализируем поле при загрузке (если уже есть выбранное значение)
    const hiddenInput = this.contactChannelSelect.querySelector('input[type="hidden"]')
    if (hiddenInput && hiddenInput.value) {
      this.updateContactField(hiddenInput.value)
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
}

// Хранилище для экземпляров ContactField, чтобы избежать дублирования
const contactFieldInstances = new WeakMap()

/**
 * Инициализация функционала обновления поля контакта для всех форм
 */
export function initContactFields() {
  const forms = document.querySelectorAll('form')
  const contactFields = []
  
  forms.forEach((form) => {
    // Проверяем, есть ли в форме select с name="contact-channel" и поле с data-quiz-contact-field
    const hasContactChannel = form.querySelector('[data-component="select"][data-name="contact-channel"]')
    const hasContactValue = form.querySelector('input[name="contact-value"][data-quiz-contact-field]')
    
    if (hasContactChannel && hasContactValue) {
      // Проверяем, не инициализирован ли уже этот экземпляр
      if (!contactFieldInstances.has(form)) {
        const contactField = new ContactField(form)
        contactFieldInstances.set(form, contactField)
        contactFields.push(contactField)
      }
    }
  })
  
  return contactFields
}
