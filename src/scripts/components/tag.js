/* === Show All Function === */
// add/remove hidden class
const addRemoveClassFunction = (arr, cls, type = 'add') => {
  arr?.forEach((el) => {
    if (type === 'add') {
      el.classList.add(cls)
    } else {
      el.classList.remove(cls)
    }
  })
}
document?.querySelectorAll('.tag_items').forEach((sm) => {
  const smViewCount = sm.getAttribute('data-show-more')
  if (!smViewCount) return

  const smItems = sm.querySelectorAll('.tag_item')
  if (smItems?.length <= smViewCount) return

  // smItems.forEach((item, i) => {
  //   if (i + 1 > smViewCount) {
  //     item.classList.add('hidden')
  //   }
  // })
  const moreBtn = sm.querySelector('.tag_item--showAll')
  // moreBtn?.classList?.add('show')
  moreBtn?.addEventListener('click', (e) => {
    addRemoveClassFunction(smItems, 'tag_item--hidden', 'remove')
    e.currentTarget.classList.add('tag_item--hidden')
  })
})
