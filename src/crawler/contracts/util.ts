import axios from 'axios'

import { ContractDeployment } from '../types'

import type { TableCellLink, TableRow } from './table/types'

export const addressRegex = /0x[a-fA-F0-9]{40}/
export const chainIds = [
  {
    key: 'arbitrum nova',
    value: 42170,
  },
  {
    key: 'arbitrum goerli',
    value: 42170,
  },
  {
    key: 'boba avax',
    value: 43288,
  },
  {
    key: 'boba bnb',
    value: 56288,
  },
  {
    key: 'huobi eco',
    value: 128,
  },
  {
    key: 'polygon zk',
    value: 1101,
  },
  {
    key: 'zksync era',
    value: 324,
  },
  {
    key: 'arb',
    value: 42161,
  },
  {
    key: 'fuse',
    value: 122,
  },
  {
    key: 'celo',
    value: 42220,
  },
  {
    key: 'heco',
    value: 128,
  },
  {
    key: 'bittorrent',
    value: 199,
  },
  {
    key: 'gnosis',
    value: 100,
  },
  {
    key: 'metis',
    value: 1088,
  },
  {
    key: 'kava',
    value: 2222,
  },
  {
    key: 'opbnb',
    value: 204,
  },
  {
    key: 'bsc',
    value: 56,
  },
  {
    key: 'bnb',
    value: 56,
  },
  {
    key: 'binance',
    value: 56,
  },
  {
    key: 'eth',
    value: 1,
  },
  {
    key: 'fantom',
    value: 250,
  },
  {
    key: 'optim',
    value: 10,
  },
  {
    key: 'sepolia',
    value: 11155111,
  },
  {
    key: 'base',
    value: 8453,
  },
  {
    key: 'moonbeam',
    value: 1284,
  },
  {
    key: 'zkevm',
    value: 1101,
  },
  {
    key: 'linea',
    value: 59144,
  },
  {
    key: 'aurora',
    value: 1313161554,
  },
  {
    key: 'polygon',
    value: 137,
  },
  {
    key: 'aval',
    value: 43114,
  },
  {
    key: 'avax',
    value: 43114,
  },
  {
    key: 'boba',
    value: 288,
  },
  {
    key: 'evmos',
    value: 9001,
  },
  {
    key: 'harmony',
    value: 1666600000,
  },
  {
    key: 'moonriv',
    value: 1285,
  },
  {
    key: 'zksync',
    value: 324,
  },
  {
    key: 'goerli',
    value: 5,
  },
  {
    key: 'mainnet', // this is a fallback (if no chainId is found and the name contains mainnet)
    value: 1,
  },
]

