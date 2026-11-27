import type { ButtonHTMLAttributes, ComponentType } from 'react'

declare const SpecularButton: ComponentType<ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'sm' | 'md' | 'lg'
  followMouse?: boolean
}>
export default SpecularButton
