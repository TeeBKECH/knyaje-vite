/**
 * Транкейтит текст внутри контейнеров, сохраняя HTML-структуру.
 * Работает с любыми вложенными тегами (p, ul, li, a, strong и т.д.).
 *
 * @param {string} containerSelector - CSS-селектор контейнеров
 * @param {number} maxLength - максимальная длина текста (суммарно по всем узлам)
 * @param {object} options
 *  - showText: текст кнопки "показать"
 *  - hideText: текст кнопки "скрыть"
 *  - btnClass: класс кнопки
 *  - ellipsis: строка многоточия (по умолчанию "…")
 *  - smartWordCut: стараться резать по последнему пробелу (true)
 *  - breakpoint: медиа-запрос для активации обрезки (например, '(max-width: 767px)')
 */
export function truncateText(containerSelector, maxLength, options = {}) {
  const containers = document.querySelectorAll(containerSelector)
  if (!containers.length) return

  // Если указан breakpoint, используем медиа-запрос
  if (options.breakpoint) {
    const mq = window.matchMedia(options.breakpoint)
    
    // Сохраняем оригинальный HTML для всех контейнеров
    containers.forEach((container) => {
      if (!container.dataset.originalHTML) {
        container.dataset.originalHTML = container.innerHTML
      }
    })
    
    // Функция для применения/удаления обрезки
    const applyTruncation = (shouldTruncate) => {
      containers.forEach((container) => {
        const originalHTML = container.dataset.originalHTML
        const btn = container.nextElementSibling
        
        // Проверяем, есть ли уже кнопка
        const hasButton = btn && btn.classList.contains(options.btnClass || 'ad_show_more_btn')
        
        if (shouldTruncate) {
          // Всегда восстанавливаем оригинальный HTML перед обрезкой
          // (на случай если текст был развернут пользователем)
          container.innerHTML = originalHTML
          
          // Удаляем кнопку если она есть (будет создана заново при обрезке)
          if (hasButton) {
            btn.remove()
          }
          
          // Применяем обрезку
          truncateContainer(container, maxLength, options, originalHTML)
        } else {
          // Восстанавливаем оригинальный HTML и удаляем кнопку
          container.innerHTML = originalHTML
          if (hasButton) {
            btn.remove()
          }
        }
      })
    }
    
    // Применяем обрезку при загрузке если медиа-запрос активен
    applyTruncation(mq.matches)
    
    // Слушаем изменения медиа-запроса
    const handleChange = (e) => {
      applyTruncation(e.matches)
    }
    
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange)
    } else {
      mq.addListener(handleChange)
    }
    
    return
  }

  // Стандартное поведение без breakpoint
  containers.forEach((container) => {
    const originalHTML = container.innerHTML
    truncateContainer(container, maxLength, options, originalHTML)
  })
}

/**
 * Внутренняя функция для обрезки одного контейнера
 */
