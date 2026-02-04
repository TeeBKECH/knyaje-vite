// Ad Banner
;(() => {
  const banner = document.querySelector('.ad_banner-top')
  if (!banner) return

  const root = document.documentElement

  let bannerInView = true
  let ticking = false

  function applyOffset(px) {
    root.style.setProperty('--ad-safe-top', `${Math.max(0, Math.round(px))}px`)
  }

  function updateOffset() {
    ticking = false
    const rect = banner.getBoundingClientRect()
    // Сколько пикселей баннер «занимает» сверху во вьюпорте прямо сейчас
    const visibleBottom = Math.max(0, Math.min(rect.bottom, window.innerHeight))
    // Клац на высоту баннера, чтобы отступ не превышал его полного размера
    const clamped = Math.min(visibleBottom, rect.height)
    applyOffset(clamped)
  }

  function onScroll() {
    // Если баннер вне экрана — отступ 0 и дальше ничего не считаем
    if (!bannerInView) {
      applyOffset(0)
      return
    }
    if (!ticking) {
      ticking = true
      requestAnimationFrame(updateOffset)
    }
  }

  // Следим за видимостью баннера
  const io = new IntersectionObserver(
    ([entry]) => {
      bannerInView = entry.isIntersecting
      if (!bannerInView) {
        applyOffset(0)
      } else {
        updateOffset()
      }
    },
    { root: null, threshold: 0 },
  )

  io.observe(banner)

  // Следим за изменением размеров (картинка в баннере может загрузиться позже)
  const ro = new ResizeObserver(() => updateOffset())
  ro.observe(banner)

  // Обновляем при ресайзе/скролле
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', () => requestAnimationFrame(updateOffset))

  // На случай, если картинка в баннере подгружается
  const img = banner.querySelector('img')
  if (img && !img.complete) {
    img.addEventListener('load', () => updateOffset(), { once: true })
  }

  // Первичная установка
  updateOffset()
})()
