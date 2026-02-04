export function initCopyTo(options = {}) {
  const {
    root = document,
    btnSelector = '.copy-to_btn',
    wrapSelector = '.copy-to',
    codeSelector = '.copy-to_promocode',
    successText = 'Скопировано!',
    failText = 'Не удалось скопировать',
    onCopy,
  } = options

  async function copyText(text) {
    if (!text) return
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      ta.style.pointerEvents = 'none'
      ta.style.inset = '0 auto auto 0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  function showToast(btn, message) {
    const prev = btn.querySelector('.copy-to_toast')
    if (prev) prev.remove()

    const toast = document.createElement('span')
    toast.className = 'copy-to_toast'
    toast.setAttribute('role', 'status')
    toast.setAttribute('aria-live', 'polite')
    toast.textContent = message
    btn.appendChild(toast)
    toast.addEventListener('animationend', () => toast.remove(), { once: true })
  }

  const handler = async (e) => {
    const btn = e.target.closest(btnSelector)
    if (!btn || !root.contains(btn)) return

    const wrap = btn.closest(wrapSelector)
    const codeEl = wrap?.querySelector(codeSelector)
    const code = codeEl?.textContent?.trim()
    if (!code) return

    try {
      await copyText(code)
      onCopy?.({ button: btn, code, ok: true })
      // Локализация через data-атрибуты на кнопке (необязательно)
      showToast(btn, btn.dataset.copySuccess || successText)
      btn.dispatchEvent(new CustomEvent('copy-to:success', { bubbles: true, detail: { code } }))
    } catch (error) {
      onCopy?.({ button: btn, code, ok: false, error })
      showToast(btn, btn.dataset.copyFail || failText)
      btn.dispatchEvent(
        new CustomEvent('copy-to:error', { bubbles: true, detail: { code, error } }),
      )
      // console.error(error);
    }
  }

  root.addEventListener('click', handler)
  return () => root.removeEventListener('click', handler)
}
