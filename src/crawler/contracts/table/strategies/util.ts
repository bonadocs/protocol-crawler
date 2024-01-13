import type { Table } from '../types'

import { isContractAddressStrategy } from './contractAddressTableStrategy'
import { isContractNetworkStrategy } from './contractNetworkTableStrategy'

/**
 * For each strategy, we only need to support the row case.
 * We flip the table to get the column case.
 */
export type TableStrategy = 'contractAddress' | 'contractNetwork'

/**
 * Determines the strategy for extracting contract deployments
 * from a deployments table. The input is guaranteed to be a
 * deployments table.
 *
 * @param table
 */
export function determineTableStrategy(
  table: Table,
): TableStrategy | undefined {
  if (isContractNetworkStrategy(table)) {
    return 'contractNetwork'
  }

  if (isContractAddressStrategy(table)) {
    return 'contractAddress'
  }

  return undefined
}
