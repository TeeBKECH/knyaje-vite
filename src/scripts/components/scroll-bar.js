// custom-scrollbar.js
export function attachCustomScrollbar(
  container,
  {
    offsetRight = 30, // отступ справа от контейнера (px)
    trackWidth = 1, // толщина трека (px)
    trackColor = '#3D3D3D', // цвет трека
    thumbWidth = 6, // ширина ползунка (px)
    thumbColor = '#4D4D4D', // цвет ползунка
    minThumbPx = 20, // минимальная высота ползунка (px)
  } = {},
) {
  // if (!container) throw new Error('attachCustomScrollbar: container is required')
  if (!container) return

  // Оборачиваем контейнер для позиционирования скролла
  const wrap = document.createElement('div')
  wrap.className = 'cs-wrap'
  wrap.style.paddingRight = `${offsetRight}px`
  container.parentNode.insertBefore(wrap, container)
  wrap.appendChild(container)

  // Скрываем визуально нативный скролл, но оставляем функциональность
  container.classList.add('u-hide-native-scroll')

  // Создаём DOM кастомного скролла
  const sc = document.createElement('div')
  sc.className = 'cs-scroll'
  sc.style.left = `100%`
  sc.style.width = `${Math.max(thumbWidth, trackWidth)}px`
  wrap.appendChild(sc)

  const track = document.createElement('div')
  track.className = 'cs-track'
  track.style.left = '50%'
  track.style.width = `${trackWidth}px`
  track.style.background = trackColor
  sc.appendChild(track)

  const thumb = document.createElement('div')
  thumb.className = 'cs-thumb'
  thumb.style.width = `${thumbWidth}px`
  thumb.style.background = thumbColor
  sc.appendChild(thumb)

  // Состояние
  let isDragging = false
  let dragStartY = 0
  let dragStartScrollTop = 0

  // Утилиты
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
  const getTrackHeight = () => track.getBoundingClientRect().height

  function updateThumb() {
    const { scrollHeight, clientHeight, scrollTop } = container
    const canScroll = scrollHeight > clientHeight

    sc.style.display = canScroll ? 'block' : 'none'
    if (!canScroll) return

    const th = getTrackHeight()
    const thumbHeight = clamp((clientHeight / scrollHeight) * th, minThumbPx, th)
    thumb.style.height = `${thumbHeight}px`

    const maxThumbTop = th - thumbHeight
    const ratio = scrollTop / (scrollHeight - clientHeight)
    const thumbTop = maxThumbTop * ratio
    thumb.style.top = `${thumbTop}px`

    // ARIA
    thumb.setAttribute('role', 'scrollbar')
    thumb.setAttribute('aria-controls', getOrSetId(container))
    thumb.setAttribute('aria-orientation', 'vertical')
    thumb.setAttribute('aria-valuemin', '0')
    thumb.setAttribute('aria-valuemax', '100')
    thumb.setAttribute('aria-valuenow', String(Math.round(ratio * 100)))
  }

  function getOrSetId(el) {
    if (!el.id) el.id = `cs-${Math.random().toString(36).slice(2, 9)}`
    return el.id
  }

  function scrollToThumbPosition(clientY) {
    const trackRect = track.getBoundingClientRect()
    const thumbRect = thumb.getBoundingClientRect()
    const clickY = clamp(
      clientY - trackRect.top - thumbRect.height / 2,
      0,
      trackRect.height - thumbRect.height,
    )
    const ratio = clickY / (trackRect.height - thumbRect.height || 1)
    container.scrollTop = ratio * (container.scrollHeight - container.clientHeight)
  }

  // Слушатели
  const onContainerScroll = () => updateThumb()
  const onResize = () => updateThumb()

  const onTrackMouseDown = (e) => {
    if (e.target === thumb) return
    e.preventDefault()
    scrollToThumbPosition(e.clientY)
    updateThumb()
  }

  const onThumbMouseDown = (e) => {
    e.preventDefault()
    isDragging = true
    thumb.classList.add('is-dragging')
    dragStartY = e.clientY
    dragStartScrollTop = container.scrollTop
    document.addEventListener('mousemove', onDragMouseMove, { passive: false })
    document.addEventListener('mouseup', onDragMouseUp, { passive: true, once: true })
  }

  const onDragMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
    const th = getTrackHeight()
    const thumbH = thumb.getBoundingClientRect().height
    const maxThumbTop = th - thumbH

    const deltaY = e.clientY - dragStartY
    const contentScrollable = container.scrollHeight - container.clientHeight
    const pixelsPerContent = maxThumbTop / (contentScrollable || 1)
    container.scrollTop = clamp(
      dragStartScrollTop + deltaY / (pixelsPerContent || 1),
      0,
      contentScrollable,
    )
  }

  const onDragMouseUp = () => {
    isDragging = false
    thumb.classList.remove('is-dragging')
    document.removeEventListener('mousemove', onDragMouseMove)
  }

  // Touch
  const onThumbTouchStart = (e) => {
    const t = e.touches[0]
    isDragging = true
    thumb.classList.add('is-dragging')
    dragStartY = t.clientY
    dragStartScrollTop = container.scrollTop
    document.addEventListener('touchmove', onThumbTouchMove, { passive: false })
    document.addEventListener('touchend', onThumbTouchEnd, { passive: true, once: true })
  }
  const onThumbTouchMove = (e) => {
    if (!isDragging) return
    const t = e.touches[0]
    e.preventDefault()
    const th = getTrackHeight()
    const thumbH = thumb.getBoundingClientRect().height
    const maxThumbTop = th - thumbH

    const deltaY = t.clientY - dragStartY
    const contentScrollable = container.scrollHeight - container.clientHeight
    const pixelsPerContent = maxThumbTop / (contentScrollable || 1)
    container.scrollTop = clamp(
      dragStartScrollTop + deltaY / (pixelsPerContent || 1),
      0,
      contentScrollable,
    )
  }
  const onThumbTouchEnd = () => {
    isDragging = false
    thumb.classList.remove('is-dragging')
    document.removeEventListener('touchmove', onThumbTouchMove)
  }

  // MutationObserver — если внутри меняется контент
  const mo = new MutationObserver(updateThumb)
  mo.observe(container, { subtree: true, childList: true, attributes: true, characterData: true })

  // Подписки
  container.addEventListener('scroll', onContainerScroll, { passive: true })
  window.addEventListener('resize', onResize)
  track.addEventListener('mousedown', onTrackMouseDown)
  thumb.addEventListener('mousedown', onThumbMouseDown)
  thumb.addEventListener('touchstart', onThumbTouchStart, { passive: true })

  // Инициализация
  updateThumb()

  // Публичный API
  function destroy() {
    mo.disconnect()
    container.removeEventListener('scroll', onContainerScroll)
    window.removeEventListener('resize', onResize)
    track.removeEventListener('mousedown', onTrackMouseDown)
    thumb.removeEventListener('mousedown', onThumbMouseDown)
    thumb.removeEventListener('touchstart', onThumbTouchStart)

    // Вернуть DOM в исходное состояние
    sc.remove()
    container.classList.remove('u-hide-native-scroll')

    // развернуть обёртку
    if (wrap.parentNode) {
      wrap.parentNode.insertBefore(container, wrap)
      wrap.remove()
    }
  }

  return { update: updateThumb, destroy, elements: { wrap, sc, track, thumb } }
}

