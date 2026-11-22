import { type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonClass, type ButtonVariant } from './buttonStyles';
import { ArrowLead } from './Sign';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  /** Seta em quadrado na frente do rótulo (ações de caminho, anatomia da placa). */
  arrow?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'outline',
  icon: Icon,
  arrow = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, className)} {...rest}>
      {arrow && <ArrowLead />}
      {Icon && <Icon aria-hidden size={20} strokeWidth={2.25} />}
      <span>{children}</span>
    </button>
  );
}
