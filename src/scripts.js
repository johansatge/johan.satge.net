const node = document.querySelector('[js-emoji]')
const emojis = ['🌵', '🌴', '🌳', '🌲', '🍁', '🍂', '🌿']
node.innerText = emojis[Math.floor(Math.random() * emojis.length)]
node.classList.add('emoji--pop')
node.addEventListener('animationend', () => node.classList.remove('emoji--pop'), { once: true })
