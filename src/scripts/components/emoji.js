;(() => {
  const EMOJIS = ['👍', '👎', '❤️', '🔥', '😳', '😱', '😭', '😡', '🤗', '😂', '🎖', '😎']

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reacts').forEach(initReacts)
  })

  function initReacts(root) {
    // Проставим data-emoji на существующие кнопки и нормализуем счетчики
    root.querySelectorAll('.react .react_btn[data-react-fn="log"]').forEach((btn) => {
      const iconEl = btn.querySelector('.react_icon')
      if (iconEl) btn.dataset.emoji = (iconEl.textContent || '').trim()
      const countEl = btn.querySelector('.react_count')
      if (countEl) countEl.textContent = String(parseInt(countEl.textContent, 10) || 0)
    })

    // Создаём поповер один раз на блок .reacts
    const popover = createPopover(EMOJIS, (emoji) => {
      // Выбор эмодзи из поповера
      onSelectEmojiFromPopover(root, emoji)
      hidePopover(popover)
    })
    document.body.appendChild(popover)

    // Делегирование кликов
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('button.react_btn')
      if (!btn || !root.contains(btn)) return

      const fn = btn.dataset.reactFn
      if (fn === 'log') {
        e.preventDefault()
        toggleExistingReaction(btn)
      } else if (fn === 'add') {
        e.preventDefault()
        togglePopover(popover, btn)
      }
    })

    // Поддержка Enter/Space на кнопках
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const btn = e.target.closest('button.react_btn')
      if (!btn || !root.contains(btn)) return

      const fn = btn.dataset.reactFn
      if (fn === 'log' || fn === 'add') {
        e.preventDefault()
        btn.click()
      }
    })

    // Закрытие поповера снаружи и по Esc
    const outsideClick = (e) => {
      if (!isOpen(popover)) return
      if (e.target.closest('.reacts_popover')) return
      if (e.target.closest('.react_btn[data-react-fn="add"]')) return
      hidePopover(popover)
    }
    document.addEventListener('click', outsideClick)

    const onEsc = (e) => {
      if (e.key === 'Escape') hidePopover(popover)
    }
    document.addEventListener('keydown', onEsc)

    const onViewportChange = () => hidePopover(popover)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange, true)
  }

  // Тоггл по существующей реакции
  function toggleExistingReaction(btn) {
    const countEl = btn.querySelector('.react_count')
    let count = parseInt(countEl?.textContent, 10) || 0
    const isActive = btn.classList.contains('active')

    if (isActive) {
      // Снимаем свою реакцию
      if (count <= 1) {
        // Был один голос (наш) — удаляем реакцию из списка
        const wrapper = btn.closest('.react')
        wrapper?.remove()
      } else {
        countEl.textContent = String(count - 1)
        setActive(btn, false)
      }
    } else {
      // Ставим свою реакцию
      countEl.textContent = String(count + 1)
      setActive(btn, true)
    }
  }

  // Выбор эмодзи из поповера
  function onSelectEmojiFromPopover(root, emoji) {
    const btn = findReactionButton(root, emoji)

    if (btn) {
      // Если эмодзи уже есть: делаем активной, при необходимости увеличиваем счетчик
      if (!btn.classList.contains('active')) {
        const countEl = btn.querySelector('.react_count')
        const count = parseInt(countEl?.textContent, 10) || 0
        countEl.textContent = String(count + 1)
        setActive(btn, true)
      }
      // Если уже активна — ничего не делаем (не удваиваем голос)
    } else {
      // Добавляем новую эмодзи со счётом 1 и active
      const newItem = createReactionItem(emoji)
      const alt = root.querySelector('.react.react-alt')
      root.insertBefore(newItem, alt || null)
    }
  }

  function setActive(btn, state) {
    btn.classList.toggle('active', state)
    btn.setAttribute('aria-pressed', state ? 'true' : 'false')
  }

  function findReactionButton(root, emoji) {
    return root.querySelector(
      `.react .react_btn[data-react-fn="log"][data-emoji="${cssEscape(emoji)}"]`,
    )
  }

  function createReactionItem(emoji) {
    const wrap = document.createElement('div')
    wrap.className = 'react'

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'react_btn active'
    btn.dataset.reactFn = 'log'
    btn.dataset.emoji = emoji
    btn.title = emojiToTitle(emoji)
    btn.setAttribute('aria-pressed', 'true')

    const icon = document.createElement('span')
    icon.className = 'react_icon'
    icon.textContent = emoji

    const count = document.createElement('span')
    count.className = 'react_count'
    count.textContent = '1'

    btn.append(icon, count)
    wrap.appendChild(btn)
    return wrap
  }

  // Поповер
  function createPopover(emojis, onSelect) {
    const pop = document.createElement('div')
    pop.className = 'reacts_popover'
    pop.setAttribute('role', 'dialog')
    pop.setAttribute('aria-label', 'Выбор реакции')
    pop.hidden = true

    const list = document.createElement('div')
    list.className = 'reacts_popover_list'

    emojis.forEach((e) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'reacts_popover_item'
      b.dataset.emoji = e
      b.textContent = e
      b.addEventListener('click', () => onSelect(e))
      list.appendChild(b)
    })

    pop.appendChild(list)
    return pop
  }

  function togglePopover(popover, anchorBtn) {
    if (isOpen(popover)) {
      hidePopover(popover)
    } else {
      showPopover(popover, anchorBtn)
    }
  }

  function showPopover(popover, anchorBtn) {
    popover.hidden = false

    // Позиционируем около кнопки "+"
    const rect = anchorBtn.getBoundingClientRect()
    const gap = 8

    // Дождёмся отрисовки, чтобы корректно измерить размеры
    requestAnimationFrame(() => {
      const pr = popover.getBoundingClientRect()
      const width = pr.width || 240
      const height = pr.height || 44

      let top = rect.bottom + gap + window.scrollY
      // Если не влезает вниз — показываем сверху
      if (rect.bottom + height + gap > window.innerHeight) {
        top = rect.top - height - gap + window.scrollY
      }

      // По центру относительно кнопки, с ограничением по краям вьюпорта
      let left = rect.left + rect.width / 2 - width / 2 + window.scrollX
      left = Math.max(
        8 + window.scrollX,
        Math.min(left, window.scrollX + window.innerWidth - width - 8),
      )

      Object.assign(popover.style, {
        top: `${top}px`,
        left: `${left}px`,
      })
    })
  }

  function hidePopover(popover) {
    popover.hidden = true
  }

  function isOpen(popover) {
    return !popover.hidden
  }

  // Безопасный escape для querySelector
  function cssEscape(str) {
    if (window.CSS && typeof CSS.escape === 'function') return CSS.escape(str)
    // Эмодзи обычно безопасны для селектора, но подстрахуемся
    return String(str).replace(/["\\]/g, '\\$&')
  }

  function emojiToTitle(emoji) {
    const map = {
      '👍': 'thumbs up',
      '👎': 'thumbs down',
      '❤️': 'heart',
      '🔥': 'fire',
      '😳': 'flushed',
      '😱': 'scream',
      '😭': 'cry',
      '😡': 'angry',
      '🤗': 'hug',
      '😂': 'joy',
      '🎖': 'medal',
      '😎': 'cool',
    }
    return map[emoji] || emoji
  }
})()
