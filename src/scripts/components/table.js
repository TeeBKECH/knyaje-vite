function initTableSorting() {
  const tables = document.querySelectorAll('.table-interactive')

  tables.forEach((table) => {
    const state = {
      currentSort: { column: null, direction: null },
      originalOrder: null,
    }

    setupTableHeaders(table, state)
  })
}

function setupTableHeaders(table, state) {
  const headers = table.querySelectorAll('.table_head_item-interactive')

  headers.forEach((header) => {
    header.style.cursor = 'pointer'
    header.addEventListener('click', () => handleHeaderClick(header, table, state))
  })
}

function handleHeaderClick(header, table, state) {
  const columnType = getColumnType(header)

  resetHeaderStyles(table)

  const newState = calculateNewSortState(state.currentSort, columnType)
  state.currentSort = newState

  if (newState.direction) {
    applyHeaderStyle(header, newState.direction)
    sortTable(table, newState, state)
  } else {
    restoreOriginalOrder(table, state)
  }
}

function calculateNewSortState(currentSort, columnType) {
  if (currentSort.column === columnType) {
    if (currentSort.direction === 'asc') {
      return { column: columnType, direction: 'desc' }
    } else if (currentSort.direction === 'desc') {
      return { column: null, direction: null }
    }
  }

  return { column: columnType, direction: 'asc' }
}

function resetHeaderStyles(table) {
  const headers = table.querySelectorAll('.table_head_item-interactive')

  headers.forEach((header) => {
    header.classList.remove('sorted-asc', 'sorted-desc')

    const existingArrow = header.querySelector('.sort-arrow')
    if (existingArrow) {
      existingArrow.remove()
    }
  })
}

function applyHeaderStyle(header, direction) {
  header.classList.add(`sorted-${direction}`)

  const arrow = document.createElement('span')
  arrow.className = `sort-arrow sort-arrow-${direction}`
  arrow.textContent = '↑'

  header.appendChild(arrow)
}

function getColumnType(header) {
  const text = header.textContent.trim()

  if (
    text.includes('Подписчики') ||
    header.closest('.table_head').querySelector('[data-table-sort="subs"]')
  ) {
    return 'subs'
  } else if (
    text.includes('Охват') ||
    header.closest('.table_head').querySelector('[data-table-sort="oxvat"]')
  ) {
    return 'oxvat'
  } else if (
    text.includes('Динамика') ||
    header.closest('.table_head').querySelector('[data-table-sort="dinamic"]')
  ) {
    return 'dinamic'
  }

  // Fallback - ищем по data-атрибутам в дочерних элементах
  const dataSortElements = header.querySelectorAll('[data-table-sort]')
  if (dataSortElements.length > 0) {
    return dataSortElements[0].getAttribute('data-table-sort')
  }

  return null
}

function sortTable(table, sortState, state) {
  const tableItems = Array.from(table.querySelectorAll('.table_item'))

  if (!state.originalOrder) {
    state.originalOrder = tableItems.map((item) => item.cloneNode(true))
  }

  const sortedItems = tableItems.sort((a, b) => {
    const valueA = extractSortValue(a, sortState.column)
    const valueB = extractSortValue(b, sortState.column)

    let comparison = 0

    if (valueA > valueB) {
      comparison = 1
    } else if (valueA < valueB) {
      comparison = -1
    }

    return sortState.direction === 'desc' ? -comparison : comparison
  })

  updateTableContent(table, sortedItems)
}

function extractSortValue(item, columnType) {
  const element = item.querySelector(`[data-table-sort="${columnType}"]`)
  if (!element) return 0

  let text = element.textContent.trim()

  // Для динамики сохраняем знак числа
  if (columnType === 'dinamic') {
    // Извлекаем числовое значение с учетом знака
    const numberMatch = text.match(/^([+-])?(\d+)$/)
    if (numberMatch) {
      const sign = numberMatch[1] === '-' ? -1 : 1
      const number = parseInt(numberMatch[2], 10)
      return sign * number
    }
  }

  // Для остальных колонок просто убираем пробелы
  const number = parseInt(text.replace(/\s/g, ''), 10)
  return isNaN(number) ? 0 : number
}

function updateTableContent(table, items) {
  const container = table.querySelector('.table_items')

  if (!container) return

  container.innerHTML = ''
  items.forEach((item) => container.appendChild(item))
}

function restoreOriginalOrder(table, state) {
  if (state.originalOrder && table.querySelector('.table_items')) {
    const container = table.querySelector('.table_items')
    container.innerHTML = ''
    state.originalOrder.forEach((item) => container.appendChild(item.cloneNode(true)))
  }
}

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', initTableSorting)

// Экспорт для использования в модульных системах
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initTableSorting }
}
