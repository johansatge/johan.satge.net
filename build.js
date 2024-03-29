const fs = require('fs')
const fsp = require('fs').promises
const path = require('path')

const srcPath = path.join(__dirname, 'src')
const distPath = path.join(__dirname, 'dist')

build()
if (process.argv.includes('--watch')) {
  const httpdir = require('/usr/local/lib/node_modules/httpdir')
  const server = httpdir.createServer({ basePath: 'dist', httpPort: 8789 })
  server.onStart(({ urls }) => {
    console.log(urls.join('\n'))
  })
  server.start()
  buildOnChange()
}

async function build() {
  const startMs = Date.now()
  try {
    await makeDist()
    await writeHtml({
      html: await getHtml(),
      styles: await getStyles(),
      scripts: await getScripts(),
    })
    await writeFonts()
    await writeRobots()
    await writeHeaders()
    console.log(`Built (${Date.now() - startMs}ms)`)
  } catch (error) {
    console.log(`Build error: ${error.message} (${error.stack})`)
  }
}

async function buildOnChange() {
  console.log(`Watching ${srcPath}`)
  fs.watch(srcPath, { recursive: true }, (evtType, file) => {
    console.log(`Event ${evtType} on ${file}, building...`)
    build()
  })
}

async function makeDist() {
  try {
    await fsp.rm(distPath, { recursive: true })
  } catch(error) {}
  await fsp.mkdir(distPath, { recursive: true })
}

async function getHtml() {
  return await fsp.readFile(path.join(srcPath, 'index.html'), 'utf8')
}

async function getStyles() {
  let css = await fsp.readFile(path.join(srcPath, 'styles.css'), 'utf8')
  css = css.replace(/\n/g, ' ')
  css = css.replace(/ {2,}/g, '')
  return css
}

async function getScripts() {
  let js = await fsp.readFile(path.join(srcPath, 'scripts.js'), 'utf8')
  js = js.replace(/\n/g, ';')
  js = js.replace(/ {2,}/g, '')
  return js
}

async function writeHtml({ html, styles, scripts }) {
  html = html.replace('__styles__', styles)
  html = html.replace('__scripts__', scripts)
  html = html.replace(/ {2,}/g, '')
  await fsp.writeFile(path.join(distPath, 'index.html'), html, 'utf8')
}

async function writeFonts() {
  const srcFiles = await fsp.readdir(srcPath)
  for(const file of srcFiles) {
    if (file.match(/\.woff2?/)) {
      await fsp.copyFile(path.join(srcPath, file), path.join(distPath, file))
    }
  }
}

async function writeRobots() {
  await fsp.copyFile(path.join(srcPath, 'robots.txt'), path.join(distPath, 'robots.txt'))
}

async function writeHeaders() {
  await fsp.copyFile(path.join(srcPath, '_headers'), path.join(distPath, '_headers'))
}