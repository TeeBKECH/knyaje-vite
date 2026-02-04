/* FORM Star Rating */
// Находим все контейнеры с звездами
const starContainers = document.querySelectorAll('.stars-js')

// Перебираем все контейнеры
starContainers.forEach((container) => {
  const stars = container.querySelectorAll('.stars_item')
  const hiddenInput = container.nextElementSibling // Следующий элемент - input
  let currentRating = parseInt(container.getAttribute('data-review-stars')) || 0

  // Инициализируем начальное состояние
  updateStars(stars, currentRating)

  // Обработчики событий для каждой звезды
  stars.forEach((star, index) => {
    // Наведение на звезду
    star.addEventListener('mouseenter', () => {
      highlightStars(stars, index + 1)
    })

    // Уход курсора с звезды
    star.addEventListener('mouseleave', () => {
      updateStars(stars, currentRating)
    })

    // Клик по звезде
    star.addEventListener('click', () => {
      currentRating = index + 1
      container.setAttribute('data-review-stars', currentRating)
      hiddenInput.value = currentRating || 0
      updateStars(stars, currentRating)
    })
  })

  // Обработчики для всего контейнера (на случай, если курсор уйдет мимо звезд)
  container.addEventListener('mouseleave', () => {
    updateStars(stars, currentRating)
  })
})

// Функция для подсветки звезд при наведении
function highlightStars(stars, rating) {
  stars.forEach((star, index) => {
    star.classList.remove('stars_item-active', 'stars_item-hover')
    if (index < rating) {
      star.classList.add('stars_item-hover')
    }
  })
}

// Функция для обновления состояния звезд
function updateStars(stars, rating) {
  stars.forEach((star, index) => {
    star.classList.remove('stars_item-active', 'stars_item-hover')
    if (index < rating) {
      star.classList.add('stars_item-active')
    }
  })
}
