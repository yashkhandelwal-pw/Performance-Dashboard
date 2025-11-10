import { motion } from 'framer-motion'

const MultiKPI = ({ kpis }) => {
  const items = [
    { label: 'Order Received', value: kpis?.orderReceived || 0, color: 'from-sky-400 to-sky-500' },
    { label: 'ZM Approval Pending', value: kpis?.zmApprovalPending || 0, color: 'from-amber-500 to-amber-600' },
    { label: 'Dispatched', value: kpis?.dispatched || 0, color: 'from-orange-500 to-orange-600' },
    { label: 'Delivered', value: kpis?.delivered || 0, color: 'from-green-500 to-green-600' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 shadow-lg"
    >
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Sample Order Status Overview</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${item.color} rounded-lg p-3 text-white`}
          >
            <p className="text-xs font-medium text-white/80">{item.label}</p>
            <p className="text-xl font-bold mt-1">{item.value?.toLocaleString() || 0}</p>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default MultiKPI


