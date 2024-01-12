import type { TableCell } from './types'

export function cellText(cell: TableCell) {
  return typeof cell === 'string' ? cell : cell.text
}
