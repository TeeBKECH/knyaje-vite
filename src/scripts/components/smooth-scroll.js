// Настройки
const MOBILE_BP = 768 // px, ширина, ниже которой считаем "мобилкой"
const OFFSETS = {
  mobile: 80, // px
  desktop: 110, // px
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

function getAnchorOffset() {
  return window.innerWidth < MOBILE_BP ? OFFSETS.mobile : OFFSETS.desktop
}

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]:not([href="#"])')
  if (!a) return

  const id = a.getAttribute('href').slice(1)
  if (!id) return

  const target = document.getElementById(id)
  if (!target) return

  e.preventDefault()

  const offset = getAnchorOffset()
  const rect = target.getBoundingClientRect()
  const targetY = Math.max(0, window.scrollY + rect.top - offset)

  window.scrollTo({
    top: targetY,
    behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
  })

  // Обновим URL без мгновенного прыжка и сохраним историю
  // history.pushState(null, '', `#${id}`)

  // Для доступности: фокус на секцию, без доп. прокрутки
  if (!target.hasAttribute('tabindex')) {
    target.setAttribute('tabindex', '-1')
  }
  target.focus({ preventScroll: true })
})
