// Состояние модальных окон
const modalState = new Map()

// Конфигурация модалок
const modalConfigs = new Map()

// Инициализация модальной системы
export function initModalSystem() {
  document.addEventListener('click', handleModalTriggers)
  document.addEventListener('keydown', handleEscapePress)
  document.addEventListener('focusin', handleFocusTriggers)
}

// Обработчик кликов по триггерам
function handleModalTriggers(event) {
  const trigger = event.target.closest('[data-modal]')
  if (!trigger) return

  const modalId = trigger.dataset.modal
  const action = trigger.dataset.modalAction || 'toggle'

  if (action === 'toggle') {
    toggleModal(modalId)
  } else if (action === 'open') {
    openModal(modalId)
  } else if (action === 'close') {
    closeModal(modalId)
  }
}

// Обработчик фокуса (для поиска и т.д.)
function handleFocusTriggers(event) {
  const trigger = event.target.closest('[data-modal-on-focus]')
  if (!trigger) return

  const modalId = trigger.dataset.modalOnFocus
  openModal(modalId)
}

// Обработчик Escape
function handleEscapePress(event) {
  if (event.key === 'Escape') {
    closeAllModals()
  }
}

// Регистрация модального окна
export function registerModal(modalId, options = {}) {
  const modalElement = document.getElementById(modalId)
  if (!modalElement) return

  const config = {
    closeOnBackdrop: true,
    closeOnEscape: true,
    exclusive: false,
    onOpen: null,
    onClose: null,
    ...options,
  }

  modalConfigs.set(modalId, config)
  modalState.set(modalId, false)

  // Обработчик клика по бэкдропу
  modalElement.addEventListener('click', (event) => {
    if (event.target === modalElement && config.closeOnBackdrop) {
      closeModal(modalId)
    }
  })

  // Обработчики закрытия
  const closeButtons = modalElement.querySelectorAll('[data-close]')
  closeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      console.log(button.dataset.close)

      const closeModalId = button.dataset.close || modalId
      closeModal(closeModalId)
    })
  })
}

// Открытие модалки
export function openModal(modalId) {
  const modalElement = document.getElementById(modalId)
  const config = modalConfigs.get(modalId)
  const isCurrentlyOpen = modalState.get(modalId)

  if (!modalElement || !config || isCurrentlyOpen) return

  // Закрываем другие эксклюзивные модалки
  if (config.exclusive) {
    closeAllModals(modalId)
  }

  // Показываем модалку
  modalElement.style.display = 'block'
  modalElement.setAttribute('aria-hidden', 'false')
  modalState.set(modalId, true)

  // Добавляем класс для анимации после отрисовки
  requestAnimationFrame(() => {
    modalElement.classList.add('open')
  })

  // Блокируем скролл body
  updateBodyScroll()

  // Колбэк при открытии
  if (typeof config.onOpen === 'function') {
    config.onOpen(modalElement)
  }

  // Фокусируемся на первом инпуте или на модалке
  // focusFirstInput(modalElement)
}

// Закрытие модалки
export function closeModal(modalId) {
  const modalElement = document.getElementById(modalId)
  const config = modalConfigs.get(modalId)
  const isCurrentlyOpen = modalState.get(modalId)

  if (!modalElement || !config || !isCurrentlyOpen) return

  // Убираем класс для анимации закрытия
  modalElement.classList.remove('open')

  // Обновляем состояние сразу
  modalState.set(modalId, false)

  // Колбэк при закрытии вызываем сразу для синхронизации анимаций
  if (typeof config.onClose === 'function') {
    config.onClose(modalElement)
  }

  // Восстанавливаем скролл сразу
  updateBodyScroll()

  // Ждем окончания анимации перед скрытием
  setTimeout(() => {
    modalElement.style.display = 'none'
    modalElement.setAttribute('aria-hidden', 'true')
  }, 300) // Время анимации должно совпадать с CSS transition
}

// Переключение модалки
export function toggleModal(modalId) {
  const isOpen = modalState.get(modalId)
  if (isOpen) {
    closeModal(modalId)
  } else {
    openModal(modalId)
  }
}

// Закрытие всех модалок
export function closeAllModals(exceptModalId = null) {
  modalState.forEach((isOpen, modalId) => {
    if (isOpen && modalId !== exceptModalId) {
      closeModal(modalId)
    }
  })
}

// Обновление скролла body
export function updateBodyScroll() {
  const hasOpenModals = Array.from(modalState.values()).some((isOpen) => isOpen)

  if (hasOpenModals) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

// Фокус на первом инпуте
export function focusFirstInput(modalElement) {
  const focusable = modalElement.querySelector(
    'input, button, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  if (focusable) {
    focusable.focus()
  }
}

// Получение состояния модалки
export function isModalOpen(modalId) {
  return modalState.get(modalId) || false
}

// Получение списка открытых модалок
export function getOpenModals() {
  return Array.from(modalState.entries())
    .filter(([_, isOpen]) => isOpen)
    .map(([modalId]) => modalId)
}
