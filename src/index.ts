import fs from 'fs'
import path from 'path'

import puppeteer, { Browser } from 'puppeteer'

import { crawl } from './crawler'
import type { CrawlResult, ProcessContext } from './crawler/types'
import protocolUrls from './protocol-urls.json'

function writeResults(results: CrawlResult[]) {
  const resultPath = path.resolve('./crawled-protocols.json')
  results = JSON.parse(JSON.stringify(results)).filter(Boolean)
  const data = JSON.stringify(results, null, 2)
  fs.writeFileSync(resultPath, data)
}

async function crawlProtocols(
  browser: Browser,
  urls: string[],
  maxSimultaneousCrawls = 30,
): Promise<CrawlResult[]> {
  const queue = [...urls]
  const inProgress = new Set<string>()
  const completed = new Set<string>()

  const existingPages = await browser.pages()
  for (const page of existingPages.slice(1)) {
    await page.close()
  }

  const results: CrawlResult[] = []
  const context: ProcessContext = {
    visited: new Set(),
  }
  while (queue.length > 0 || completed.size < urls.length) {
    while (inProgress.size < maxSimultaneousCrawls && queue.length > 0) {
      const url = queue.shift()!
      inProgress.add(url)
      const page = await browser.newPage()
      console.time(`Crawled ${url}`)
      crawl(page, url, context).then((result) => {
        results.push(result)
        console.timeEnd(`Crawled ${url}`)
        console.log('Total count:', results.length)
        writeResults(results)
        completed.add(url)
        inProgress.delete(url)
      })
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return results
}

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: null,
  })
  try {
    await crawlProtocols(browser, protocolUrls)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  throw err
})
