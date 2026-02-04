import { openModal } from './modal.js'

// Домены для определения embed видео
const embedDomains = ['youtube.com', 'youtu.be', 'vk.com', 'vkvideo.ru', 'rutube.ru']

/**
 * Определяет тип ссылки на видео (local или embed)
 * @param {string} url - ссылка на видео
 * @returns {string} 'embed' или 'local'
 */
function getVideoType(url) {
  if (!url) return 'local'
  return embedDomains.some((domain) => url.includes(domain)) ? 'embed' : 'local'
}

/**
 * Управление превью-видео в карточке
 * @param {HTMLElement} card - элемент карточки
 * @param {boolean} play - воспроизводить или остановить
 */
function controlPreviewVideo(card, play) {
  if (!card) return

  const previewVideo = card.querySelector('.card_preview-video')
  const previewImg = card.querySelector('.card_preview-img')

  if (!previewVideo || !previewImg) return

  if (play) {
    // Убеждаемся, что видео имеет нужные атрибуты для автоплея
    previewVideo.setAttribute('playsinline', '')
    previewVideo.setAttribute('muted', '')
    previewVideo.muted = true

    // Показываем видео, скрываем фото
    previewImg.style.opacity = '0'
    previewImg.style.pointerEvents = 'none'
    previewVideo.style.opacity = '1'
    previewVideo.style.pointerEvents = 'auto'

    // Воспроизводим видео
    previewVideo.play().catch(() => {
      // Игнорируем ошибки автоплея
    })
  } else {
    // Останавливаем видео, показываем фото
    previewVideo.pause()
    previewVideo.currentTime = 0
    previewVideo.style.opacity = '0'
    previewVideo.style.pointerEvents = 'none'
    previewImg.style.opacity = '1'
    previewImg.style.pointerEvents = 'auto'
  }
}

/**
 * Определяет, является ли устройство touch-устройством или мобильным
 * @returns {boolean}
 */
function isTouchDevice() {
  const hasTouch =
    'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0
  const isMobile = window.innerWidth < 992
  return hasTouch || isMobile
}

/**
 * Получает активную карточку из swiper
 * @param {any} swiperInstance - экземпляр Swiper
 * @returns {HTMLElement|null}
 */
function getActiveCard(swiperInstance) {
  const swiperEl = swiperInstance.el || swiperInstance.$el?.[0] || swiperInstance.$el
  if (!swiperEl) return null

  const activeSlide = swiperEl.querySelector('.swiper-slide-active')
  if (!activeSlide) return null

  // Активный слайд сам является карточкой
  if (activeSlide.classList.contains('card--video')) {
    return activeSlide
  }

  // Или карточка находится внутри слайда
  return activeSlide.querySelector('.card--video')
}

/**
 * Инициализация карточек видео
 */
export function initVideoCards() {
  const videoCards = document.querySelectorAll('.card--video')
  if (!videoCards.length) return

  videoCards.forEach((card) => {
    const previewVideo = card.querySelector('.card_preview-video')
    const previewImg = card.querySelector('.card_preview-img')

    // Если есть превью-видео, добавляем обработчики hover (для десктопа)
    if (previewVideo && previewImg) {
      card.addEventListener('mouseenter', () => {
        previewImg.style.opacity = '0'
        previewImg.style.pointerEvents = 'none'
        previewVideo.style.opacity = '1'
        previewVideo.style.pointerEvents = 'auto'
        previewVideo.play().catch(() => {})
      })

      card.addEventListener('mouseleave', () => {
        previewVideo.pause()
        previewVideo.currentTime = 0
        previewVideo.style.opacity = '0'
        previewVideo.style.pointerEvents = 'none'
        previewImg.style.opacity = '1'
        previewImg.style.pointerEvents = 'auto'
      })
    }

    // Обработчик клика по карточке для открытия модалки
    card.addEventListener(
      'click',
      (e) => {
        e.stopPropagation()
        e.stopImmediatePropagation()

        const videoUrl = card.dataset.videoUrl
        const modalId = card.dataset.modal || 'video-player-modal'

        if (!videoUrl) {
          console.warn('Не указана ссылка на видео')
          return
        }

        openVideoModal(modalId, videoUrl)
      },
      true, // capture фаза
    )
  })
}

