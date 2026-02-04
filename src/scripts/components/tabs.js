/**
 * Инициализация компонента табов
 * @param {HTMLElement} root - Корневой элемент компонента табов
 */
export function initTabs(root) {
  // Ищем кнопки и элементы контента по data-атрибутам
  const buttons = root.querySelectorAll('[data-tab-button]')
  const items = root.querySelectorAll('[data-tab-content]')

  if (!buttons.length || !items.length) {
    console.warn('Tabs: buttons or items not found')
    return
  }

  // Обработчик клика по кнопке
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      // Получаем индекс таба из data-атрибута
      const tabIndex = parseInt(button.dataset.tabIndex, 10)

      if (isNaN(tabIndex)) {
        console.warn('Tabs: invalid tab index')
        return
      }

      // Убираем активное состояние со всех кнопок и элементов
      buttons.forEach((btn) => {
        btn.removeAttribute('data-tab-active')
        // Получаем вариант для неактивной кнопки из data-атрибута
        const inactiveVariant = btn.dataset.tabInactiveVariant || 'primary'
        // Убираем все варианты и ставим неактивный
        btn.classList.remove('button--primary', 'button--secondary', 'button--third')
        btn.classList.add(`button--${inactiveVariant}`)
        btn.setAttribute('data-tab-variant', inactiveVariant)
      })
      items.forEach((item) => {
        item.removeAttribute('data-tab-active')
        item.classList.remove('tabs_item--active')
      })

      // Добавляем активное состояние к выбранной кнопке и элементу
      button.setAttribute('data-tab-active', 'true')
      button.classList.remove('button--primary', 'button--secondary', 'button--third')
      button.classList.add('button--secondary')
      button.setAttribute('data-tab-variant', 'secondary')

      const targetItem = items[tabIndex]
      if (targetItem) {
        targetItem.setAttribute('data-tab-active', 'true')
        targetItem.classList.add('tabs_item--active')
      }
    })
  })
}

/**
 * Инициализация всех компонентов табов на странице
 */
export function initTabsAll() {
  const tabsContainers = document.querySelectorAll('[data-component="tabs"]')
  tabsContainers.forEach((container) => {
    initTabs(container)
  })
}
