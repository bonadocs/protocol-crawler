export type TableCellLink = {
  text: string
  href: string
}
export type TableCell = string | TableCellLink
export type TableRow = TableCell[]
export type Table = TableRow[]
