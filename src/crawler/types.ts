export type ElementMeta = {
  selector: string
  innerTextHash: string
  pageUrl: string
  pageTitle: string
  nearestHeading?: string
}

export type ContractDeployment = {
  name?: string
  chainId?: number
  address: string
  abi?: string
  pageElementMeta?: ElementMeta
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
