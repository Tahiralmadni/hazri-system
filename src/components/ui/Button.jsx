import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

// Button variants using cva
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/90',
        destructive: 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:border-gray-600 dark:hover:bg-gray-700',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-700',
        link: 'underline-offset-4 hover:underline text-primary',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

// Animated button component
const Button = forwardRef(({ 
  className, 
  variant, 
  size, 
  children, 
  animate = true,
  ...props 
}, ref) => {
  const Comp = animate ? motion.button : 'button';
  
  const animationProps = animate ? {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.1 }
  } : {};

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...animationProps}
      {...props}
    >
      {children}
    </Comp>
  );
});

Button.displayName = 'Button';

export { Button, buttonVariants }; 