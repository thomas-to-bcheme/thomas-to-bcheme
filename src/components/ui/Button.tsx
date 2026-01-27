import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary';
  href?: string;
  external?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  href,
  external = false,
  className = '',
  onClick,
  disabled = false,
  type = 'button',
  children,
}) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm
    transition-all duration-200 hover:scale-[1.02] active:scale-95
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
  `.trim();

  const variantStyles = {
    primary: `
      bg-blue-600 text-white
      hover:bg-blue-700 dark:hover:bg-blue-500
      focus-visible:ring-blue-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black
    `.trim(),
    secondary: `
      bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white
      border border-zinc-200 dark:border-zinc-700
      hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800
      focus-visible:ring-zinc-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black
    `.trim(),
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  // Render as anchor if href is provided
  if (href) {
    return (
      <a
        href={href}
        className={combinedClassName}
        {...(external && {
          target: '_blank',
          rel: 'noopener noreferrer',
        })}
      >
        {children}
      </a>
    );
  }

  // Render as button otherwise
  return (
    <button
      type={type}
      className={combinedClassName}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
