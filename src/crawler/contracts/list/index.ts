import type { Page } from 'puppeteer'

import type { ContractDeployment } from '../../types'
import { getChainIdFromLinks } from '../util'

type DeploymentWithLinks = ContractDeployment & {
  links: string[]
}

export async function extractContractDeploymentsFromPageLists(page: Page) {
  const deployments = await getPageContractAddressListItems(page)
  for (const deployment of deployments) {
    deployment.chainId = getChainIdFromLinks(
      deployment.links,
      deployment.address,
    )
  }
  return deployments
}

function getPageContractAddressListItems(page: Page) {
  return page.evaluate(() => {
    const headingSelectors = [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'b',
      '.h1',
      '.h2',
      '.h3',
      '.h4',
      '.h5',
      '.h6',
    ]

    function normalizeCellData(s: string) {
      return s
        .replace(/[^\w\s,-]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    function getNearestHeading(element: HTMLElement) {
      while (element?.parentElement) {
        const siblings = Array.from(element.parentElement.children)
        for (let i = siblings.indexOf(element) - 1; i >= 0; i--) {
          const sibling = siblings[i]
          const heading = headingSelectors
            .flatMap((h) => Array.from(sibling.querySelectorAll(h)))
            .filter((el) =>
              normalizeCellData(el.textContent || ''),
            ) as Element[]

          if (headingSelectors.includes(sibling.nodeName.toLowerCase())) {
            heading.push(sibling)
          }
          if (heading.length) {
            return normalizeCellData(heading[heading.length - 1].textContent!)
          }
        }
        element = element.parentElement
      }
      return undefined
    }

    function getElementLinks(element: HTMLElement) {
      return Array.from(element.querySelectorAll('a')).map((a) => a.href)
    }

    async function sha256(text: string) {
      return Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
        ),
      )
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
    }

    async function getMeta(
      el: Element & { innerText: string },
      nearestHeading: string | undefined,
    ) {
      return {
        selector: `${el.nodeName}[${Array.from(el.attributes)
          .map((attr) => `${attr.name}="${attr.value}"`)
          .join(' ')}]`,
        innerTextHash: await sha256(el.innerText.trim()),
        pageUrl: el.ownerDocument.URL,
        pageTitle: el.ownerDocument.title,
        nearestHeading,
      }
    }

    async function getItems(): Promise<DeploymentWithLinks[]> {
      const items = [
        ...Array.from(document.querySelectorAll('li')),
        ...Array.from(document.querySelectorAll('p')),
      ].filter((it) =>
        /^\w+:0x[a-fA-F0-9]{40}$/.test(it.innerText.replace(/[^\w:]/g, '')),
      )

      const deployments: DeploymentWithLinks[] = []
      for (const item of items) {
        const text = item.innerText
          .trim()
          .replace(/\s+/g, '')
          .replace(/[^\w:]/g, '_')
          .replace(/_+/g, '_')

        const [name, address] = text.split(':')
        deployments.push({
          name,
          address: address.toLowerCase().replace(/_/g, ''), // in case of special characters
          pageElementMeta: await getMeta(item, getNearestHeading(item)),
          links: getElementLinks(item),
        })
      }
      return deployments
    }

    return getItems()
  })
}
