import type { ElementHandle, Page } from 'puppeteer'

import type { ContractDeployment, ElementMeta } from '../../types'
import { addressRegex, chainIds } from '../util'

import { extractContractDeploymentsFromTable } from './strategies'
import type { Table } from './types'

export async function extractDeploymentsFromPageTables(page: Page) {
  const tables = await page.$$('table')
  return await Promise.all(
    tables.map((table) => extractDeploymentsFromTableElement(table)),
  )
}

/**
 * Extracts contract names and addresses from a table
 * @param table
 */
async function extractDeploymentsFromTableElement(
  table: ElementHandle<HTMLTableElement>,
): Promise<ContractDeployment[]> {
  const tableData = await getTableData(table)
  const isDeploymentsTable = !!tableData.find(
    (row) =>
      !!row.find((cell) =>
        typeof cell === 'string'
          ? addressRegex.test(cell)
          : addressRegex.test(cell.text),
      ),
  )

  // Ensure there's at least one address in the table (arr.find above helps us do that, .some will not)
  if (!isDeploymentsTable) {
    return []
  }

  const fromRows = await extractContractDeploymentsFromTable(tableData)
  const deployments =
    fromRows && fromRows.length
      ? fromRows
      : (await extractContractDeploymentsFromTable(
          flipRowColumns(tableData),
        )) || []

  if (!deployments.length) {
    return []
  }

  const tableMeta: ElementMeta = await table.evaluate((el) => {
    async function sha256(text: string) {
      return Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
        ),
      )
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
    }

    async function getMeta() {
      return {
        selector: `${el.nodeName}[${Array.from(el.attributes)
          .map((attr) => `${attr.name}="${attr.value}"`)
          .join(' ')}]`,
        innerTextHash: await sha256(el.innerText),
        pageUrl: el.ownerDocument.URL,
        pageTitle: el.ownerDocument.title,
      }
    }

    return getMeta()
  })

  for (const deployment of deployments) {
    deployment.pageElementMeta = tableMeta
  }

  return inferChainIdAndName(deployments, table, tableMeta)
}

/**
 * Extracts the data from by row in the table
 * @param table
 */
async function getTableData(table: ElementHandle<HTMLTableElement>) {
  // Iterate through each row in the tbody and extract data for each column
  return await table.evaluate((table) => {
    const tableData: Table = []
    const getCells = (row: HTMLTableRowElement) => {
      const headers = row.querySelectorAll('th')
      if (headers.length) {
        return Array.from(headers)
      }
      return Array.from(row.querySelectorAll('td'))
    }

    const rows = Array.from(table.rows).filter((row) => getCells(row).length)
    const maxColumns = Math.max(...rows.map((row) => getCells(row).length))
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      tableData.push(Array(maxColumns).fill(''))
      const cells = Array.from(getCells(row))
      for (let j = 0; j < cells.length; j++) {
        const cell = cells[j]
        const link = cell.querySelector('a')

        const cellText = (cell.innerText || '')
          .replace(/[^\w\s,-]/g, '')
          .replace(/\s+/g, ' ')
          .trim()

        tableData[tableData.length - 1][j] = !link
          ? cellText
          : {
              href: link.href,
              text: cellText,
            }
      }
    }

    // remove empty rows
    return tableData.filter((row) => row.some(Boolean))
  })
}

function flipRowColumns(data: Table) {
  const result: Table = []
  for (let i = 0; i < data[0].length; i++) {
    result.push([])
    for (let j = 0; j < data.length; j++) {
      result[i].push(data[j][i])
    }
  }
  return result
}

async function inferChainIdAndName(
  deployments: ContractDeployment[],
  table: ElementHandle<HTMLTableElement>,
  tableMeta: ElementMeta,
) {
  // We were able to extract network and name from the table
  if (hasChainIdAndName(deployments)) {
    return deployments
  }

  if (hasNoChainId(deployments)) {
    const inferredNetwork = inferNetworkFromHeading(tableMeta.pageTitle)
    if (inferredNetwork) {
      for (const deployment of deployments) {
        deployment.chainId = inferredNetwork
      }
    }
  }

  if (hasChainIdAndName(deployments)) {
    return deployments
  }

  const nearestHeading = await getTableNearestHeading(table)
  if (!nearestHeading) {
    return deployments
  }

  for (const deployment of deployments) {
    deployment.pageElementMeta!.nearestHeading = nearestHeading
  }

  if (hasNoChainId(deployments)) {
    const inferredNetwork = inferNetworkFromHeading(nearestHeading)
    if (inferredNetwork) {
      for (const deployment of deployments) {
        deployment.chainId = inferredNetwork
      }
    }
  } else if (hasNoName(deployments)) {
    for (const deployment of deployments) {
      deployment.name = nearestHeading
    }
  }
  return deployments
}

function inferNetworkFromHeading(title: string) {
  return chainIds.find((c) => title.toLowerCase().includes(c.key))?.value
}

function hasChainIdAndName(deployments: ContractDeployment[]) {
  return (
    deployments.some((d) => d.chainId != null) &&
    deployments.some((d) => d.name != null)
  )
}

function getTableNearestHeading(table: ElementHandle<HTMLTableElement>) {
  return table.evaluate((table) => {
    let element: HTMLElement | null = table
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

    while (element?.parentElement) {
      const siblings = Array.from(element.parentElement.children)
      for (let i = siblings.indexOf(element) - 1; i >= 0; i--) {
        const sibling = siblings[i]
        const heading = headingSelectors
          .flatMap((h) => Array.from(sibling.querySelectorAll(h)))
          .filter((el) => normalizeCellData(el.textContent || '')) as Element[]

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
  })
}

function hasNoChainId(deployments: ContractDeployment[]) {
  return deployments.every((d) => d.chainId == null)
}

function hasNoName(deployments: ContractDeployment[]) {
  return deployments.every((d) => d.name == null)
}