/**
 * Открывает модалку с видео плеером
 * @param {string} modalId - ID модалки
 * @param {string} videoUrl - ссылка на видео
 */
function openVideoModal(modalId, videoUrl) {
  const modal = document.getElementById(modalId)
  if (!modal) {
    console.warn(`Модалка с ID "${modalId}" не найдена`)
    return
  }

  const container = modal.querySelector('.video-player__container')
  if (!container) {
    console.warn('Контейнер для видео не найден')
    return
  }

  container.innerHTML = ''
  const videoType = getVideoType(videoUrl)

  if (videoType === 'embed') {
    const iframe = document.createElement('iframe')
    iframe.src = videoUrl
    iframe.setAttribute('allowfullscreen', '')
    iframe.setAttribute('frameborder', '0')
    iframe.setAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen',
    )
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    container.appendChild(iframe)
  } else {
    const video = document.createElement('video')
    video.src = videoUrl
    video.controls = true
    video.autoplay = true
    video.style.width = '100%'
    video.style.height = '100%'
    container.appendChild(video)
  }

  openModal(modalId)
}

/**
 * Инициализация swiper для видео карточек (для touch-устройств)
 * @param {any} swiperInstance - экземпляр Swiper
 */
export function initVideoSwiper(swiperInstance) {
  if (!swiperInstance || !isTouchDevice()) return

  const swiperEl = swiperInstance.el || swiperInstance.$el?.[0] || swiperInstance.$el
  if (!swiperEl) return

  const section = swiperEl.closest('.section--video-reviews-swiper')
  if (!section) return

  let isSectionVisible = false
  let isChangingSlide = false

  // Intersection Observer для отслеживания видимости секции
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const wasVisible = isSectionVisible
        isSectionVisible = entry.isIntersecting

        if (isSectionVisible && !wasVisible) {
          // Секция стала видимой - воспроизводим видео активного слайда
          const activeCard = getActiveCard(swiperInstance)
          if (activeCard) {
            setTimeout(() => controlPreviewVideo(activeCard, true), 200)
          }
        } else if (!isSectionVisible && wasVisible) {
          // Секция перестала быть видимой - останавливаем все видео
          const cards = swiperEl.querySelectorAll('.card--video')
          cards.forEach((card) => controlPreviewVideo(card, false))
        }
      })
    },
    { threshold: 0.3 },
  )

  observer.observe(section)

  // Обработчик смены слайда
  const handleSlideChange = () => {
    if (isChangingSlide || !isSectionVisible) return

    isChangingSlide = true
    const activeCard = getActiveCard(swiperInstance)

    if (activeCard) {
      // Останавливаем все видео кроме активной карточки
      const allCards = swiperEl.querySelectorAll('.card--video')
      allCards.forEach((card) => {
        if (card !== activeCard) {
          controlPreviewVideo(card, false)
        }
      })

      // Воспроизводим видео активной карточки
      setTimeout(() => {
        controlPreviewVideo(activeCard, true)
        isChangingSlide = false
      }, 150)
    } else {
      isChangingSlide = false
    }
  }

  swiperInstance.on('slideChangeTransitionEnd', handleSlideChange)

  // Проверяем видимость при инициализации
  const checkInitialVisibility = () => {
    const rect = section.getBoundingClientRect()
    const windowHeight = window.innerHeight || document.documentElement.clientHeight
    const threshold = windowHeight * 0.3
    const isVisible = rect.top < windowHeight - threshold && rect.bottom > threshold

    if (isVisible) {
      isSectionVisible = true
      setTimeout(() => {
        const activeCard = getActiveCard(swiperInstance)
        if (activeCard) {
          controlPreviewVideo(activeCard, true)
        }
      }, 100)
    }
  }

  checkInitialVisibility()
}

/**
 * Триггеры открытия видео-модалки по data-video-url (страница комнаты и др.)
 */
function initVideoModalTriggers() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-modal="video-player-modal"][data-video-url]')
    if (!el) return
    e.preventDefault()
    const modalId = el.getAttribute('data-modal')
    const videoUrl = el.getAttribute('data-video-url')
    if (modalId && videoUrl) {
      openVideoModal(modalId, videoUrl)
    }
  })
}

/**
 * Инициализация модуля
 */
export function initVideoPlayer() {
  initVideoCards()
  initVideoModalTriggers()
}
