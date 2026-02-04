import { hexToRgba } from '@/scripts/utils/hexToRGBA.js'

export function topicIconColor() {
  const icons = document.querySelectorAll('.topic_item_icon, .box_topic')
  if (icons?.length > 0) {
    icons.forEach((icon) => {
      const color = icon.getAttribute('data-color')
      const rgbaColor = hexToRgba(color, 1)
      icon.style.backgroundColor = rgbaColor
    })
  }
}

export function topicShowMore() {
  const topics = document.querySelectorAll('.topic_wrapper')
  if (topics?.length > 0) {
    topics.forEach((topic) => {
      const showAllBtn = topic.nextElementSibling
      console.log(topics)
      console.log(showAllBtn)
      showAllBtn?.addEventListener('click', () => {
        topic.classList.toggle('showAll')
        if (topic.classList.contains('showAll')) {
          showAllBtn.innerText = 'Скрыть'
        } else {
          showAllBtn.innerText = 'Паказать все...'
        }
      })
    })
  }
}
