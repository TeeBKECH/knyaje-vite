/**
 * Класс для управления прогресс-баром квиза
 * @class QuizProgress
 */
export class QuizProgress {
  constructor(container) {
    if (!container) {
      return this.createStub()
    }

    this.container = container
    this.fill = container.querySelector('.quiz_progress__fill')
    this.percentage = container.querySelector('.quiz_progress__percentage')

    if (!this.fill || !this.percentage) {
      return this.createStub()
    }

    this.isInitialized = true
    this.currentPercentage = 0
    this.animationFrameId = null
  }

  createStub() {
    console.log('QuizProgress: прогресс-бар не найден, использую заглушку')
    this.isInitialized = false

    // Возвращаем тот же объект, но методы ничего не делают
    return this
  }

  updateProgress(current, total) {
    if (!this.isInitialized) return

    const targetPercentage = Math.round((current / total) * 100)
    
    // Останавливаем предыдущую анимацию, если она есть
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    // Анимируем изменение процентов
    this.animatePercentage(this.currentPercentage, targetPercentage)

    if (targetPercentage === 100) {
      this.container.classList.add('quiz_progress--completed')
    } else {
      this.container.classList.remove('quiz_progress--completed')
    }
  }

  /**
   * Анимация изменения процентов
   */
  animatePercentage(from, to) {
    const startTime = performance.now()
    const duration = 500 // Длительность анимации в миллисекундах
    const startValue = from
    const endValue = to

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Используем easing функцию для плавности (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      
      const currentValue = Math.round(startValue + (endValue - startValue) * easeProgress)
      
      // Обновляем визуальное отображение
      this.fill.style.width = `${currentValue}%`
      this.percentage.textContent = `${currentValue}%`
      this.currentPercentage = currentValue

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate)
      } else {
        // Убеждаемся, что финальное значение установлено точно
        this.fill.style.width = `${endValue}%`
        this.percentage.textContent = `${endValue}%`
        this.currentPercentage = endValue
        this.animationFrameId = null
      }
    }

    this.animationFrameId = requestAnimationFrame(animate)
  }

  getCurrentValue() {
    if (!this.isInitialized) return 0
    const text = this.percentage.textContent
    const match = text.match(/(\d+)%/)
    return match ? parseInt(match[1]) : 0
  }

  isCompleted() {
    return this.getCurrentValue() === 100
  }

  reset() {
    if (!this.isInitialized) return
    this.updateProgress(0, 1)
  }

  getProgress(total) {
    if (!this.isInitialized) return 0
    const width = this.fill.style.width
    const percentage = parseInt(width.replace(/\D/g, '')) || 0
    return Math.round((percentage / 100) * total)
  }
}
