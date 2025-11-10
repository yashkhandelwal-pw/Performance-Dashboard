import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../utils/auth'
import { calculateKPIs, getQuotaData } from '../services/fetchData'
import { getCachedData, setCachedData, generateCacheKey } from '../services/cacheService'
import KPIcard from '../components/KPIcard'
import MultiKPI from '../components/MultiKPI'
import FilterBar from '../components/FilterBar'

const Dashboard = () => {
  const { userType, userEmail } = useAuthStore()
  const [kpis, setKpis] = useState({
    sampleOrderPlaced: 0,
    totalRequestBooks: 0,
    orderReceived: 0,
    zmApprovalPending: 0,
    dispatched: 0,
    delivered: 0,
  })
  const [quotaData, setQuotaData] = useState({
    samplingQuota: 0,
    quotaUsed: 0,
    remainingQuota: 0,
    quotaUsedPercentage: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    selectedZM: 'ALL',
    selectedRM: 'ALL',
    selectedEmployee: 'ALL',
    userType,
    userEmail,
    statusFilter: 'ALL',
  })
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    // On initial load, always fetch fresh data
    if (isInitialLoad) {
      loadKPIs(true)
      setIsInitialLoad(false)
    } else {
      // On filter change, try cache first, then fetch
      loadKPIs(false)
    }
  }, [filters])

  const loadKPIs = async (forceRefresh = false) => {
    setLoading(true)
    try {
      const cacheKey = generateCacheKey('dashboard', { ...filters, userType, userEmail })
      
      // Try to get from cache if not forcing refresh
      if (!forceRefresh) {
        const cachedKPIs = getCachedData(cacheKey + '_kpis')
        const cachedQuota = getCachedData(cacheKey + '_quota')
        
        if (cachedKPIs && cachedQuota) {
          setKpis(cachedKPIs)
          setQuotaData(cachedQuota)
          setLoading(false)
          return
        }
      }

      // Fetch fresh data
      const [kpiData, quota] = await Promise.all([
        calculateKPIs({
          ...filters,
          userType,
          userEmail,
        }),
        getQuotaData({
          ...filters,
          userType,
          userEmail,
        })
      ])

      setKpis(kpiData)
      setQuotaData(quota)

      // Cache the data
      setCachedData(cacheKey + '_kpis', kpiData)
      setCachedData(cacheKey + '_quota', quota)
    } catch (error) {
      console.error('Error loading KPIs:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>

        <FilterBar filters={filters} onFilterChange={setFilters} />

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Main KPI Cards - Small format with Quota */}
            <div className="bg-white rounded-xl p-4 shadow-lg">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Sample Overview</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <KPIcard
                  title="Sample Order Placed"
                  value={kpis.sampleOrderPlaced}
                  gradient="from-purple-500 to-purple-600"
                  small={true}
                />
                <KPIcard
                  title="Total Request Books"
                  value={kpis.totalRequestBooks}
                  gradient="from-indigo-500 to-indigo-600"
                  small={true}
                />
              </div>
              {/* Quota KPIs - First 2 only for Dashboard */}
              <div className="grid grid-cols-2 gap-3">
                <KPIcard
                  title="Sampling Quota"
                  value={quotaData.samplingQuota}
                  gradient="from-teal-500 to-teal-600"
                  small={true}
                />
                <KPIcard
                  title="Quota Used"
                  value={quotaData.quotaUsed}
                  gradient="from-rose-500 to-rose-600"
                  small={true}
                  percentage={quotaData.quotaUsedPercentage}
                />
              </div>
            </div>

            {/* Multi KPI */}
            <MultiKPI kpis={kpis} />
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Dashboard