export const explorers = [
  {
    explorer: 'https://bscscan.com',
    chainId: 56,
  },
  {
    explorer: 'https://etherscan.io',
    chainId: 1,
  },
  {
    explorer: 'https://ftmscan.com',
    chainId: 250,
  },
  {
    explorer: 'https://optimistic.etherscan.io',
    chainId: 10,
  },
  {
    explorer: 'https://arbiscan.io',
    chainId: 42161,
  },
  {
    explorer: 'https://snowtrace.io',
    chainId: 43114,
  },
  {
    explorer: 'https://polygonscan.com',
    chainId: 137,
  },
  {
    explorer: 'https://celoscan.io',
    chainId: 42220,
  },
  {
    explorer: 'https://gnosisscan.io',
    chainId: 100,
  },
  {
    explorer: 'https://goerli.etherscan.io',
    chainId: 5,
  },
  {
    explorer: 'https://testnet.bscscan.com',
    chainId: 97,
  },
  {
    explorer: 'https://bttcscan.com',
    chainId: 199,
  },
  {
    explorer: 'https://zkevm.polygonscan.com',
    chainId: 1101,
  },
  {
    explorer: 'https://testnet.ftmscan.com',
    chainId: 4002,
  },
  {
    explorer: 'https://testnet.snowtrace.io',
    chainId: 43113,
  },
  {
    explorer: 'https://alfajores.celoscan.io',
    chainId: 44787,
  },
  {
    explorer: 'https://testnet.polygonscan.com',
    chainId: 80001,
  },
  {
    explorer: 'https://goerli.arbiscan.io',
    chainId: 421613,
  },
  {
    explorer: 'https://sepolia.etherscan.io',
    chainId: 11155111,
  },
  {
    explorer: 'https://basescan.org',
    chainId: 8453,
  },
  {
    explorer: 'https://moonbeam.moonscan.io',
    chainId: 1284,
  },
  {
    explorer: 'https://moonriver.moonscan.io',
    chainId: 1285,
  },
  {
    explorer: 'https://aurorascan.dev',
    chainId: 1313161554,
  },
  {
    explorer: 'https://routescan.io/v2/network/mainnet/evm/288/etherscan',
    chainId: 288,
  },
  {
    explorer: 'https://explorer.dogechain.dog',
    chainId: 2000,
  },
  {
    explorer: 'https://block-explorer-mainnet.zksync.io',
    chainId: 324,
  },
  {
    explorer: 'https://lineascan.build',
    chainId: 59144,
  },
  {
    explorer: 'https://andromeda-explorer.metis.io',
    chainId: 1088,
  },
  {
    explorer: 'https://kavascan.com',
    chainId: 2222,
  },
  {
    explorer: 'https://nova-explorer.arbitrum.io',
    chainId: 42170,
  },
  {
    explorer: 'https://blockexplorer.avax.boba.network',
    chainId: 43288,
  },
  {
    explorer: 'https://blockexplorer.bnb.boba.network',
    chainId: 56288,
  },
  {
    explorer: 'https://explorer.fuse.io',
    chainId: 122,
  },
]

export function uniqueContracts(
  deployments: ContractDeployment[][] | ContractDeployment[],
) {
  const contracts = deployments.flat()
  const set = new Set()
  const result = []
  for (const contract of contracts) {
    if (!contract.chainId || !contract.name) {
      result.push(contract)
      continue
    }

    const chainAddressKey = `${contract.chainId}:${contract.address}`
    const nameChainKey = `${contract.name}:${contract.chainId}`
    if (set.has(chainAddressKey) || set.has(nameChainKey)) {
      continue
    }
    set.add(chainAddressKey)
    set.add(nameChainKey)
    result.push(contract)
  }
  return result
}

export async function getABIFromLink(
  link: string,
): Promise<string | undefined> {
  try {
    const origin = new URL(link).origin

    if (origin === 'https://github.com') {
      link = transformGithubLinkToRawLink(link)
    }

    const response = await axios(link, {
      validateStatus: () => true,
    })
    const functionDefinition = response.data.find(
      (t: { type: string }) => t.type === 'function',
    )
    if (!functionDefinition) {
      return undefined
    }
    return JSON.stringify(response.data)
  } catch (e) {
    return undefined
  }
}

export async function getABIFromRow(
  row: TableRow,
): Promise<string | undefined> {
  const links = row.filter(
    (cell) => typeof cell !== 'string',
  ) as TableCellLink[]
  const abis = await Promise.all(links.map((link) => getABIFromLink(link.href)))
  return abis.find(Boolean)
}

export function getChainIdFromLinks(
  link: string[],
  address: string,
): number | undefined {
  for (const l of link) {
    const chainId = getChainIdFromLink(l, address)
    if (chainId) {
      return chainId
    }
  }
  return undefined
}

export function getChainIdFromLink(
  link: string | undefined,
  address: string,
): number | undefined {
  try {
    if (!link?.toLowerCase().includes(`/address/${address.toLowerCase()}`)) {
      return undefined
    }

    return explorers.find((e) => link.includes(e.explorer))?.chainId
  } catch {
    return undefined
  }
}

function transformGithubLinkToRawLink(link: string): string {
  // check if link is a blob link
  const url = new URL(link)
  const [owner, repo, ...rest] = url.pathname.split('/').filter(Boolean)
  if (rest[0] === 'raw' || rest[0] === 'blob') {
    rest.shift()
  }

  const path = rest.join('/')
  return `https://raw.githubusercontent.com/${owner}/${repo}/${path}`
}
