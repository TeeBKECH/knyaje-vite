/**
 * Параллакс эффект для интро блоков
 * При скролле вниз фон интро блока двигается медленнее, создавая эффект глубины
 */
export function initIntroParallax() {
  const introSections = document.querySelectorAll('.intro')
  if (!introSections.length) return

  // Проверяем, поддерживает ли устройство параллакс (отключаем на мобильных для производительности)
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isMobile = window.matchMedia('(max-width: 991px)').matches

  if (prefersReducedMotion || isMobile) {
    return // Отключаем параллакс на мобильных и для пользователей с настройкой reduced motion
  }

  introSections.forEach((introSection) => {
    const bgContainer = introSection.querySelector('.intro_bg')
    const bgImg = introSection.querySelector('.intro_bg_img')
    if (!bgContainer || !bgImg) return

    // Коэффициент параллакса (более сильный эффект)
    const parallaxSpeed = 0.7

    // Оптимизация: устанавливаем will-change один раз
    bgImg.style.willChange = 'transform'
    bgContainer.style.willChange = 'transform'

    let ticking = false

    function updateParallax() {
      const rect = introSection.getBoundingClientRect()
      const windowHeight = window.innerHeight

      // Вычисляем, насколько интро блок виден в viewport
      // Если блок полностью вышел за пределы экрана, не применяем параллакс
      if (rect.bottom < 0 || rect.top > windowHeight) {
        bgImg.style.transform = 'translateY(0)'
        ticking = false
        return
      }

      // Вычисляем смещение на основе позиции блока относительно viewport
      // Когда блок вверху экрана (rect.top = 0), смещение = 0
      // Когда блок скроллится вниз, rect.top становится отрицательным
      const scrollProgress = -rect.top
      const parallaxOffset = scrollProgress * parallaxSpeed

      // Применяем transform для сильного параллакс эффекта
      bgImg.style.transform = `translateY(${parallaxOffset}px)`

      ticking = false
    }

    function requestTick() {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax)
        ticking = true
      }
    }

    // Инициализируем при загрузке
    updateParallax()

    // Отслеживаем скролл
    window.addEventListener('scroll', requestTick, { passive: true })

    // Обновляем при изменении размера окна
    window.addEventListener('resize', () => {
      updateParallax()
    }, { passive: true })
  })
}
