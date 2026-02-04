// Храним фиксированное значение высоты viewport для предотвращения скачков при скролле
let fixedViewportHeight = 0
let isScrolling = false
let scrollTimeout = null
let lastWindowWidth = window.innerWidth

/**
 * Устанавливает CSS переменную --vh с реальной высотой viewport
 * Решает проблему с 100vh на мобильных устройствах, где браузерный UI
 * (адресная строка и т.д.) может скрывать контент
 */
export function setViewportHeight() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight

  // Фиксируем максимальное значение
  if (viewportHeight > fixedViewportHeight) {
    fixedViewportHeight = viewportHeight
  }

  const vh = fixedViewportHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

/**
 * Устанавливает CSS переменную --height-h с реальной высотой хедера
 */
export function setHeaderHeight() {
  const header = document.querySelector('.header')
  if (header) {
    document.documentElement.style.setProperty('--height-h', `${header.offsetHeight}px`)
  }
}

/**
 * Инициализирует отслеживание высоты viewport и хедера
 */
export function initViewportHeight() {
  const isMobile = window.innerWidth <= 992

  // Блокируем обновления во время скролла
  window.addEventListener(
    'scroll',
    () => {
      isScrolling = true
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        isScrolling = false
      }, 500)
    },
    { passive: true },
  )

  // Инициализация значений
  const initHeights = () => {
    fixedViewportHeight = 0
    setViewportHeight()
    setHeaderHeight()

    // На мобильных делаем несколько попыток для фиксации максимального значения
    if (isMobile) {
      requestAnimationFrame(() => {
        setViewportHeight()
        setTimeout(() => setViewportHeight(), 300)
        setTimeout(() => setViewportHeight(), 1000)
      })
    }
  }

  // Инициализируем при готовности DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeights)
  } else {
    requestAnimationFrame(initHeights)
  }

  // Обновляем после полной загрузки
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        setViewportHeight()
        setHeaderHeight()
      }, 100)
    })
  }

  // Обновляем при изменении размера окна (только если не скроллим)
  let resizeTimeout
  window.addEventListener('resize', () => {
    // Игнорируем resize во время скролла на мобильных
    if (isMobile && isScrolling) {
      return
    }

    const currentWidth = window.innerWidth
    const widthChanged = Math.abs(currentWidth - lastWindowWidth) > 5

    // Обновляем только при изменении ширины (реальное изменение размера окна)
    if (widthChanged) {
      lastWindowWidth = currentWidth
      fixedViewportHeight = 0 // Сбрасываем для пересчета
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        setViewportHeight()
        setHeaderHeight()
      }, 100)
    }
  })

  // Обновляем при изменении ориентации
  window.addEventListener('orientationchange', () => {
    fixedViewportHeight = 0
    setTimeout(() => {
      setViewportHeight()
      setHeaderHeight()
    }, 100)
  })

  // Отслеживаем изменения хедера
  const header = document.querySelector('.header')
  if (header && typeof MutationObserver !== 'undefined') {
    new MutationObserver(setHeaderHeight).observe(header, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true,
    })
  }
}
