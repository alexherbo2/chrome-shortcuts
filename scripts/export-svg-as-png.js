import puppeteer from 'puppeteer'

import { pathToFileURL } from 'node:url'

const [INPUT, OUTPUT, WIDTH, HEIGHT] = process.argv.slice(2)

const browser = await puppeteer.launch()

const page = await browser.newPage()

await page.goto(
  pathToFileURL(INPUT).href
)

const fileElement = await page.waitForSelector('svg')

fileElement.evaluate((fileElement, width, height) => {
  fileElement.setAttribute('width', width)
  fileElement.setAttribute('height', height)
}, WIDTH, HEIGHT)

await fileElement.screenshot({
  path: OUTPUT,
  omitBackground: true,
})

await browser.close()
