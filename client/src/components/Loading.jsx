import { motion, useReducedMotion } from "framer-motion";

export default function Loading({ label = "Loading..." }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      className="loading-state page-transition"
      role="status"
      aria-busy="true"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
    >
      <motion.div
        className="loading-orb"
        aria-hidden="true"
        animate={reducedMotion ? undefined : { scale: [1, 1.05, 1] }}
        transition={reducedMotion ? undefined : { duration: 1.4, repeat: Infinity }}
      >
        <motion.span
          className="loading-spinner"
          animate={reducedMotion ? undefined : { rotate: 360 }}
          transition={reducedMotion ? undefined : { duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
      <span className="loading-label">{label}</span>
      <motion.span
        className="loading-skeleton"
        aria-hidden="true"
        initial={reducedMotion ? false : { opacity: 0.45 }}
        animate={reducedMotion ? undefined : { opacity: [0.45, 1, 0.45] }}
        transition={reducedMotion ? undefined : { duration: 1.2, repeat: Infinity }}
      >
        <i />
        <i />
        <i />
      </motion.span>
    </motion.div>
  );
}
