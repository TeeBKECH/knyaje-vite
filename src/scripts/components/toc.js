/**
 * Строит оглавление для статьи.
 * @param {Object} options
 * @param {Element|string} options.root       - Корень, в котором искать заголовки (элемент или селектор).
 * @param {Element|string} options.toc        - UL-элемент или контейнер (селектор), куда положить список. Если контейнер не <ul>, будет создан <ul> внутри него.
 * @param {string} [options.h2Sel]            - Селектор H2.
 * @param {string} [options.h3Sel]            - Селектор H3.
 * @param {string} [options.submenuClass]     - Класс для вложенного UL с подзаголовками.
 * @param {string} [options.anchorPrefix]     - Префикс для сгенерированных id.
 */
export function buildToc({
  root,
  toc,
  h2Sel = 'h2',
  h3Sel = 'h3',
  submenuClass = 'toc-sub',
  anchorPrefix = 'sec-',
} = {}) {
  // Нормализация входных
  const rootEl = typeof root === 'string' ? document.querySelector(root) : root
  const tocContainer = typeof toc === 'string' ? document.querySelector(toc) : toc

  // Тихо выходим, если нет необходимых узлов
  if (!rootEl || !tocContainer) return null

  // Если контейнер не <ul>, ищем существующий <ul> или создаём новый
  let tocEl = tocContainer
  if (tocContainer.tagName !== 'UL') {
    const existingUl = tocContainer.querySelector('ul')
    if (existingUl) {
      tocEl = existingUl
    } else {
      tocEl = document.createElement('ul')
      tocContainer.appendChild(tocEl)
    }
  }

  // Ищем заголовки в правильном порядке потока документа
  const headings = Array.from(rootEl.querySelectorAll(`${h2Sel}, ${h3Sel}`)).filter(Boolean)

  if (!headings.length) {
    // Ничего не делаем, но и не падаем
    return null
  }

  // Утилита: транслитерация + слаг для ID (русский -> латиница)
  const translitMap = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'i',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }
  const slugify = (text) => {
    const lower = text.trim().toLowerCase()
    const tr = lower.replace(/[а-яё]/g, (ch) => translitMap[ch] ?? ch)
    return tr
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  // Уникальность id
  const used = new Map()
  const ensureUniqueId = (base) => {
    const key = base || 'section'
    const n = (used.get(key) ?? 0) + 1
    used.set(key, n)
    return n === 1 ? key : `${key}-${n}`
  }

  // Чистим целевой <ul>
  tocEl.innerHTML = ''

  let currentLi = null
  let currentSubUl = null

  headings.forEach((el) => {
    const isH2 = el.matches(h2Sel)
    const text = (el.textContent || '').trim()
    if (!text) return

    // Назначаем id, если его нет
    if (!el.id) {
      const base = slugify(text) || anchorPrefix + 'untitled'
      el.id = ensureUniqueId(`${anchorPrefix}${base}`)
    }

    if (isH2) {
      // Новый раздел
      currentLi = document.createElement('li')
      currentLi.classList.add('toc__item')

      const a = document.createElement('a')
      a.classList.add('toc__link')
      a.href = `#${el.id}`
      a.textContent = text

      currentLi.appendChild(a)
      tocEl.appendChild(currentLi)

      // Подсписок для h3
      currentSubUl = document.createElement('ul')
      currentSubUl.className = submenuClass
      currentLi.appendChild(currentSubUl)
    } else {
      // Подзаголовок уезжает в текущий раздел, если он есть
      if (!currentLi || !currentSubUl) {
        // Если встретился h3 без предшествующего h2 — создаём «виртуальный» раздел
        currentLi = document.createElement('li')
        const aStub = document.createElement('a')
        aStub.href = '#'
        aStub.textContent = 'Разное'
        aStub.addEventListener('click', (e) => e.preventDefault())
        currentLi.appendChild(aStub)

        currentSubUl = document.createElement('ul')
        currentSubUl.className = submenuClass
        currentLi.appendChild(currentSubUl)
        tocEl.appendChild(currentLi)
      }

      const li = document.createElement('li')
      li.classList.add(`${submenuClass}__item`)
      const a = document.createElement('a')
      a.classList.add(`${submenuClass}__link`)
      a.href = `#${el.id}`
      a.textContent = text
      li.appendChild(a)
      currentSubUl.appendChild(li)
    }
  })

  return tocEl
}

// (опционально) плавный скролл для якорей во всём документе
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]')
  if (!a) return
  const id = a.getAttribute('href').slice(1)
  const target = id && document.getElementById(id)
  if (!target) return
  e.preventDefault()
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
})
