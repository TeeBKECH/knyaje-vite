/**
 * Управление показом/скрытием тегов категорий
 * Показывает только первые N тегов, остальные скрыты
 * Кнопка "Подробнее" показывает/скрывает остальные теги
 */
export function initCategoryTags() {
  const tagContainers = document.querySelectorAll('.card_category-tags')
  if (!tagContainers.length) return

  tagContainers.forEach((container) => {
    const maxVisible = parseInt(container.dataset.maxVisible || '10', 10)
    const hiddenTags = container.querySelectorAll('.category-tag--hidden')
    const showMoreBtn = container.closest('.card--category')?.querySelector('.category-show-more')

    if (!hiddenTags.length || !showMoreBtn) {
      // Если скрытых тегов нет или кнопки нет, скрываем кнопку
      if (showMoreBtn) {
        showMoreBtn.style.display = 'none'
      }
      return
    }

    let isExpanded = false

    // Изначально скрываем теги
    hiddenTags.forEach((tag) => {
      tag.classList.add('category-tag--hidden')
      tag.classList.remove('category-tag--visible')
      // Скрываем через display после небольшой задержки для первоначальной загрузки
      setTimeout(() => {
        if (tag.classList.contains('category-tag--hidden')) {
          tag.style.display = 'none'
        }
      }, 350)
    })

    showMoreBtn.addEventListener('click', () => {
      isExpanded = !isExpanded

      if (isExpanded) {
        // Показываем все скрытые теги с плавной анимацией
        hiddenTags.forEach((tag, index) => {
          setTimeout(() => {
            // Сначала показываем элемент
            tag.style.display = 'inline-flex'
            // Принудительный reflow
            tag.offsetHeight
            // Затем запускаем анимацию
            tag.classList.remove('category-tag--hidden')
            tag.classList.add('category-tag--visible')
          }, index * 30) // Небольшая задержка для каждого тега (каскадный эффект)
        })
        showMoreBtn.querySelector('span').textContent = 'Скрыть'
        // Убираем стрелку при развернутом состоянии
        showMoreBtn.classList.remove('btn--arrow-right')
        showMoreBtn.classList.add('btn--arrow-left', 'btn--arrow-left-alt')
      } else {
        // Скрываем теги обратно с плавной анимацией
        hiddenTags.forEach((tag, index) => {
          setTimeout(() => {
            tag.classList.remove('category-tag--visible')
            tag.classList.add('category-tag--hidden')
            // После завершения анимации скрываем элемент через display
            setTimeout(() => {
              if (tag.classList.contains('category-tag--hidden')) {
                tag.style.display = 'none'
              }
            }, 300)
          }, index * 20) // Небольшая задержка для обратного каскада
        })
        showMoreBtn.querySelector('span').textContent = 'Подробнее'
        // Возвращаем стрелку вправо
        showMoreBtn.classList.remove('btn--arrow-left')
        showMoreBtn.classList.add('btn--arrow-right')
      }
    })
  })
}
