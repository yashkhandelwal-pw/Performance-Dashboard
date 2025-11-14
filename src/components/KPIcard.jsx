import { motion } from 'framer-motion'

const KPIcard = ({ title, value, gradient = 'from-blue-500 to-blue-600', icon, small = false, percentage = null }) => {
  // Format value - if it's a number, format it, otherwise display as-is (for strings like ₹123)
  const displayValue = typeof value === 'number' ? value.toLocaleString() : (value || 0)
  
  if (small) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${gradient} rounded-lg p-3 sm:p-4 text-white shadow-lg overflow-hidden`}
      >
        <p className="text-[10px] sm:text-xs font-medium text-white/80 leading-tight">{title}</p>
        <p className="text-base sm:text-lg md:text-xl font-bold mt-1 break-words" title={displayValue}>{displayValue}</p>
        {percentage !== null && (
          <p className="text-[10px] sm:text-xs text-white/70 mt-1">({percentage}% used)</p>
        )}
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${gradient} rounded-xl p-4 sm:p-6 text-white shadow-lg overflow-hidden`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-white/80">{title}</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold mt-2 break-words" title={displayValue}>{displayValue}</p>
        </div>
        {icon && (
          <div className="text-3xl sm:text-4xl opacity-80 ml-2 flex-shrink-0">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default KPIcard


