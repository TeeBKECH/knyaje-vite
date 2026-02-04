/**
 * Инициализация мозаичной галереи
 * Настраивает адаптивное количество столбцов и анимацию появления при скролле
 */
export function initGalleryMosaic() {
  const galleries = document.querySelectorAll('[data-gallery-mosaic]')
  if (!galleries.length) return

  galleries.forEach((gallery) => {
    const items = Array.from(gallery.querySelectorAll('.gallery-mosaic_item'))
    
    // Настраиваем количество столбцов на основе data-атрибута или используем дефолтные значения
    const columns = gallery.dataset.columns || getDefaultColumns()
    setColumns(gallery, columns)

    // Инициализируем анимацию появления при скролле
    initScrollAnimation(items)
  })
}

/**
 * Получает дефолтное количество столбцов на основе ширины экрана
 * @returns {number}
 */
function getDefaultColumns() {
  const width = window.innerWidth
  if (width >= 992) return 3 // Desktop
  if (width >= 768) return 2 // Tablet
  return 1 // Mobile
}

/**
 * Устанавливает количество столбцов для галереи
 * @param {HTMLElement} gallery - контейнер галереи
 * @param {number} columns - количество столбцов
 */
function setColumns(gallery, columns) {
  gallery.style.columnCount = columns
}

/**
 * Инициализирует анимацию появления элементов при скролле
 * @param {Array<HTMLElement>} items - элементы галереи
 */
function initScrollAnimation(items) {
  if (!items.length) return

  // Создаем Intersection Observer для анимации появления
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          // Отключаем наблюдение после появления
          observer.unobserve(entry.target)
        }
      })
    },
    {
      root: null,
      rootMargin: '50px', // Начинаем анимацию за 50px до появления элемента
      threshold: 0.1,
    }
  )

  // Наблюдаем за каждым элементом
  items.forEach((item, index) => {
    // Добавляем небольшую задержку для последовательной анимации
    item.style.transitionDelay = `${index * 0.1}s`
    observer.observe(item)
  })

  // Обработка изменения размера окна для обновления количества столбцов
  let resizeTimeout
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const galleries = document.querySelectorAll('[data-gallery-mosaic]')
      galleries.forEach((gallery) => {
        const columns = gallery.dataset.columns || getDefaultColumns()
        setColumns(gallery, columns)
      })
    }, 250)
  })
}
