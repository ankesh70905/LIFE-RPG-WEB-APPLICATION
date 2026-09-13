import {
  AnimatePresence,
  motion,
  useReducedMotion
} from "framer-motion";
import { useLocation } from "react-router-dom";

export const motionTransition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  mass: 0.7
};

export const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
};

export const fadeUpVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
};

export const staggerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04
    }
  }
};

export function useMotionTransition(duration = 0.28) {
  const reducedMotion = useReducedMotion();

  return reducedMotion
    ? { duration: 0 }
    : { duration, ease: [0.22, 1, 0.36, 1] };
}

/**
 * A route-level transition that respects prefers-reduced-motion and keeps
 * the previous page mounted until its exit animation has finished.
 */
export function PageTransition({ children }) {
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`${location.pathname}${location.search}`}
        className="page-transition"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={reducedMotion ? { duration: 0 } : motionTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function MotionList({
  children,
  className = "",
  as = "div",
  ...props
}) {
  const Component = motion[as] || motion.div;

  return (
    <Component
      className={className}
      {...props}
      variants={staggerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </Component>
  );
}

export function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div"
}) {
  const Component = motion[as] || motion.div;
  const reducedMotion = useReducedMotion();

  return (
    <Component
      className={`motion-reveal${className ? ` ${className}` : ""}`}
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      transition={
        reducedMotion
          ? { duration: 0 }
          : { ...motionTransition, delay: delay / 1000 }
      }
    >
      {children}
    </Component>
  );
}

export function MotionCard({
  children,
  className = "",
  as = "article",
  ...props
}) {
  const Component = motion[as] || motion.article;
  const reducedMotion = useReducedMotion();

  return (
    <Component
      className={className}
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      whileHover={reducedMotion ? undefined : { y: -3 }}
      transition={reducedMotion ? { duration: 0 } : motionTransition}
      {...props}
    >
      {children}
    </Component>
  );
}

export function MotionButton({ children, className = "", ...props }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      className={className}
      whileHover={reducedMotion ? undefined : { scale: 1.02 }}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      transition={reducedMotion ? { duration: 0 } : motionTransition}
      {...props}
    >
      {children}
    </motion.button>
  );
}
