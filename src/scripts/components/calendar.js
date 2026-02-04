import AirDatepicker from 'air-datepicker'

export function calendarInit() {
  const calendar = new AirDatepicker('.filters_content_calendar', {
    // selectedDates: [new Date()],
    minDate: new Date(),
    range: true,
    fixedHeight: true,
    classes: 'calendar',
    onSelect: ({ date, formattedDate, datepicker }) => {
      console.log(formattedDate)

      const calendarFromDate = document.querySelector('#calendar-input-from')
      const calendarToDate = document.querySelector('#calendar-input-to')

      calendarFromDate.value = formattedDate[0]
      calendarToDate.value = formattedDate[1] || ''
    },
    onRenderCell: ({ date, cellType, datepicker }) => {
      // Disable all 12th dates in month
      if (cellType === 'day') {
        // if (date.getDate() === 12) {
        //   return {
        //     html: `<span>${date.getDate()}</span>`,
        //     // disabled: true,
        //     classes: 'disabled-class',
        //     attrs: {
        //       title: 'Cell is disabled',
        //     },
        //   }
        // }
        return {
          html: `${date.getDate()}<span class='calendar_event_indicator'></span>`,
          // disabled: true,
          classes: 'calendar_cell',
          attrs: {
            title: 'Has Event',
          },
        }
      }
      if (cellType === 'month' || cellType === 'year') {
        return {
          // disabled: true,
          classes: 'calendar_cell',
          attrs: {
            title: 'Has Event',
          },
        }
      }
    },
  })

  const calendarPrev = document.querySelector('.calendar_nav-prev')
  const calendarNext = document.querySelector('.calendar_nav-next')
  if (calendarPrev && calendarNext) {
    calendarPrev.addEventListener('click', () => {
      calendar.prev()
    })
    calendarNext.addEventListener('click', () => {
      calendar.next()
    })
  }
}
