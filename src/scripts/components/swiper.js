// responsiveSwiper.js (silent, with grouping, breakpoints, thumbs and safe remount)
// Работает и с ESM (import Swiper from 'swiper'; import { Navigation } from 'swiper/modules')
// и с CDN (window.Swiper). Ничего не «роняет», если контейнер/элементы отсутствуют.
// При options.thumbs — режим галереи: root с готовой разметкой swiper, связанный с thumbs-слайдером.

/**
 * @typedef {Object} PaginationOption
 * @property {HTMLElement|string} [el]
 * @property {boolean} [clickable=true]
 * @property {boolean} [createInside=true]
 */
/**
 * @typedef {Object} NavigationOption
 * @property {HTMLElement|string} [prevEl]
 * @property {HTMLElement|string} [nextEl]
 * @property {boolean} [createInside=true]
 */
/**
 * @typedef {Object} ResponsiveSwiperOptions
 * @property {string}  [itemsSelector='.item']
 * @property {string}  [breakpoint='(max-width: 1023px)']
 * @property {boolean|PaginationOption} [pagination=true]
 * @property {boolean|NavigationOption} [navigation=false]
 * @property {(opts:any)=>any} [extendSwiperOptions]
 * @property {any[]}  [modules]
 * @property {any}    [Swiper]
 * @property {number} [itemsPerSlide=1]
 * @property {number} [inSlideGap=0]
 * @property {Object} [breakpoints]
 * @property {number} [slidesPerView]
 * @property {number} [spaceBetween]
 * @property {boolean} [loop]
 * @property {boolean} [centeredSlides]
 * @property {boolean} [watchOverflow=true]
 * @property {(swiperInstance:any)=>void} [onInit]
 * @property {()=>void} [onDestroy]
 * @property {Object} [thumbs] — режим галереи: главный + миниатюры. root должен иметь готовую swiper-разметку.
 * @property {string|HTMLElement} thumbs.container — контейнер миниатюр (селектор или элемент)
 * @property {string|HTMLElement} [thumbs.scope] — область поиска container (по умолчанию root.parentElement)
 * @property {Object|(root:HTMLElement)=>Object} [thumbs.options] — опции для thumbs swiper
 * // + любые другие опции Swiper (speed, effect, autoplay, ...)
 */

import { Thumbs as ThumbsModule } from 'swiper/modules'

// ---------- Утилиты ----------
function isEl(x) {
  return x && typeof x === 'object' && x.nodeType === 1
}

function resolveEl(target) {
  if (!target) return null
  if (isEl(target)) return target
  if (typeof target === 'string') return document.querySelector(target)
  return null
}

function resolveElRelative(target, ctx) {
  if (!target) return null
  if (isEl(target)) return target
  if (typeof target === 'string') return ctx.querySelector(target)
  return null
}

function addMqListener(mq, cb) {
  if (typeof mq.addEventListener === 'function') mq.addEventListener('change', cb)
  else mq.addListener(cb)
}

function removeMqListener(mq, cb) {
  if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', cb)
  else mq.removeListener(cb)
}

function getActiveBpKey(bps, width) {
  if (!bps) return null
  const keys = Object.keys(bps)
    .map((n) => Number(n))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b)
  let active = null
  for (const k of keys) if (width >= k) active = k
  return active
}

function resolveEffectiveOptions(baseOptions) {
  const width =
    typeof window !== 'undefined'
      ? window.innerWidth || document.documentElement.clientWidth || 0
      : 0
  const bpKey = getActiveBpKey(baseOptions.breakpoints, width)
  const bpOpts = bpKey ? baseOptions.breakpoints[bpKey] : undefined
  const merged = { ...baseOptions, ...(bpOpts || {}) }
  return {
    merged,
    helper: {
      itemsPerSlide: merged.itemsPerSlide ?? 1,
      inSlideGap: merged.inSlideGap ?? 0,
      loop: merged.loop ?? false,
      centeredSlides: merged.centeredSlides ?? false,
    },
    bpKey,
  }
}

