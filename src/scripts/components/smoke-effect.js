/**
 * Эффект дыма/пара в интро блоке
 * Частицы дыма постоянно исходят из курсора мыши
 */

export function initSmokeEffect() {
  const introSection = document.querySelector('.intro')
  if (!introSection) return

  // Проверяем, поддерживает ли устройство hover (не мобильное)
  if (window.matchMedia('(hover: none)').matches) {
    return // Не запускаем на touch-устройствах
  }

  let particles = []
  let animationFrameId = null
  let lastSpawnTime = 0
  let mouseX = 0
  let mouseY = 0
  let isMouseInside = false

  // Создаем контейнер для частиц
  const particlesContainer = document.createElement('div')
  particlesContainer.className = 'intro_smoke-container'
  particlesContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
    overflow: hidden;
  `
  introSection.appendChild(particlesContainer)

  // Настройки эффекта (исходные значения)
  const config = {
    particleCount: 2, // Количество частиц за один кадр
    particleLifetime: 3500, // Время жизни частицы в мс
    particleSize: { min: 40, max: 90 }, // Размер частиц в px
    particleOpacity: { min: 0.2, max: 0.7 }, // Прозрачность
    riseSpeed: { min: 0.3, max: 0.8 }, // Скорость подъема (px/frame)
    driftSpeed: { min: -0.2, max: 0.2 }, // Скорость дрейфа влево/вправо (px/frame)
    spawnRadius: 25, // Радиус вокруг курсора для появления частиц
    maxParticles: 80, // Максимальное количество частиц одновременно
    spawnInterval: 70, // Интервал генерации частиц в мс
  }

  // Класс для частицы дыма
  class SmokeParticle {
    constructor(x, y) {
      this.x = x + (Math.random() - 0.5) * config.spawnRadius * 2
      this.y = y + (Math.random() - 0.5) * config.spawnRadius * 2
      this.size =
        Math.random() * (config.particleSize.max - config.particleSize.min) +
        config.particleSize.min
      this.opacity =
        Math.random() * (config.particleOpacity.max - config.particleOpacity.min) +
        config.particleOpacity.min
      this.riseSpeed =
        Math.random() * (config.riseSpeed.max - config.riseSpeed.min) + config.riseSpeed.min
      this.driftSpeed =
        Math.random() * (config.driftSpeed.max - config.driftSpeed.min) + config.driftSpeed.min
      this.lifetime = 0
      this.maxLifetime = config.particleLifetime
      this.element = null
      this.createElement()
    }

    createElement() {
      this.element = document.createElement('div')
      this.element.className = 'intro_smoke-particle'

      // Создаем более реалистичный вид дыма с помощью нескольких слоев
      const blurValue = Math.random() * 5 + 8 // Размытие от 8 до 13px
      this.element.style.cssText = `
        position: absolute;
        width: ${this.size}px;
        height: ${this.size}px;
        border-radius: 50%;
        background: radial-gradient(
          circle at center,
          rgba(255, 255, 255, ${this.opacity * 0.8}) 0%,
          rgba(255, 255, 255, ${this.opacity * 0.4}) 30%,
          rgba(255, 255, 255, ${this.opacity * 0.1}) 60%,
          rgba(255, 255, 255, 0) 100%
        );
        pointer-events: none;
        transform: translate(-50%, -50%);
        left: ${this.x}px;
        top: ${this.y}px;
        opacity: 0;
        transition: opacity 0.4s ease-out;
        filter: blur(${blurValue}px);
        mix-blend-mode: screen;
        will-change: transform, opacity, width, height;
      `
      particlesContainer.appendChild(this.element)
      // Плавное появление
      requestAnimationFrame(() => {
        if (this.element) {
          this.element.style.opacity = this.opacity
        }
      })
    }

    update() {
      this.lifetime += 16 // ~60fps
      this.y -= this.riseSpeed
      this.x += this.driftSpeed

      // Увеличиваем размер со временем (дым расширяется)
      const age = this.lifetime / this.maxLifetime
      const expansionFactor = 1 + age * 0.8 // Более заметное расширение
      const currentSize = this.size * expansionFactor
      this.element.style.width = `${currentSize}px`
      this.element.style.height = `${currentSize}px`

      // Уменьшаем прозрачность со временем (более плавное затухание)
      const fadeCurve = 1 - Math.pow(age, 1.5) // Нелинейное затухание
      const currentOpacity = this.opacity * fadeCurve
      this.element.style.opacity = currentOpacity

      // Обновляем позицию
      this.element.style.left = `${this.x}px`
      this.element.style.top = `${this.y}px`

      // Удаляем частицу, если она вышла за границы или истекло время
      const rect = introSection.getBoundingClientRect()
      const margin = currentSize * 2
      if (
        this.lifetime >= this.maxLifetime ||
        this.y < rect.top - margin ||
        this.x < rect.left - margin ||
        this.x > rect.right + margin
      ) {
        this.destroy()
        return false
      }
      return true
    }

    destroy() {
      if (this.element) {
        this.element.style.opacity = '0'
        this.element.style.transition = 'opacity 0.3s ease-out'
        setTimeout(() => {
          if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element)
          }
        }, 300)
      }
    }
  }

  // Функция анимации
  function animate(currentTime) {
    // Генерируем новые частицы постоянно из курсора мыши
    if (isMouseInside && particles.length < config.maxParticles) {
      if (currentTime - lastSpawnTime >= config.spawnInterval) {
        lastSpawnTime = currentTime

        // Получаем позицию курсора относительно интро-блока
        const rect = introSection.getBoundingClientRect()
        const x = mouseX - rect.left
        const y = mouseY - rect.top

        // Создаем частицы из позиции курсора
        for (let i = 0; i < config.particleCount; i++) {
          if (particles.length < config.maxParticles) {
            particles.push(new SmokeParticle(x, y))
          }
        }
      }
    }

    // Обновляем существующие частицы
    particles = particles.filter((particle) => particle.update())

    animationFrameId = requestAnimationFrame(animate)
  }

  // Обработчики событий мыши
  introSection.addEventListener('mouseenter', () => {
    isMouseInside = true
    if (!animationFrameId) {
      lastSpawnTime = performance.now()
      requestAnimationFrame(animate)
    }
  })

  introSection.addEventListener('mouseleave', () => {
    isMouseInside = false
  })

  introSection.addEventListener('mousemove', (e) => {
    mouseX = e.clientX
    mouseY = e.clientY
  })

  // Очистка при размонтировании (если нужно)
  return () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    particles.forEach((particle) => particle.destroy())
    if (particlesContainer && particlesContainer.parentNode) {
      particlesContainer.parentNode.removeChild(particlesContainer)
    }
  }
}
