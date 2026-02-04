// Переключение табов в карточках палат
export function initPalacesTabs() {
  const palaceCards = document.querySelectorAll('.palace-card')

  palaceCards.forEach((palaceCard) => {
    const tabs = palaceCard.querySelectorAll('.palace-card_tab')
    const infoItems = palaceCard.querySelectorAll('.palace-card_info-item')
    const palaceId = palaceCard.dataset.palaceId

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab

        // Убираем активный класс у всех табов
        tabs.forEach((t) => t.classList.remove('palace-card_tab--active'))
        // Добавляем активный класс к выбранному табу
        tab.classList.add('palace-card_tab--active')

        // Скрываем все info items
        infoItems.forEach((item) => {
          if (item.dataset.palace === palaceId && item.dataset.tab === tabId) {
            item.classList.add('palace-card_info-item--active')
          } else {
            item.classList.remove('palace-card_info-item--active')
          }
        })
      })
    })
  })
}
