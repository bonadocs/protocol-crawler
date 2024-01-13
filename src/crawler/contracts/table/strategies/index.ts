import type { ContractDeployment } from '../../../types'
import type { Table } from '../types'

import {
  contractAddressStrategy,
  isContractAddressStrategy,
} from './contractAddressTableStrategy'
import {
  contractNetworkStrategy,
  isContractNetworkStrategy,
} from './contractNetworkTableStrategy'
import { determineTableStrategy } from './util'

export async function extractContractDeploymentsFromTable(
  table: Table,
): Promise<ContractDeployment[] | undefined> {
  const strategy = determineTableStrategy(table)
  if (!strategy) {
    return undefined
  }

  switch (strategy) {
    case 'contractAddress':
      return contractAddressStrategy(table)
    case 'contractNetwork':
      return contractNetworkStrategy(table)
  }
}

export {
  determineTableStrategy,
  isContractAddressStrategy,
  contractAddressStrategy,
  isContractNetworkStrategy,
  contractNetworkStrategy,
}