function truncateContainer(container, maxLength, options, originalHTML) {
  const ELLIPSIS = options.ellipsis ?? '…'
  const SMART_WORD_CUT = options.smartWordCut ?? true

  // Считаем общую длину plain-текста (без тегов)
  const fullText = container.textContent || container.innerText || ''
  if (fullText.length <= maxLength) {
    // Ничего не режем — кнопка не нужна
    return
  }

  // Клонируем узел вместе со всей вложенностью
  const truncatedClone = container.cloneNode(true)

  let currentLength = 0
  let hardStop = false

  // Хелпер: вырезать все "следующие" узлы после определённого
  function removeFollowingSiblings(node) {
    if (!node || !node.parentNode) return
    let next = node.nextSibling
    while (next) {
      const toRemove = next
      next = next.nextSibling
      toRemove.remove()
    }
  }

  // Находим «красивую» позицию среза в пределах remain
  function findCutIndex(text, remain) {
    if (remain <= 0) return 0
    if (!SMART_WORD_CUT) return remain

    const slice = text.slice(0, remain)
    // Ищем последний пробел не слишком далеко от конца,
    // чтобы не резать слишком рано
    const lastSpace = slice.lastIndexOf(' ')
    if (lastSpace === -1) return remain
    // Если пробел находится в пределах последних ~10 символов,
    // используем его, чтобы не обрывать слово
    if (lastSpace >= remain - 10) {
      return lastSpace
    }
    return remain
  }

  // Глубокий обход: считаем длину и при необходимости обрезаем текстовые узлы
  function walk(node) {
    if (hardStop) return

    // Текстовый узел — здесь реально режем
    if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.nodeValue || ''
      const txtLen = txt.length

      if (currentLength + txtLen <= maxLength) {
        currentLength += txtLen
        return
      }

      // Нужно обрезать именно в этом текстовом узле
      const remain = maxLength - currentLength
      if (remain > 0) {
        const cut = findCutIndex(txt, remain)
        const head = txt.slice(0, cut).replace(/\s+$/u, '')
        node.nodeValue = head + ELLIPSIS
      } else {
        // Вообще нет места — ставим только многоточие в этом узле
        node.nodeValue = ELLIPSIS
      }

      hardStop = true
      // Удаляем всё, что идёт после этого узла на текущем уровне
      removeFollowingSiblings(node)
      return
    }

    // Элемент — обходим детей по порядку
    if (node.nodeType === Node.ELEMENT_NODE && node.childNodes && node.childNodes.length) {
      // Идём по живому NodeList внимательнее: лучше собрать массив
      const children = Array.from(node.childNodes)
      for (const child of children) {
        if (hardStop) {
          // Если уже обрезали — чистим всех последующих
          removeFollowingSiblings(child.previousSibling || child)
          break
        }
        walk(child)
      }

      // Если после обхода сделали hardStop — удалим хвосты на этом уровне
      if (hardStop) {
        removeFollowingSiblings(node.lastChild)
      }
    }
  }

  // Обходим и обрезаем клон
  walk(truncatedClone)

  // Если по какой-то причине не обрезали (крайний случай) — выходим
  const truncatedHTML = truncatedClone.innerHTML
  if (truncatedHTML === originalHTML) return

  // Ставим укороченную версию
  container.innerHTML = truncatedHTML

  // Создаём кнопку
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = options.showText || 'Показать всё'
  btn.className = options.btnClass || 'ad_show_more_btn'

  // Вставляем кнопку после контейнера
  container.insertAdjacentElement('afterend', btn)

  // Переключатель состояний с плавной анимацией
  let expanded = false
  let isAnimating = false
  
  // Функция для плавной анимации высоты
  function animateHeight(element, fromHeight, toHeight, duration = 300, callback) {
    isAnimating = true
    element.style.height = fromHeight + 'px'
    element.style.overflow = 'hidden'
    element.style.transition = `height ${duration}ms ease-in-out`
    
    // Принудительный reflow для применения начальной высоты
    element.offsetHeight
    
    requestAnimationFrame(() => {
      element.style.height = toHeight + 'px'
      
      setTimeout(() => {
        element.style.height = ''
        element.style.overflow = ''
        element.style.transition = ''
        isAnimating = false
        if (callback) callback()
      }, duration)
    })
  }
  
  btn.addEventListener('click', () => {
    if (isAnimating) return
    
    const startHeight = container.offsetHeight
    expanded = !expanded
    
    if (expanded) {
      // Фиксируем текущую высоту перед изменением контента
      container.style.height = startHeight + 'px'
      container.style.overflow = 'hidden'
      
      // Принудительный reflow для применения начальной высоты
      container.offsetHeight
      
      // Устанавливаем полный текст
      container.innerHTML = originalHTML
      // Принудительный reflow после изменения контента
      container.offsetHeight
      const targetHeight = container.scrollHeight
      
      // Анимируем от текущей высоты к полной
      animateHeight(container, startHeight, targetHeight, 300, () => {
        btn.textContent = options.hideText || 'Скрыть'
      })
    } else {
      // Для скрытия: сначала измеряем целевую высоту без изменения контента
      isAnimating = true
      
      // Создаем временный элемент для измерения высоты обрезанного текста
      const tempContainer = container.cloneNode(false)
      tempContainer.style.position = 'absolute'
      tempContainer.style.visibility = 'hidden'
      tempContainer.style.height = 'auto'
      tempContainer.style.width = container.offsetWidth + 'px'
      tempContainer.innerHTML = truncatedHTML
      document.body.appendChild(tempContainer)
      const targetHeight = tempContainer.offsetHeight
      document.body.removeChild(tempContainer)
      
      // Теперь анимируем высоту от текущей к целевой (контент еще полный)
      container.style.transition = 'height 300ms ease-in-out'
      container.style.overflow = 'hidden'
      container.style.height = startHeight + 'px'
      
      // Принудительный reflow для применения стилей
      container.offsetHeight
      
      // Запускаем анимацию в следующем кадре
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          container.style.height = targetHeight + 'px'
          
          // Меняем контент только после завершения анимации
          setTimeout(() => {
            container.innerHTML = truncatedHTML
            container.style.height = ''
            container.style.overflow = ''
            container.style.transition = ''
            btn.textContent = options.showText || 'Показать всё'
            isAnimating = false
          }, 300)
        })
      })
    }
  })
}
