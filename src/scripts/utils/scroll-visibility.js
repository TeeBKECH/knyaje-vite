/**
 * Переиспользуемая утилита: показ/скрытие UI в зависимости от направления скролла.
 * Логика: скролл вниз → onHide, скролл вверх (или у порога) → onShow.
 *
 * Удобная обёртка — attachScrollVisibility: вешает на элемент класс (по умолчанию
 * "hidden-by-scroll") в зависимости от направления. Стили скрытия задаёте сами
 * в компоненте: .bottom-nav.hidden-by-scroll { transform: translateY(100%); },
 * .scroll-to-top.hidden-by-scroll { opacity: 0; pointer-events: none; } и т.д.
 *
 * @example Нижнее меню: показывать при скролле вверх, скрывать при скролле вниз
 * attachScrollVisibility(document.querySelector('.bottom-nav'), { threshold: 60, minDelta: 25 })
 *
 * @example Кнопка «Наверх»: показывать при скролле вниз, скрывать при скролле вверх (invert)
 * attachScrollVisibility(document.querySelector('.scroll-to-top'), { invert: true, threshold: 300 })
 */

/**
 * @param {{
 *   threshold?: number;
 *   minDelta?: number;
 *   onShow?: () => void;
 *   onHide?: () => void;
 * }} options
 * @returns {{ destroy: () => void; subscribe: (handlers: { onShow?: () => void; onHide?: () => void }) => () => void; isVisible: () => boolean; setVisible: (visible: boolean) => void }}
 */
export function initScrollVisibility(options = {}) {
  const { threshold = 80, minDelta = 40, onShow: onShowOption, onHide: onHideOption } = options

  let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0
  let visible = true
  let rafId = null
  let accumulatedDown = 0
  let accumulatedUp = 0
  const subscribers = []

  function notifyShow() {
    visible = true
    accumulatedDown = 0
    accumulatedUp = 0
    onShowOption?.()
    subscribers.forEach((s) => s.onShow?.())
  }

  function notifyHide() {
    visible = false
    accumulatedDown = 0
    accumulatedUp = 0
    onHideOption?.()
    subscribers.forEach((s) => s.onHide?.())
  }

  function onScroll() {
    const scrollY = window.scrollY
    const delta = scrollY - lastScrollY
    lastScrollY = scrollY
    rafId = null

    if (scrollY <= threshold) {
      if (!visible) notifyShow()
      return
    }

    if (delta > 0) {
      accumulatedDown += delta
      accumulatedUp = Math.max(0, accumulatedUp - delta)
      if (accumulatedDown > minDelta && visible) notifyHide()
    } else if (delta < 0) {
      accumulatedUp += -delta
      accumulatedDown = Math.max(0, accumulatedDown + delta)
      if (accumulatedUp > minDelta && !visible) notifyShow()
    }
  }

  function handleScroll() {
    if (rafId == null) {
      rafId = requestAnimationFrame(onScroll)
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })

  // Инициализация: если уже ниже порога, считаем видимым (показываем)
  if (lastScrollY > threshold) {
    lastScrollY = window.scrollY
  }

  return {
    destroy() {
      window.removeEventListener('scroll', handleScroll, { passive: true })
      if (rafId != null) cancelAnimationFrame(rafId)
      subscribers.length = 0
    },

    /**
     * Подписаться на show/hide (удобно для второй кнопки, например scroll-to-top).
     * @returns unsubscribe
     */
    subscribe(handlers) {
      subscribers.push(handlers)
      return () => {
        const i = subscribers.indexOf(handlers)
        if (i !== -1) subscribers.splice(i, 1)
      }
    },

    isVisible: () => visible,

    setVisible(value) {
      if (value !== visible) {
        if (value) notifyShow()
        else notifyHide()
      }
    },
  }
}

/** Класс по умолчанию для скрытия по скроллу — вешайте стили на .your-block.hidden-by-scroll */
export const HIDDEN_BY_SCROLL_CLASS = 'hidden-by-scroll'

/**
 * Вешает на элемент класс (по умолчанию hidden-by-scroll) в зависимости от скролла.
 * Без invert: скролл вниз → добавляем класс (скрыли), скролл вверх → снимаем.
 * С invert: true — наоборот (для кнопки scroll-to-top: видна, когда пользователь проскроллил вниз).
 *
 * @param {HTMLElement | string} element — элемент или селектор
 * @param {{
 *   hiddenClass?: string;
 *   invert?: boolean;
 *   threshold?: number;
 *   minDelta?: number;
 * }} options
 * @returns {{ destroy: () => void; scrollVisibility: ReturnType<typeof initScrollVisibility> }}
 */
export function attachScrollVisibility(element, options = {}) {
  const {
    hiddenClass = HIDDEN_BY_SCROLL_CLASS,
    invert = false,
    threshold = 80,
    minDelta = 40,
  } = options

  const el = typeof element === 'string' ? document.querySelector(element) : element
  if (!el) return { destroy: () => {}, scrollVisibility: null }

  const scrollVisibility = initScrollVisibility({
    threshold,
    minDelta,
    onShow: () => {
      if (invert) el.classList.add(hiddenClass)
      else el.classList.remove(hiddenClass)
    },
    onHide: () => {
      if (invert) el.classList.remove(hiddenClass)
      else el.classList.add(hiddenClass)
    },
  })

  return {
    destroy: () => scrollVisibility.destroy(),
    scrollVisibility,
  }
}
