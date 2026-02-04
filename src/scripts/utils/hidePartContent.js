/**
 * Скрывает часть контента по высоте с градиентным overlay и кнопкой раскрытия.
 *
 * @param {string|NodeList|HTMLElement} containerSelector - CSS-селектор, NodeList или элемент контейнеров
 * @param {number} maxHeight - максимальная высота в пикселях
 * @param {object} options
 *  - showText: текст кнопки "показать" (по умолчанию "Показать всё")
 *  - hideText: текст кнопки "скрыть" (по умолчанию "Скрыть")
 *  - btnClass: класс кнопки (по умолчанию "hide-content-btn")
 *  - gradientHeight: высота градиента в пикселях (по умолчанию 40)
 *  - gradientColor: цвет градиента в конце (по умолчанию белый)
 *  - gradientFrom: цвет градиента в начале (по умолчанию прозрачный)
 */
export function hidePartContent(containerSelector, maxHeight, options = {}) {
  const containers =
    typeof containerSelector === 'string'
      ? document.querySelectorAll(containerSelector)
      : containerSelector instanceof NodeList
        ? containerSelector
        : containerSelector instanceof HTMLElement
          ? [containerSelector]
          : []

  if (!containers.length) return

  const SHOW_TEXT = options.showText || 'Показать всё'
  const HIDE_TEXT = options.hideText || 'Скрыть'
  const BTN_CLASS = options.btnClass || 'hide-content-btn'
  const GRADIENT_HEIGHT = options.gradientHeight || 40
  const GRADIENT_FROM = options.gradientFrom || 'rgba(255, 255, 255, 0)'
  const GRADIENT_COLOR = options.gradientColor || 'rgba(255, 255, 255, 1)'

  containers.forEach((container) => {
    // Временно убираем ограничения для измерения реальной высоты
    const tempMaxHeight = container.style.maxHeight
    const tempOverflow = container.style.overflow
    container.style.maxHeight = 'none'
    container.style.overflow = 'visible'

    // Проверяем, нужна ли обрезка
    const originalHeight = container.scrollHeight

    // Восстанавливаем временные стили
    container.style.maxHeight = tempMaxHeight
    container.style.overflow = tempOverflow

    if (originalHeight <= maxHeight) {
      // Контент помещается, обрезка не нужна
      return
    }

    // Сохраняем полную высоту для плавной анимации
    const fullHeight = originalHeight

    // Устанавливаем стили для обрезки
    container.style.maxHeight = `${maxHeight}px`
    container.style.overflow = 'hidden'
    container.style.position = 'relative'
    // Улучшенная плавная анимация с более длительным временем и плавным easing
    container.style.transition = 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)'

    // Создаём overlay с градиентом
    const overlay = document.createElement('div')
    overlay.className = 'hide-content-overlay'
    overlay.style.position = 'absolute'
    overlay.style.bottom = '0'
    overlay.style.left = '0'
    overlay.style.right = '0'
    overlay.style.height = `${GRADIENT_HEIGHT}px`
    overlay.style.background = `linear-gradient(to bottom, ${GRADIENT_FROM}, ${GRADIENT_COLOR})`
    overlay.style.pointerEvents = 'none'
    overlay.style.zIndex = '10'
    // Синхронизируем анимацию градиента с анимацией контейнера
    overlay.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)'

    // Вставляем overlay в контейнер
    container.appendChild(overlay)

    // Создаём кнопку
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = SHOW_TEXT
    btn.className = BTN_CLASS
    btn.style.cursor = 'pointer'

    // Вставляем кнопку после контейнера
    container.insertAdjacentElement('afterend', btn)

    // Состояние раскрытия
    let expanded = false

    // Обработчик клика
    btn.addEventListener('click', () => {
      expanded = !expanded
      if (expanded) {
        // Раскрываем контент - используем сохраненную полную высоту для плавной анимации
        container.style.maxHeight = `${fullHeight}px`
        overlay.style.opacity = '0'
        btn.textContent = HIDE_TEXT
      } else {
        // Скрываем контент
        container.style.maxHeight = `${maxHeight}px`
        overlay.style.opacity = '1'
        btn.textContent = SHOW_TEXT
        // Прокручиваем к началу контейнера
        setTimeout(() => {
          container.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 100)
      }
    })
  })
}