/** Горизонтальный кастомный скролл (для overflow-x) */
export function attachCustomScrollbarHorizontal(
  container,
  {
    offsetBottom = 12,
    trackHeight = 1,
    trackColor = '#3D3D3D',
    thumbHeight = 6,
    thumbColor = '#4D4D4D',
    minThumbPx = 20,
  } = {},
) {
  if (!container) return

  const wrap = document.createElement('div')
  wrap.className = 'cs-wrap cs-wrap--horizontal'
  wrap.style.paddingBottom = `${offsetBottom}px`
  container.parentNode.insertBefore(wrap, container)
  wrap.appendChild(container)

  container.classList.add('u-hide-native-scroll-x')

  const sc = document.createElement('div')
  sc.className = 'cs-scroll cs-scroll--horizontal'
  sc.style.top = '100%'
  sc.style.height = `${Math.max(thumbHeight, trackHeight)}px`
  wrap.appendChild(sc)

  const track = document.createElement('div')
  track.className = 'cs-track cs-track--horizontal'
  track.style.top = '50%'
  track.style.height = `${trackHeight}px`
  track.style.background = trackColor
  sc.appendChild(track)

  const thumb = document.createElement('div')
  thumb.className = 'cs-thumb cs-thumb--horizontal'
  thumb.style.height = `${thumbHeight}px`
  thumb.style.background = thumbColor
  sc.appendChild(thumb)

  let isDragging = false
  let dragStartX = 0
  let dragStartScrollLeft = 0

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
  const getTrackWidth = () => track.getBoundingClientRect().width

  function updateThumb() {
    const { scrollWidth, clientWidth, scrollLeft } = container
    const canScroll = scrollWidth > clientWidth

    sc.style.display = canScroll ? 'block' : 'none'
    if (!canScroll) return

    const tw = getTrackWidth()
    const thumbWidth = clamp((clientWidth / scrollWidth) * tw, minThumbPx, tw)
    thumb.style.width = `${thumbWidth}px`

    const maxThumbLeft = tw - thumbWidth
    const ratio = scrollLeft / (scrollWidth - clientWidth || 1)
    const thumbLeft = maxThumbLeft * ratio
    thumb.style.left = `${thumbLeft}px`

    thumb.setAttribute('role', 'scrollbar')
    thumb.setAttribute('aria-controls', getOrSetId(container))
    thumb.setAttribute('aria-orientation', 'horizontal')
    thumb.setAttribute('aria-valuemin', '0')
    thumb.setAttribute('aria-valuemax', '100')
    thumb.setAttribute('aria-valuenow', String(Math.round(ratio * 100)))
  }

  function getOrSetId(el) {
    if (!el.id) el.id = `cs-h-${Math.random().toString(36).slice(2, 9)}`
    return el.id
  }

  function scrollToThumbPosition(clientX) {
    const trackRect = track.getBoundingClientRect()
    const thumbRect = thumb.getBoundingClientRect()
    const clickX = clamp(
      clientX - trackRect.left - thumbRect.width / 2,
      0,
      trackRect.width - thumbRect.width,
    )
    const ratio = clickX / (trackRect.width - thumbRect.width || 1)
    container.scrollLeft = ratio * (container.scrollWidth - container.clientWidth)
  }

  const onContainerScroll = () => updateThumb()
  const onResize = () => updateThumb()

  const onTrackMouseDown = (e) => {
    if (e.target === thumb) return
    e.preventDefault()
    scrollToThumbPosition(e.clientX)
    updateThumb()
  }

  const onThumbMouseDown = (e) => {
    e.preventDefault()
    isDragging = true
    thumb.classList.add('is-dragging')
    dragStartX = e.clientX
    dragStartScrollLeft = container.scrollLeft
    document.addEventListener('mousemove', onDragMouseMove, { passive: false })
    document.addEventListener('mouseup', onDragMouseUp, { passive: true, once: true })
  }

  const onDragMouseMove = (e) => {
    if (!isDragging) return
    e.preventDefault()
    const tw = getTrackWidth()
    const thumbW = thumb.getBoundingClientRect().width
    const maxThumbLeft = tw - thumbW
    const deltaX = e.clientX - dragStartX
    const contentScrollable = container.scrollWidth - container.clientWidth
    const pixelsPerContent = maxThumbLeft / (contentScrollable || 1)
    container.scrollLeft = clamp(
      dragStartScrollLeft + deltaX / (pixelsPerContent || 1),
      0,
      contentScrollable,
    )
  }

  const onDragMouseUp = () => {
    isDragging = false
    thumb.classList.remove('is-dragging')
    document.removeEventListener('mousemove', onDragMouseMove)
  }

  const onThumbTouchStart = (e) => {
    const t = e.touches[0]
    isDragging = true
    thumb.classList.add('is-dragging')
    dragStartX = t.clientX
    dragStartScrollLeft = container.scrollLeft
    document.addEventListener('touchmove', onThumbTouchMove, { passive: false })
    document.addEventListener('touchend', onThumbTouchEnd, { passive: true, once: true })
  }
  const onThumbTouchMove = (e) => {
    if (!isDragging) return
    const t = e.touches[0]
    e.preventDefault()
    const tw = getTrackWidth()
    const thumbW = thumb.getBoundingClientRect().width
    const maxThumbLeft = tw - thumbW
    const deltaX = t.clientX - dragStartX
    const contentScrollable = container.scrollWidth - container.clientWidth
    const pixelsPerContent = maxThumbLeft / (contentScrollable || 1)
    container.scrollLeft = clamp(
      dragStartScrollLeft + deltaX / (pixelsPerContent || 1),
      0,
      contentScrollable,
    )
  }
  const onThumbTouchEnd = () => {
    isDragging = false
    thumb.classList.remove('is-dragging')
    document.removeEventListener('touchmove', onThumbTouchMove)
  }

  const mo = new MutationObserver(updateThumb)
  mo.observe(container, { subtree: true, childList: true, attributes: true, characterData: true })

  container.addEventListener('scroll', onContainerScroll, { passive: true })
  window.addEventListener('resize', onResize)
  track.addEventListener('mousedown', onTrackMouseDown)
  thumb.addEventListener('mousedown', onThumbMouseDown)
  thumb.addEventListener('touchstart', onThumbTouchStart, { passive: true })

  updateThumb()

  function destroy() {
    mo.disconnect()
    container.removeEventListener('scroll', onContainerScroll)
    window.removeEventListener('resize', onResize)
    track.removeEventListener('mousedown', onTrackMouseDown)
    thumb.removeEventListener('mousedown', onThumbMouseDown)
    thumb.removeEventListener('touchstart', onThumbTouchStart)
    sc.remove()
    container.classList.remove('u-hide-native-scroll-x')
    if (wrap.parentNode) {
      wrap.parentNode.insertBefore(container, wrap)
      wrap.remove()
    }
  }

  return { update: updateThumb, destroy, elements: { wrap, sc, track, thumb } }
}
