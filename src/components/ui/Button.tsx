import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'white';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-sans tracking-wide uppercase transition-all duration-500 cursor-pointer',
        {
          'bg-black text-white hover:bg-gray':
            variant === 'primary',
          'border border-black text-black hover:bg-black hover:text-white':
            variant === 'outline',
          'border border-white text-white hover:bg-white hover:text-black':
            variant === 'white',
        },
        {
          'px-5 py-2 text-xs': size === 'sm',
          'px-8 py-3 text-xs': size === 'md',
          'px-10 py-4 text-sm': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
