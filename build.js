const fs = require('fs')
const fsp = require('fs').promises
const path = require('path')
const http = require('http')
const { networkInterfaces } = require('os')

const srcPath = path.join(__dirname, 'src')
const distPath = path.join(__dirname, 'dist')
const localPort = 8789

build()
if (process.argv.includes('--watch')) {
  startLocalServer()
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
  let css = await fsp.readFile(path.join(srcPath, 'scripts.js'), 'utf8')
  css = css.replace(/\n/g, ';')
  css = css.replace(/ {2,}/g, '')
  return css
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

async function startLocalServer() {
  try {
    const server = http.createServer()
    server.on('request', onLocalServerRequest)
    server.on('error', onLocalServerError)
    server.listen(localPort)
    if (server.listening) {
      printLocalIps()
    }
  } catch(error) {
    console.log(`Server could not start: ${error.message}`)
  }
}

async function onLocalServerRequest(request, response) {
  try {
    if (request.method !== 'GET') {
      throw new Error(`Invalid method ${request.method}`)
    }
    const requestPath = request.url === '/' ? 'index.html' : request.url
    const contents = await fsp.readFile(path.join(distPath, requestPath))
    response.writeHead(200, { 'Content-Type': getMimeType(requestPath) })
    response.end(contents)
  } catch(error) {
    response.writeHead(500, { 'Content-Type': 'text/plain' })
    response.end(`An error occurred: ${error.message}\n(${error.stack})`)
  }
}

function getMimeType(requestPath) {
  const types = {
    html: 'text/html',
    woff: 'font/woff',
    woff2: 'font/woff2',
    js: 'application/javascript',
    json: 'application/json',
  }
  const ext = requestPath.substring(requestPath.lastIndexOf('.') + 1)
  return types[ext] || 'text/plain'
}

function onLocalServerError(error) {
  console.log(`A server error occurred: ${color(error.message, 'red')}`)
  process.exitCode = 1
}

function printLocalIps() {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4') {
        console.log(`Serving http://${net.address}:${localPort}`)
      }
    }
  }
}
