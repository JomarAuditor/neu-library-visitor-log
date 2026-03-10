interface Props { size?: number; className?: string; }

export function NEULogo({ size = 40, className = '' }: Props) {
  return (
    <img
      src="/neu-logo.svg"
      alt="New Era University"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
