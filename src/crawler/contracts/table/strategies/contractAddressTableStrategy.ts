import type { ContractDeployment } from '../../../types'
import { addressRegex, getABIFromRow, getChainIdFromLinks } from '../../util'
import type { Table, TableRow } from '../types'
import { cellText } from '../util'

export function isContractAddressStrategy(table: Table): boolean {
  const indexOfAddressesColumn = table[0].findIndex((key) =>
    cellText(key).toLowerCase().includes('address'),
  )

  let indexOfContractNamesColumn = table[0].findIndex((key) =>
    cellText(key).toLowerCase().includes('contract'),
  )

  if (indexOfAddressesColumn < 0) {
    return false
  }

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

  return indexOfContractNamesColumn >= 0
}

/**
 * Extracts the contract names addresses from a table like this:
 *
 * | Contract Name | Address |
 * | ------------- | ------- |
 * | Contract 1    | 0x123   |
 *
 * Network is unknown and not part of the table in this strategy.
 * Network can be inferred when addresses are linked to block explorers.
 * Blank cells or invalid addresses are ignored.
 *
 * An optional column for ABI is supported.
 *
 * @param table
 */
export async function contractAddressStrategy(
  table: Table,
): Promise<ContractDeployment[] | undefined> {
  const indexOfAddressesColumn = table[0].findIndex((key) =>
    cellText(key).toLowerCase().includes('address'),
  )

  if (indexOfAddressesColumn < 0) {
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

  if (indexOfContractNamesColumn < 0) {
    return undefined
  }

  const contractDeployments: ContractDeployment[] = []
  for (let i = 1; i < table.length; i++) {
    const addressCell = table[i][indexOfAddressesColumn]

    if (!addressRegex.test(cellText(addressCell))) {
      continue
    }

    // some tables have a column for a linked ABI
    // some tables have a column for a linked block explorer page
    contractDeployments.push({
      name: cellText(table[i][indexOfContractNamesColumn]),
      address: cellText(addressCell),
      abi: await getABIFromRow(table[i]),
      chainId: getChainIdFromRow(table[i], cellText(addressCell)),
    })
  }

  return contractDeployments
}

function getChainIdFromRow(row: TableRow, address: string) {
  const links = row
    .filter(
      (cell) =>
        (typeof cell !== 'string' &&
          cell.href.includes(`/address/${address}`)) ||
        (typeof cell === 'string' && cell.includes(`/address/${address}`)),
    )
    .map((cell) => (typeof cell === 'string' ? cell : cell.href))

  return getChainIdFromLinks(links, address)
}
