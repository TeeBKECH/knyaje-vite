document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('playerPickerModal')
  if (!modal) {
    console.warn('[player-picker] Модалка #playerPickerModal не найдена в DOM.')
  }

  const backdrop = modal ? modal.querySelector('.player-picker-modal__backdrop') : null
  const closeBtn = modal ? modal.querySelector('.player-picker-modal__close') : null
  const providerGrid = modal ? modal.querySelector('.player-picker-modal__grid') : null

  let lastFocusedEl = null

  function openModal(targetId) {
    if (!modal) return
    lastFocusedEl = document.activeElement
    modal.classList.add('open')
    modal.setAttribute('aria-hidden', 'false')
    modal.dataset.targetId = targetId
    // Фокус на первую кнопку
    const first = providerGrid?.querySelector('[data-provider]') || closeBtn
    first?.focus()
  }

  function closeModal() {
    if (!modal) return
    modal.classList.remove('open')
    modal.setAttribute('aria-hidden', 'true')
    delete modal.dataset.targetId
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      lastFocusedEl.focus()
    }
  }

  function embedIframe(container, url) {
    if (!container || !url) return
    const iframe = document.createElement('iframe')
    iframe.src = url
    iframe.loading = 'lazy'
    iframe.setAttribute('allowfullscreen', '')
    iframe.setAttribute('frameborder', '0')
    iframe.referrerPolicy = 'strict-origin-when-cross-origin'
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen',
    )

    container.classList.add('post_media-embed')
    container.innerHTML = ''
    const wrap = document.createElement('div')
    wrap.className = 'embed'
    wrap.appendChild(iframe)
    container.appendChild(wrap)
  }

  // Достаём URL из data-* атрибутов контейнера
  function buildUrl(container, provider) {
    if (!container) return null
    const autoplay = Number(container.dataset.autoplay ?? 1) ? 1 : 0
    const start = Math.max(0, Number(container.dataset.start ?? 0))
    if (provider === 'youtube') {
      const raw =
        container.dataset.youtube ||
        (container.dataset.youtubeId &&
          `https://www.youtube.com/embed/${encodeURIComponent(container.dataset.youtubeId)}`)
      if (!raw) return null
      return addParams(raw, { autoplay, start, rel: 0, modestbranding: 1, playsinline: 1 })
    }
    if (provider === 'vk') {
      const raw =
        container.dataset.vk ||
        (container.dataset.vkOid && container.dataset.vkId && container.dataset.vkHash
          ? `https://vkvideo.ru/video_ext.php?oid=${encodeURIComponent(container.dataset.vkOid)}&id=${encodeURIComponent(container.dataset.vkId)}&hash=${encodeURIComponent(container.dataset.vkHash)}`
          : null)
      if (!raw) return null
      return addParams(raw, { autoplay, t: start })
    }
    return null
  }

  function addParams(url, params) {
    try {
      const u = new URL(url, location.origin)
      Object.entries(params).forEach(([k, v]) => {
        if (v != null) u.searchParams.set(k, v)
      })
      return u.toString()
    } catch {
      const sep = url.includes('?') ? '&' : '?'
      const query = Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')
      return query ? url + sep + query : url
    }
  }

  // === Обработчики ТОЛЬКО на нужных узлах ===

  // 1) Кнопки Play
  const playButtons = document.querySelectorAll('[data-fn-play-media], [data-fn-play-madia]')
  playButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.fnPlayMedia || btn.dataset.fnPlayMadia
      if (!targetId) return

      // Открываем модалку выбора
      openModal(targetId)
    })
  })

  // 2) Клик по провайдеру (делегирование ВНУТРИ модалки)
  providerGrid?.addEventListener('click', (e) => {
    const providerBtn = e.target.closest('[data-provider]')
    if (!providerBtn || !modal?.classList.contains('open')) return

    const targetId = modal.dataset.targetId
    const container = targetId ? document.getElementById(targetId) : null
    const provider = providerBtn.dataset.provider // 'youtube' | 'vk'
    const url = buildUrl(container, provider)

    if (!url) {
      alert('Для этого блока не задан URL/ID для выбранного плеера.')
      return
    }
    embedIframe(container, url)
    closeModal()
  })

  // 3) Закрытие модалки
  backdrop?.addEventListener('click', closeModal)
  closeBtn?.addEventListener('click', closeModal)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeModal()
  })
})
