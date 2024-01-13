import type { ContractDeployment } from '../../../types'
import { addressRegex, chainIds, explorers, getABIFromRow } from '../../util'
import type { Table, TableCell } from '../types'
import { cellText } from '../util'

export function isContractNetworkStrategy(table: Table): boolean {
  const networkNames = table[0].filter((key) =>
    chainIds.some((c) => cellText(key).toLowerCase().includes(c.key)),
  )

  return networkNames.length > 0
}

/**
 * Extracts the contract names addresses from a table like this:
 *
 * | Contract Name | Network1, Network2 | Network3 |
 * | ------------- | ----------------- | -------- |
 * | Contract 1    | 0x123             | 0x456    |
 *
 * Network is known and a part of the table in this strategy.
 * An optional column for ABI is supported.
 * Blank cells or invalid addresses are ignored.
 *
 * @param table
 */
export async function contractNetworkStrategy(
  table: Table,
): Promise<ContractDeployment[] | undefined> {
  const networkColumns = table[0]
    .map((c, i) => [c, i] as const)
    .filter(([cell]) =>
      chainIds.some((c) => cellText(cell).toLowerCase().includes(c.key)),
    )

  if (networkColumns.length === 0) {
    return undefined
  }

  let indexOfContractNamesColumn = table[0].findIndex((key) =>
    cellText(key).toLowerCase().includes('contract'),
  )

  if (indexOfContractNamesColumn < 0) {
    indexOfContractNamesColumn = table[0].findIndex((key) =>
      cellText(key).toLowerCase().includes('name'),
    )
  }

  if (indexOfContractNamesColumn < 0) {
    indexOfContractNamesColumn = table[0].findIndex((key) =>
      cellText(key).toLowerCase().includes('token'),
    )
  }

  // there might not be a contract name column
  // we'll try to infer the name at the table level

  const contractDeployments: ContractDeployment[] = []
  for (let i = 1; i < table.length; i++) {
    const row = table[i]

    const nameCell = row[indexOfContractNamesColumn]
    const contractName = nameCell ? cellText(nameCell) : undefined
    for (let j = 0; j < networkColumns.length; j++) {
      const networkNames = cellText(networkColumns[j][0])
        .split(',')
        .map((s) => s.trim())

      const addressCell = row[networkColumns[j][1]]
      if (!addressRegex.test(cellText(addressCell))) {
        continue
      }

      for (const networkName of networkNames) {
        const chainId =
          chainIds.find((c) => networkName.toLowerCase().includes(c.key))
            ?.value ||
          getChainIdFromCell(addressCell) ||
          getChainIdFromCell(nameCell)

        if (!chainId) {
          continue
        }

        contractDeployments.push({
          name: contractName,
          address: cellText(addressCell),
          chainId: chainId,
          abi: await getABIFromRow(row),
        })
      }
    }
  }

  return contractDeployments
}

function getChainIdFromCell(cell: TableCell) {
  try {
    const link = typeof cell === 'string' ? cell : cell.href
    if (!link.includes(`/address/${cellText(cell)}`)) {
      return undefined
    }

    return explorers.find((e) => link.includes(e.explorer))?.chainId
  } catch {
    return undefined
  }
}