// ---------- Основная функция ----------
export function initResponsiveSwiper(container, opts = {}) {
  const defaults = {
    itemsSelector: '.item',
    breakpoint: '(max-width: 1023px)',
    pagination: true,
    navigation: false,
    extendSwiperOptions: (o) => o,
    modules: undefined,
    Swiper: undefined,
    itemsPerSlide: 1,
    inSlideGap: 0,
    watchOverflow: true,
    breakpoints: undefined,
    onInit: undefined,
    onDestroy: undefined,
  }
  const options = { ...defaults, ...opts }

  // SSR safe
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { destroy() {}, isMounted: () => false }
  }

  const root = typeof container === 'string' ? document.querySelector(container) : container

  if (!root) {
    return { destroy() {}, isMounted: () => false }
  }

  if (root.dataset.rsInitialized === 'true') {
    return {
      destroy() {},
      isMounted: () => root.dataset.rsMounted === 'true',
    }
  }
  root.dataset.rsInitialized = 'true'

  /** @type {MediaQueryList} */
  const mq = window.matchMedia(options.breakpoint)

  /** @type {import('swiper').Swiper | null} */
  let swiper = null
  let thumbsSwiper = null
  let wrapper = null
  /** @type {HTMLElement | null} */
  let watchOverflowNavContainer = null

  const thumbsOpt = options.thumbs
  const isThumbsMode = !!thumbsOpt

  function resolveThumbsContainer() {
    if (!thumbsOpt?.container) return null
    const container = thumbsOpt.container
    const scope = thumbsOpt.scope
      ? typeof thumbsOpt.scope === 'string'
        ? root.closest(thumbsOpt.scope)
        : thumbsOpt.scope
      : root.parentElement
    return resolveElRelative(container, scope || document.body) || resolveEl(container)
  }

  let internalPaginationEl = null
  let internalNavPrev = null
  let internalNavNext = null

  let activeBpKey = null
  let activeHelperCfg = { itemsPerSlide: 1, inSlideGap: 0, loop: false, centeredSlides: false }

  let remountScheduled = false
  function scheduleRemount() {
    if (remountScheduled) return
    remountScheduled = true
    setTimeout(() => {
      if (root.isConnected && mq.matches) {
        unmountSwiper()
        mountSwiper()
      }
      remountScheduled = false
    }, 0)
  }

  const directItems = () =>
    Array.from(root.children).filter((el) => el.matches && el.matches(options.itemsSelector))

  function buildPaginationConfig(eff) {
    const paginationOpt = eff.pagination
    if (!paginationOpt) return { config: undefined }

    if (paginationOpt === true) {
      internalPaginationEl = document.createElement('div')
      internalPaginationEl.className = 'swiper-pagination'
      root.appendChild(internalPaginationEl)
      return { config: { el: internalPaginationEl, clickable: true, enabled: true } }
    }

    const clickable = paginationOpt.clickable !== undefined ? paginationOpt.clickable : true
    const externalEl = resolveElRelative(paginationOpt.el, root)
    if (externalEl) return { config: { el: externalEl, clickable, enabled: true } }

    if (paginationOpt.createInside !== false) {
      internalPaginationEl = document.createElement('div')
      internalPaginationEl.className = 'swiper-pagination'
      root.appendChild(internalPaginationEl)
      return { config: { el: internalPaginationEl, clickable, enabled: true } }
    }
    return { config: undefined }
  }

  function buildNavigationConfig(eff) {
    const navigationOpt = eff.navigation
    if (!navigationOpt) return { config: undefined }

    if (navigationOpt === true) {
      internalNavPrev = document.createElement('div')
      internalNavNext = document.createElement('div')
      internalNavPrev.className = 'swiper-button-prev'
      internalNavNext.className = 'swiper-button-next'
      root.appendChild(internalNavPrev)
      root.appendChild(internalNavNext)
      return { config: { prevEl: internalNavPrev, nextEl: internalNavNext, enabled: true } }
    }

    // Обработка массивов элементов
    let prev = navigationOpt.prevEl
    let next = navigationOpt.nextEl

    // Если это массив элементов, оставляем как есть
    // Если это строка или один элемент, используем resolveElRelative
    if (Array.isArray(prev)) {
      // Массив уже содержит элементы, проверяем что они валидны
      prev = prev.filter((el) => el && isEl(el))
    } else {
      prev = resolveElRelative(prev, root)
    }

    if (Array.isArray(next)) {
      next = next.filter((el) => el && isEl(el))
    } else {
      next = resolveElRelative(next, root)
    }

    // Swiper поддерживает массивы элементов для навигации
    if (prev && next) {
      return { config: { prevEl: prev, nextEl: next, enabled: true } }
    }

    if (navigationOpt.createInside !== false) {
      internalNavPrev = document.createElement('div')
      internalNavNext = document.createElement('div')
      internalNavPrev.className = 'swiper-button-prev'
      internalNavNext.className = 'swiper-button-next'
      root.appendChild(internalNavPrev)
      root.appendChild(internalNavNext)
      return { config: { prevEl: internalNavPrev, nextEl: internalNavNext, enabled: true } }
    }
    return { config: undefined }
  }

  function unwrapAnyWrapperIfExists() {
    const strayWrapper = root.querySelector(':scope > .swiper-wrapper')
    if (!strayWrapper) return

    strayWrapper.querySelectorAll('.swiper-slide-duplicate').forEach((n) => n.remove())

    Array.from(strayWrapper.children).forEach((slide) => {
      if (slide.classList?.contains('rs-group')) {
        const kids = Array.from(slide.children)
        kids.forEach((k) => {
          k.classList?.remove(
            'swiper-slide',
            'swiper-slide-active',
            'swiper-slide-prev',
            'swiper-slide-next',
          )
          k.removeAttribute('style')
          root.appendChild(k)
        })
        slide.remove()
      } else {
        slide.classList?.remove(
          'swiper-slide',
          'swiper-slide-active',
          'swiper-slide-prev',
          'swiper-slide-next',
        )
        slide.removeAttribute('style')
        root.appendChild(slide)
      }
    })

    strayWrapper.remove()
  }

  function mountSwiperThumbs() {
    if (swiper) return
    const thumbsEl = resolveThumbsContainer()
    if (!thumbsEl) {
      root.dataset.rsMounted = 'false'
      return
    }
    const { merged: eff } = resolveEffectiveOptions(options)
    const SwiperClass = eff.Swiper || (typeof window !== 'undefined' ? window.Swiper : undefined)
    if (!SwiperClass) {
      root.dataset.rsMounted = 'false'
      return
    }
    const thumbsOptions =
      typeof thumbsOpt.options === 'function' ? thumbsOpt.options(root) : thumbsOpt.options || {}
    thumbsSwiper = new SwiperClass(thumbsEl, thumbsOptions)
    const { config: navigationCfg } = buildNavigationConfig(eff)
    const {
      itemsSelector: _is,
      breakpoint: _bp,
      pagination: _p,
      navigation: _n,
      extendSwiperOptions,
      modules,
      Swiper: _Swiper,
      onInit: _oi,
      thumbs: _th,
      ...passThrough
    } = eff
    const mainModules = [...(Array.isArray(modules) ? modules : []), ThumbsModule]
    let mainOpts = {
      grabCursor: true,
      watchOverflow: passThrough.watchOverflow ?? true,
      ...passThrough,
      modules: mainModules,
      thumbs: { swiper: thumbsSwiper },
    }
    if (navigationCfg) {
      mainOpts.navigation = { enabled: true, ...navigationCfg }
    }
    mainOpts = extendSwiperOptions?.(mainOpts) || mainOpts
    root.classList.add('swiper')
    swiper = new SwiperClass(root, mainOpts)
    root.dataset.rsMounted = 'true'
    if (passThrough.watchOverflow && navigationCfg?.prevEl && navigationCfg?.nextEl) {
      const prev = Array.isArray(navigationCfg.prevEl) ? navigationCfg.prevEl[0] : navigationCfg.prevEl
      const next = Array.isArray(navigationCfg.nextEl) ? navigationCfg.nextEl[0] : navigationCfg.nextEl
      if (prev?.parentElement && prev.parentElement === next?.parentElement) {
        watchOverflowNavContainer = prev.parentElement
        const update = () =>
          watchOverflowNavContainer?.classList.toggle('swiper-nav-hidden', swiper.isLocked)
        swiper.on?.('lock', update)
        swiper.on?.('unlock', update)
        update()
      }
    }
    options.onInit?.(swiper)
  }

  function mountSwiper() {
    if (swiper) return

    if (isThumbsMode) {
      mountSwiperThumbs()
      return
    }

    unwrapAnyWrapperIfExists()

    const { merged: eff, helper: h, bpKey } = resolveEffectiveOptions(options)
    activeBpKey = bpKey
    activeHelperCfg = h

    root.classList.add('swiper')

    wrapper = document.createElement('div')
    wrapper.className = 'swiper-wrapper'

    const items = directItems()

    if (h.itemsPerSlide > 1) {
      for (let i = 0; i < items.length; i += h.itemsPerSlide) {
        const group = document.createElement('div')
        group.className = 'swiper-slide rs-group'
        group.style.setProperty('--rs-cols', String(h.itemsPerSlide))
        group.style.setProperty('--rs-in-gap', (h.inSlideGap || 0) + 'px')
        for (let j = 0; j < h.itemsPerSlide && i + j < items.length; j += 1) {
          group.appendChild(items[i + j])
        }
        wrapper.appendChild(group)
      }
    } else {
      items.forEach((el) => {
        el.classList.add('swiper-slide')
        wrapper.appendChild(el)
      })
    }

    root.appendChild(wrapper)

    const { config: paginationCfg } = buildPaginationConfig(eff)
    const { config: navigationCfg } = buildNavigationConfig(eff)

    const {
      itemsSelector,
      breakpoint,
      pagination: _p,
      navigation: _n,
      extendSwiperOptions,
      modules,
      Swiper: ProvidedSwiper,
      onInit,
      onDestroy: _od, // eslint-disable-line no-unused-vars
      ...passThrough
    } = eff

    const totalItems = items.length
    const groupsCount = h.itemsPerSlide > 1 ? Math.ceil(totalItems / h.itemsPerSlide) : totalItems

    const spv = typeof eff.slidesPerView === 'number' ? eff.slidesPerView : 1
    const minGroupsForLoop = Math.max(Math.ceil(spv) + 1, 2)
    const desiredLoop = !!eff.loop
    const effectiveLoop = desiredLoop && groupsCount >= minGroupsForLoop

    let swiperOptions = {
      grabCursor: true,
      watchOverflow: passThrough.watchOverflow ?? true,
      ...passThrough,
      loop: effectiveLoop,
    }

    if (paginationCfg) {
      swiperOptions.pagination = { enabled: true, ...paginationCfg }
    }
    if (navigationCfg) {
      swiperOptions.navigation = { enabled: true, ...navigationCfg }
    }

    if (effectiveLoop && swiperOptions.loopedSlides == null) {
      swiperOptions.loopedSlides = groupsCount
    }

    if (Array.isArray(modules) && modules.length) {
      swiperOptions.modules = modules
    }
    swiperOptions = extendSwiperOptions?.(swiperOptions) || swiperOptions

    const SwiperClass =
      ProvidedSwiper ||
      (typeof window !== 'undefined' ? window.Swiper : undefined) ||
      (typeof Swiper !== 'undefined' ? Swiper : undefined)

    if (!SwiperClass) {
      root.dataset.rsMounted = 'false'
      return
    }

    swiper = new SwiperClass(root, swiperOptions)
    root.dataset.rsMounted = 'true'

    if (passThrough.watchOverflow && navigationCfg?.prevEl && navigationCfg?.nextEl) {
      const prev = Array.isArray(navigationCfg.prevEl) ? navigationCfg.prevEl[0] : navigationCfg.prevEl
      const next = Array.isArray(navigationCfg.nextEl) ? navigationCfg.nextEl[0] : navigationCfg.nextEl
      if (prev?.parentElement && prev.parentElement === next?.parentElement) {
        watchOverflowNavContainer = prev.parentElement
        const update = () =>
          watchOverflowNavContainer?.classList.toggle('swiper-nav-hidden', swiper.isLocked)
        swiper.on?.('lock', update)
        swiper.on?.('unlock', update)
        update()
      }
    }

    options.onInit?.(swiper)

    swiper.on?.('breakpoint', () => {
      const { helper: h2, bpKey: bp2 } = resolveEffectiveOptions(options)
      const needRemount =
        h2.itemsPerSlide !== activeHelperCfg.itemsPerSlide ||
        h2.inSlideGap !== activeHelperCfg.inSlideGap ||
        h2.loop !== activeHelperCfg.loop ||
        h2.centeredSlides !== activeHelperCfg.centeredSlides ||
        bp2 !== activeBpKey

      if (needRemount) {
        activeHelperCfg = h2
        activeBpKey = bp2
        scheduleRemount()
      }
    })
  }

  function unmountSwiper() {
    if (swiper && typeof swiper.destroy === 'function') {
      swiper.destroy(true, true)
    }
    swiper = null
    watchOverflowNavContainer?.classList.remove('swiper-nav-hidden')
    watchOverflowNavContainer = null
    if (thumbsSwiper && typeof thumbsSwiper.destroy === 'function') {
      thumbsSwiper.destroy(true, true)
    }
    thumbsSwiper = null

    if (isThumbsMode) {
      root.classList.remove(
        'swiper',
        'swiper-initialized',
        'swiper-horizontal',
        'swiper-vertical',
        'swiper-backface-hidden',
      )
      root.removeAttribute('style')
      root.dataset.rsMounted = 'false'
      options.onDestroy?.()
      return
    }

    const w =
      wrapper && wrapper.isConnected ? wrapper : root.querySelector(':scope > .swiper-wrapper')

    if (w) {
      w.querySelectorAll('.swiper-slide-duplicate').forEach((n) => n.remove())
    }

    if (w) {
      const slides = Array.from(w.children)
      slides.forEach((slide) => {
        if (slide.classList?.contains('rs-group')) {
          const kids = Array.from(slide.children)
          kids.forEach((k) => {
            k.classList?.remove(
              'swiper-slide',
              'swiper-slide-active',
              'swiper-slide-prev',
              'swiper-slide-next',
            )
            k.removeAttribute('style')
            root.appendChild(k)
          })
          slide.remove()
        } else {
          slide.classList?.remove(
            'swiper-slide',
            'swiper-slide-active',
            'swiper-slide-prev',
            'swiper-slide-next',
          )
          slide.removeAttribute('style')
          root.appendChild(slide)
        }
      })

      w.remove()
    }
    wrapper = null

    if (internalPaginationEl) {
      internalPaginationEl.remove()
      internalPaginationEl = null
    }
    if (internalNavPrev) {
      internalNavPrev.remove()
      internalNavPrev = null
    }
    if (internalNavNext) {
      internalNavNext.remove()
      internalNavNext = null
    }

    root.classList.remove(
      'swiper',
      'swiper-initialized',
      'swiper-horizontal',
      'swiper-vertical',
      'swiper-backface-hidden',
    )
    root.removeAttribute('style')

    root.dataset.rsMounted = 'false'
    options.onDestroy?.()
  }

  function handleMq(mql) {
    if (mql.matches) mountSwiper()
    else unmountSwiper()
  }

  addMqListener(mq, handleMq)
  handleMq(mq)

  return {
    destroy() {
      removeMqListener(mq, handleMq)
      unmountSwiper()
      delete root.dataset.rsInitialized
    },
    isMounted() {
      return root.dataset.rsMounted === 'true'
    },
  }
}

export function initResponsiveSwiperAll(selector, buildOptions) {
  const nodes = document.querySelectorAll(selector)
  if (!nodes.length) return []
  const ctrls = []
  nodes.forEach((root) => {
    const opts = typeof buildOptions === 'function' ? buildOptions(root) : buildOptions
    ctrls.push(initResponsiveSwiper(root, opts))
  })
  return ctrls
}

/* CSS для групп:
.rs-group {
  display: grid;
  grid-template-columns: repeat(var(--rs-cols, 2), minmax(0, 1fr));
  column-gap: var(--rs-in-gap, 40px);
}
*/
