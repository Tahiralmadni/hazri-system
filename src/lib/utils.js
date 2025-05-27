import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes without conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to a readable string
 */
export function formatDate(date, format = 'PP') {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Simple formatting options
    const options = {
      'PP': { year: 'numeric', month: 'long', day: 'numeric' },
      'P': { year: 'numeric', month: 'numeric', day: 'numeric' },
      'PPP': { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
      'time': { hour: '2-digit', minute: '2-digit' }
    };
    
    return d.toLocaleDateString(undefined, options[format] || options.PP);
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
}

/**
 * Delay execution for a specified time
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms)); 
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes without conflicts
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to a readable string
 */
export function formatDate(date, format = 'PP') {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Simple formatting options
    const options = {
      'PP': { year: 'numeric', month: 'long', day: 'numeric' },
      'P': { year: 'numeric', month: 'numeric', day: 'numeric' },
      'PPP': { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
      'time': { hour: '2-digit', minute: '2-digit' }
    };
    
    return d.toLocaleDateString(undefined, options[format] || options.PP);
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
}

/**
 * Delay execution for a specified time
 */
