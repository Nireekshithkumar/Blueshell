import logo from '../../assets/blueshells-logo.png?url'

type BrandLogoProps = {
  placement: 'navbar' | 'footer'
  onClick?: () => void
}

export function BrandLogo({ placement, onClick }: BrandLogoProps) {
  return (
    <a href="#home" aria-label="BlueShells home" className={`brand-logo brand-logo--${placement}`} onClick={onClick}>
      <img src={logo} width={1776} height={886} alt="BlueShells — An aquaculture assisting team" />
    </a>
  )
}
