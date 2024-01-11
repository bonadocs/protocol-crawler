export type ContractDeployment = {
  name?: string
  chainId?: number
  address: string
  abi?: string
}

export type CrawlResult = {
  rootUrl: string
  github: Set<string>
  twitter: Set<string>
  telegram: Set<string>
  discord: Set<string>
  documentationHome: string | undefined
  contractDeployments: ContractDeployment[]
  hasSocials(): boolean
  toJSON(): Record<string, unknown> | undefined
}

export type CrawlContext = {
  rootUrl: string
  result: CrawlResult
  process: ProcessContext
  visited: Set<string>
}

export type ProcessContext = {
  visited: Set<string>
}
