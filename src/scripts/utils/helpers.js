import { initResponsiveSwiper } from '@/scripts/components/swiper.js'

export function initResponsiveSwiperAll(selector, buildOptions) {
  const ctrls = []
  document.querySelectorAll(selector).forEach((root) => {
    const opts = typeof buildOptions === 'function' ? buildOptions(root) : buildOptions
    ctrls.push(initResponsiveSwiper(root, opts))
  })
  return ctrls
}
