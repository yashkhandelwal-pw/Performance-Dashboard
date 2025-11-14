import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../utils/auth'
import { getSampleRequests, calculateKPIs, getQuotaData, getQuotaUtilisation } from '../services/fetchData'
import { getCachedData, setCachedData, generateCacheKey } from '../services/cacheService'
import { exportToExcel } from '../services/exportExcel'
import KPIcard from '../components/KPIcard'
import MultiKPI from '../components/MultiKPI'
import FilterBar from '../components/FilterBar'
import DataTable from '../components/DataTable'

const Sample = () => {
  const { userType, userEmail } = useAuthStore()
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
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
  const [quotaUtilisation, setQuotaUtilisation] = useState([])
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
  const [bookAnalysisView, setBookAnalysisView] = useState('Top 10') // 'Top 10' or 'Low 10'

  useEffect(() => {
    // On initial load, always fetch fresh data
    if (isInitialLoad) {
      loadData(true)
      setIsInitialLoad(false)
    } else {
      // On filter change, try cache first, then fetch
      loadData(false)
    }
  }, [filters, statusFilter])

  // Search filter effect
  useEffect(() => {
    if (searchQuery.trim() === '') {
      // If no search query, just use the status-filtered data
      // Don't reset to all data, keep the status filter intact
    } else {
      // If there's a search query, filter by submission_id
      const filtered = data.filter(row =>
        row.submission_id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredData(filtered)
    }
  }, [searchQuery, data])

  const loadData = async (forceRefresh = false) => {
    setLoading(true)
    try {
      const requestFilters = {
        ...filters,
        userType,
        userEmail,
        statusFilter: statusFilter === 'ALL' ? undefined : statusFilter,
      }
      
      const cacheKey = generateCacheKey('sample', { ...requestFilters, statusFilter })
      
      // Try to get from cache if not forcing refresh
      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey + '_data')
        const cachedKPIs = getCachedData(cacheKey + '_kpis')
        const cachedQuota = getCachedData(cacheKey + '_quota')
        const cachedQuotaUtil = getCachedData(cacheKey + '_quota_util')
        
        if (cachedData && cachedKPIs && cachedQuota && cachedQuotaUtil) {
          setData(cachedData)
          setFilteredData(cachedData)
          setKpis(cachedKPIs)
          setQuotaData(cachedQuota)
          setQuotaUtilisation(cachedQuotaUtil)
          setLoading(false)
          return
        }
      }

      // Fetch fresh data
      const [requests, kpiData, quota, quotaUtil] = await Promise.all([
        getSampleRequests(requestFilters),
        calculateKPIs({
          ...filters,
          userType,
          userEmail,
        }),
        getQuotaData({
          ...filters,
          userType,
          userEmail,
        }),
        getQuotaUtilisation({
          ...filters,
          userType,
          userEmail,
        })
      ])
      
      setData(requests)
      setFilteredData(requests)
      setKpis(kpiData)
      setQuotaData(quota)
      setQuotaUtilisation(quotaUtil)

      // Cache the data
      setCachedData(cacheKey + '_data', requests)
      setCachedData(cacheKey + '_kpis', kpiData)
      setCachedData(cacheKey + '_quota', quota)
      setCachedData(cacheKey + '_quota_util', quotaUtil)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const exportData = filteredData.map(row => ({
      ...row,
      timestamp: row.timestamp || '',
      submission_id: row.submission_id || '',
      employee_email: row.employee_email || '',
      total_books: row.total_books || 0,
      sample_status: row.sample_status || '',
      dispatched_date: row.dispatched_date || '',
      tracking_id: row.tracking_id || '',
      tracking_link: row.tracking_link || '',
      delivered_date: row.delivered_date || '',
      sku_info: row.sku_info || '',
    }))
    
    const filename = `sample_requests_${new Date().toISOString().split('T')[0]}.xlsx`
    exportToExcel(exportData, filename)
  }

  // Analyze books by quantity
  const analyzeBooks = () => {
    const bookCounts = {}
    
    filteredData.forEach(row => {
      if (row.sku_info) {
        const items = row.sku_info.split(' // ')
        items.forEach(item => {
          const [name, qty] = item.split(' $ ')
          const bookName = name?.trim()
          const quantity = parseInt(qty?.trim() || '0')
          
          if (bookName) {
            if (bookCounts[bookName]) {
              bookCounts[bookName] += quantity
            } else {
              bookCounts[bookName] = quantity
            }
          }
        })
      }
    })

    // Convert to array and sort
    const bookArray = Object.entries(bookCounts).map(([name, qty]) => ({
      name,
      quantity: qty,
    }))

    // Sort by quantity
    bookArray.sort((a, b) => b.quantity - a.quantity)

    // Get Top 10 and Low 10
    const top10 = bookArray.slice(0, 10)
    const low10 = bookArray.slice(-10).reverse() // Reverse to show lowest first

    return { top10, low10 }
  }

  const { top10, low10 } = analyzeBooks()
  const displayBooks = bookAnalysisView === 'Top 10' ? top10 : low10

  const tableColumns = [
    { key: 'timestamp', label: 'Date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { key: 'submission_id', label: 'ID' },
    { key: 'employee_email', label: 'Email', render: (val) => val ? val.substring(0, 15) + '...' : '-' },
    { key: 'total_books', label: 'Books' },
    { 
      key: 'sample_status', 
      label: 'Status', 
      render: (val) => {
        if (val === 'B2B App Uploaded') return 'In Process'
        return val || '-'
      }
    },
    { key: 'dispatched_date', label: 'Dispatched', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { key: 'tracking_id', label: 'Track ID' },
    { key: 'tracking_link', label: 'Link', render: (val) => val ? <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Link</a> : '-' },
    { key: 'delivered_date', label: 'Delivered', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
  ]

  return (
    <div className="min-h-screen p-4 pb-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Sample Requests</h1>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            📥 Export
          </button>
        </div>

        <FilterBar filters={filters} onFilterChange={setFilters} />

        {/* KPIs - Small format with Quota - All same size */}
        <div className="bg-white rounded-xl p-4 shadow-lg mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Sample Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
            <KPIcard
              title="Remaining Quota"
              value={quotaData.remainingQuota}
              gradient="from-emerald-500 to-emerald-600"
              small={true}
            />
          </div>
        </div>

        <MultiKPI kpis={kpis} />

        {/* Quota Utilisation Table */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Quota Utilisation</h2>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Quota</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilised Quota</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quota Left</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilised %</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotaUtilisation.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-xs text-gray-500">
                      No quota data available
                    </td>
                  </tr>
                ) : (
                  quotaUtilisation.map((quota, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-800">
                        {quota.employeeName}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900 font-medium">
                        {quota.assignedQuota.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        {quota.utilisedQuota.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        {quota.quotaLeft.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs font-semibold">
                        <div className="flex items-center gap-2">
                          <span className={`${
                            quota.utilisedPercentage > 100 
                              ? 'text-red-600' 
                              : quota.utilisedPercentage >= 70 
                                ? 'text-yellow-600' 
                                : 'text-green-600'
                          }`}>
                            {quota.utilisedPercentage}%
                          </span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                quota.utilisedPercentage > 100 
                                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                                  : quota.utilisedPercentage >= 70 
                                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' 
                                    : 'bg-gradient-to-r from-green-500 to-green-600'
                              }`}
                              style={{ width: `${Math.min(quota.utilisedPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Book Analysis Section */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-800">Book Analysis</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setBookAnalysisView('Top 10')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  bookAnalysisView === 'Top 10'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Top 10
              </button>
              <button
                onClick={() => setBookAnalysisView('Low 10')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  bookAnalysisView === 'Low 10'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                Low 10
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Total Quantity</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayBooks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-xs text-gray-500">
                      No book data available
                    </td>
                  </tr>
                ) : (
                  displayBooks.map((book, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-900 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-800 break-words">
                        <div className="break-words" title={book.name}>
                          {book.name}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900 font-semibold whitespace-nowrap">
                        {book.quantity.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="my-4 flex flex-wrap gap-2">
          {['Order Placed', 'ZM Approval Pending', 'Dispatched', 'Delivered'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              {status}
            </button>
          ))}
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            All
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search by Submission ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sample Overview Table */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Sample Overview</h2>
          {loading ? (
            <div className="flex justify-center items-center h-64 bg-white rounded-xl">
              <div className="text-xs text-gray-500">Loading...</div>
            </div>
          ) : (
            <DataTable
              data={filteredData}
              columns={tableColumns}
              expandable={true}
            />
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default Sample

