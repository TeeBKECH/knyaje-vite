export function filtersHandler() {
  const filterItems = document.querySelectorAll('.filters_checkbox')
  if (filterItems?.length > 0) {
    const onChange = (e) =>
      filterItems.forEach((n) => {
        n.checked &&= n === e.target
        const content = document.querySelector(`[data-filters-id=${n.getAttribute('id')}]`)
        if (n.checked) {
          content.classList.add('show')
        } else {
          content.classList.remove('show')
        }
      })
    filterItems.forEach((n) => n.addEventListener('change', onChange))
  }
}

export function initBlogFilters() {
  const filtersContainer = document.querySelector('.filters')
  if (!filtersContainer) return

  const moreButton = filtersContainer.querySelector('[data-filter-more]')
  const hiddenTags = filtersContainer.querySelectorAll('.filters-tag--hidden')

  if (moreButton && hiddenTags.length > 0) {
    moreButton.addEventListener('click', () => {
      // Показываем скрытые теги с плавной анимацией
      hiddenTags.forEach((tag, index) => {
        setTimeout(() => {
          // Сначала убираем класс hidden, чтобы элемент появился в DOM
          tag.classList.remove('filters-tag--hidden')
          // Добавляем класс для анимации
          tag.classList.add('filters-tag--showing')
          // Убираем класс анимации после её завершения
          setTimeout(() => {
            tag.classList.remove('filters-tag--showing')
          }, 300)
        }, index * 50) // Небольшая задержка для каждого тега
      })

      // Скрываем кнопку "еще" после небольшой задержки
      setTimeout(() => {
        moreButton.style.opacity = '0'
        setTimeout(() => {
          moreButton.style.display = 'none'
        }, 300)
      }, 100)
    })
  }

  // Обработка клика по тегам фильтров
  const filterTags = filtersContainer.querySelectorAll('[data-filter-tag]')
  filterTags.forEach((tag) => {
    tag.addEventListener('click', () => {
      // Убираем активный класс со всех тегов
      filterTags.forEach((t) => {
        const btn = t.closest('.button, .btn')
        if (btn) {
          btn.classList.remove('button--primary', 'btn--default')
          btn.classList.add('button--secondary', 'btn--secondary')
        }
      })

      // Добавляем активный класс к выбранному тегу
      const btn = tag.closest('.button, .btn')
      if (btn) {
        btn.classList.remove('button--secondary', 'btn--secondary')
        btn.classList.add('button--primary', 'btn--default')
      }

      // Здесь можно добавить логику фильтрации контента
      const value = tag.getAttribute('data-value')
      console.log('Filter selected:', value)
    })
  })
}
