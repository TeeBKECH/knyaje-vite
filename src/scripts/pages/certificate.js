function whenDomReady(cb) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cb, { once: true })
  } else {
    cb()
  }
}

function initCertificateWidget() {
  const container = document.getElementById('certificate_widget')
  if (!container) return

  // Не дублируем скрипт при повторных инициализациях (dev/HMR)
  const existing = document.querySelector('script[src*="widget.metechcards.ru/widget/"]')
  if (existing) return

  const params = [
    'client_id=92f77716-6109-b7b0-eef0-c4e6ccdae6b0',
    'color_denomination_cert=%23b89b60',
    'color_bage_sale=green',
    'color_bage_gift=gift',
    'color_bage_sale_text=white',
    'color_bage_gift_text=white',
    'color_price_old=grey',
    'color_button=%23797a7f',
    'color_button_text=black',
    'color_denomination_text=white',
    'color_background=%2314161b',
    'color_denomination_description=white',
  ]

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.async = true
  script.src = `https://widget.metechcards.ru/widget/?${params.join('&')}`
  document.body.appendChild(script)
}

function initCertificateYmGoals() {
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  let tries = 0
  const MAX_TRIES = 80 // ~24 секунды при 300мс

  const timer = setInterval(() => {
    tries += 1

    const sbpButton = document.querySelector('.form__button_sbp')
    const cardButton = document.querySelector('.form__button_card')
    const emailInput = document.querySelector('input[name="email"]')

    if (sbpButton && cardButton && emailInput) {
      const bindOnce = (btn, goal) => {
        if (btn.dataset.ymBound === '1') return
        btn.dataset.ymBound = '1'

        btn.addEventListener('click', () => {
          const email = emailInput.value.trim()
          if (!email || !isValidEmail(email)) return

          if (typeof window.ym === 'function') {
            window.ym(98084796, 'reachGoal', goal)
          }
        })
      }

      bindOnce(sbpButton, 'sbp_click')
      bindOnce(cardButton, 'card_click')

      clearInterval(timer)
      return
    }

    if (tries >= MAX_TRIES) {
      clearInterval(timer)
    }
  }, 300)
}

export function init() {
  whenDomReady(() => {
    initCertificateWidget()
    initCertificateYmGoals()
  })
}
