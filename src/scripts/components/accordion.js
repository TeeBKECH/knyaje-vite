// Accordions
export function accordionsInit() {
  const accordions = document.querySelectorAll('.ad_accordion')
  if (accordions.length > 0) {
    accordions.forEach((accordion, i) => {
      accordion.setAttribute('data-accordion-id', i)
      const accordionItemsTrigger = accordion.querySelectorAll(`.ad_accordion_toggle`)
      accordionItemsTrigger.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
          accordion.classList.toggle('open')
        })
      })
    })
  }
}
