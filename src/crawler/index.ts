import type { Page } from 'puppeteer'

import { extractContracts, uniqueContracts } from './contracts'
import type { CrawlContext, CrawlResult, ProcessContext } from './types'

const maxDepth = 10
const maxTotalLinks = 1000
const excludeLinkKeywords = [
  'discord',
  'twitter',
  'facebook',
  'reddit',
  'youtube',
  'github',
  'medium',
  'fb',
  't.me',
  'telegram',
  'instagram',
  'linkedin',
  'bodis',
  'google',
  'cookie',
]

/**
 * We will try to get the URLs for the socials and then crawl the doc pages
 * for the contract deployments.
 *
 * @param page
 * @param url
 * @param processContext
 */
export async function crawl(
  page: Page,
  url: string,
  processContext: ProcessContext,
): Promise<CrawlResult> {
  const context = constructContext(url, processContext)
  try {
    console.log(`Crawling ${url} ...`)
    await crawlHome(page, url, context)
    if (context.result.documentationHome) {
      await crawlDocs(page, context.result.documentationHome, context)
    }
  } catch (e) {
    console.error(`Error crawling ${url}:`, e)
  } finally {
    if (!page.isClosed()) {
      await page.close()
    }
  }

  return context.result
}

export async function crawlHome(
  page: Page,
  url: string,
  context: CrawlContext,
) {
  const links = await crawlSingleURL(page, url, context)
  if (links?.size) {
    extractSocialLinks(links, context)
  }
  if (context.result.hasSocials() && context.result.documentationHome) {
    return
  }

  const urlObj = new URL(url)
  const origin = urlObj.origin
  if (origin !== url) {
    await crawlHome(page, origin, context)
    return
  }

  // go one subdomain up
  const domainParts = urlObj.host.split(':')[0].split('.')
  if (domainParts.length < 3) {
    return
  }
  const newDomain = domainParts.slice(1).join('.')
  const newUrl = `${urlObj.protocol}//${newDomain}`
  await crawlHome(page, newUrl, context)
}

async function crawlDocs(
  page: Page,
  url: string,
  context: CrawlContext,
  depth = 0,
) {
  if (
    depth > maxDepth ||
    (!url.includes('docs') && !url.includes('documentation'))
  ) {
    return
  }

  const links = await crawlSingleURL(page, url, context)
  if (!links) {
    return
  }

  const deployments = await extractContracts(page)
  context.result.contractDeployments = uniqueContracts([
    ...deployments,
    ...context.result.contractDeployments,
  ])

  for (const link of links) {
    if (
      excludeLinkKeywords.some((keyword) => link.includes(keyword)) ||
      !isRelated(url, link)
    ) {
      continue
    }

    await crawlDocs(page, link, context, depth + 1)
  }
}

async function crawlSingleURL(page: Page, url: string, context: CrawlContext) {
  if (
    context.process.visited.has(url) ||
    context.visited.size > maxTotalLinks
  ) {
    return
  }

  context.process.visited.add(url)
  context.visited.add(url)
  const opened = await openURL(page, url)
  if (!opened) {
    return
  }

  const pageLinks = await page.$$eval('a', (links) =>
    links.map((link) => {
      const href = link.getAttribute('href')
      if (!href) {
        return null
      }
      try {
        const url = new URL(href, window.location.href)
        return url.protocol.startsWith('http') ? url.href : null
      } catch {
        return null
      }
    }),
  )

  return new Set(pageLinks.filter(Boolean) as string[])
}

async function openURL(page: Page, url: string): Promise<Page | undefined> {
  try {
    await page.goto(url, { waitUntil: 'networkidle2' })
    await page.waitForSelector('body')
    return page
  } catch (e) {
    // link is down
    return undefined
  }
}

function extractSocialLinks(links: Set<string>, context: CrawlContext) {
  for (const link of links) {
    if (link.includes('discord')) {
      context.result.discord.add(link)
    } else if (link.includes('https://twitter.com/')) {
      const username = link.split('/')[3]
      context.result.twitter.add(`https://twitter.com/${username}`)
    } else if (link.startsWith('https://github.com/')) {
      const org = link.split('/')[3]
      context.result.github.add(`https://github.com/${org}`)
    } else if (link.includes('t.me') || link.includes('telegram')) {
      context.result.telegram.add(link)
    } else if (
      link.includes('docs') ||
      link.includes('documentation') ||
      link.includes('dev')
    ) {
      context.result.documentationHome = commonBaseURL(
        context.result.documentationHome,
        link,
      )
    } else {
      links.delete(link)
    }
  }
}

function commonBaseURL(url1: string | undefined, url2: string | undefined) {
  if (!url1 || !url2) {
    return url1 || url2
  }

  const url1Obj = new URL(url1)
  const url2Obj = new URL(url2)

  if (url1Obj.origin !== url2Obj.origin) {
    // skip if origins are different
    return url1
  }

  // same origin, resolve the topmost path
  return new URL(
    resolveTopMostPath(url1Obj.pathname, url2Obj.pathname),
    url1Obj.origin,
  ).href
}

function isRelated(url1: string, url2: string) {
  const url1Host = new URL(url1).host
  const url2Host = new URL(url2).host

  if (url1Host === url2Host) {
    return true
  }

  const url1HostParts = url1Host.split('.')
  const url2HostParts = url2Host.split('.')
  if (url1HostParts.length < 2 || url2HostParts.length < 2) {
    return false
  }

  // allow different TLDs as long as the second-level domain is the same
  // allow all subdomains beyond the second-level domain
  // any other URL is not related
  return url1HostParts.slice(-2)[0] === url2HostParts.slice(-2)[0]
}

function constructContext(
  url: string,
  processContext: ProcessContext,
): CrawlContext {
  return {
    rootUrl: url,
    visited: new Set(),
    process: processContext,
    result: {
      rootUrl: url,
      github: new Set(),
      twitter: new Set(),
      telegram: new Set(),
      discord: new Set(),
      documentationHome: undefined,
      contractDeployments: [],
      hasSocials(): boolean {
        return (
          this.github.size > 0 ||
          this.twitter.size > 0 ||
          this.telegram.size > 0 ||
          this.discord.size > 0
        )
      },
      toJSON: function () {
        return this.hasSocials() ||
          this.documentationHome ||
          this.contractDeployments.length
          ? {
              rootUrl: this.rootUrl,
              github: this.github.size ? Array.from(this.github) : undefined,
              twitter: this.twitter.size ? Array.from(this.twitter) : undefined,
              telegram: this.telegram.size
                ? Array.from(this.telegram)
                : undefined,
              discord: this.discord.size ? Array.from(this.discord) : undefined,
              documentationHome: this.documentationHome,
              contracts: this.contractDeployments,
            }
          : undefined
      },
    },
  }
}

function resolveTopMostPath(path1: string, path2: string) {
  const path1Parts = path1.split('/')
  const path2Parts = path2.split('/')

  const commonParts = []
  for (let i = 0; i < path1Parts.length; i++) {
    if (path1Parts[i] === path2Parts[i]) {
      commonParts.push(path1Parts[i])
    } else {
      break
    }
  }

  return commonParts.join('/')
}
