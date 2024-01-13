import type { Page } from 'puppeteer'

import type { ContractDeployment } from '../types'

import { extractContractDeploymentsFromPageLists } from './list'
import { extractDeploymentsFromPageTables } from './table'

export { uniqueContracts } from './util'
export async function extractContracts(
  page: Page,
): Promise<ContractDeployment[]> {
  if (!page || page.isClosed()) {
    return []
  }

  const tableDeployments = await extractDeploymentsFromPageTables(page)
  const listDeployments = await extractContractDeploymentsFromPageLists(page)
  return [...tableDeployments.flat(), ...listDeployments]
}
