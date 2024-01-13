import fs from 'fs'
import path from 'path'

import puppeteer, { Browser } from 'puppeteer'

import { crawl } from './crawler'
import type { CrawlResult, ProcessContext } from './crawler/types'
import protocolUrls from './protocol-urls.json'

const crawledProtocolsFile = path.resolve('./crawled-protocols.json')
const crawledProtocolsBackupFile = path.resolve(
  './crawled-protocols-backup.json',
)

function writeResults(results: CrawlResult[]) {
  const resultPath = path.resolve(crawledProtocolsFile)
  results = JSON.parse(JSON.stringify(results)).filter(Boolean)
  const data = JSON.stringify(results, null, 2)
  fs.writeFileSync(resultPath, data)
}

function getCrawledProtocols(): CrawlResult[] {
  try {
    return JSON.parse(fs.readFileSync(crawledProtocolsFile, 'utf8'))
  } catch {
    return []
  }
}

async function crawlProtocols(
  browser: Browser,
  urls: string[],
  results: CrawlResult[] = [],
  maxSimultaneousCrawls = 40,
): Promise<CrawlResult[]> {
  const crawledUrls = new Set(results.map((p: CrawlResult) => p.rootUrl))
  const queue = urls.filter((url) => !crawledUrls.has(url))
  const inProgress = new Set<string>()
  const completed = new Set<string>()

  const existingPages = await browser.pages()
  for (const page of existingPages.slice(1)) {
    await page.close()
  }

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
    const crawledProtocols = getCrawledProtocols()
    fs.writeFileSync(
      crawledProtocolsBackupFile,
      JSON.stringify(crawledProtocols),
    )

    await crawlProtocols(browser, protocolUrls, crawledProtocols)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  throw err
})
