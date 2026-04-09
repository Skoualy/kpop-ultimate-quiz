export interface StatusBarItem {
  label: string
  value: string | number
}

export interface StatusBarProps {
  items: StatusBarItem[]
}
