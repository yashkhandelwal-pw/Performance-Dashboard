import { motion } from 'framer-motion'

const KPIcard = ({ title, value, gradient = 'from-blue-500 to-blue-600', icon, small = false, percentage = null }) => {
  if (small) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${gradient} rounded-lg p-4 text-white shadow-lg`}
      >
        <p className="text-xs font-medium text-white/80">{title}</p>
        <p className="text-xl font-bold mt-1">{value?.toLocaleString() || 0}</p>
        {percentage !== null && (
          <p className="text-xs text-white/70 mt-1">({percentage}% used)</p>
        )}
      </motion.div>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${gradient} rounded-xl p-6 text-white shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold mt-2">{value?.toLocaleString() || 0}</p>
        </div>
        {icon && (
          <div className="text-4xl opacity-80">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default KPIcard


