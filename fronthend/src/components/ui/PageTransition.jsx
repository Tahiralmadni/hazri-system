import { motion } from 'framer-motion';

export const PageTransition = ({ children }) => {
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 10
    },
    in: {
      opacity: 1,
      y: 0
    },
    out: {
      opacity: 0,
      y: -10
    }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.3
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}; 