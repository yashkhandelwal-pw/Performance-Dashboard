import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../utils/auth'
import {
  getOrderData,
  calculateOrderKPIs,
  getCustomerAnalysis,
  analyzeOrderBooks,
} from '../services/orderService'
import { getCachedData, setCachedData, generateCacheKey } from '../services/cacheService'
import { exportToExcel } from '../services/exportExcel'
import { formatIndianCurrency } from '../utils/formatCurrency'
import KPIcard from '../components/KPIcard'
import FilterBar from '../components/FilterBar'
import DataTable from '../components/DataTable'

const Order = () => {
  const { userType, userEmail } = useAuthStore()
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [kpis, setKpis] = useState({
    totalInvoiceAmount: 0,
    totalBooks: 0,
    totalOrderPlaced: 0,
    orderInProcess: 0,
    zmApprovalPending: 0,
    orderInTransit: 0,
    orderDelivered: 0,
    orderCancelled: 0,
  })
  const [customerAnalysis, setCustomerAnalysis] = useState([])
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    selectedZM: 'ALL',
    selectedRM: 'ALL',
    selectedEmployee: 'ALL',
    selectedCustomer: 'ALL',
    userType,
    userEmail,
    statusFilter: 'ALL',
  })
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [bookAnalysisView, setBookAnalysisView] = useState('Top 10')

  useEffect(() => {
    if (isInitialLoad) {
      loadData(true)
      setIsInitialLoad(false)
    } else {
      loadData(false)
    }
  }, [filters, statusFilter])

  const loadData = async (forceRefresh = false) => {
    setLoading(true)
    try {
      const requestFilters = {
        ...filters,
        userType,
        userEmail,
        statusFilter: statusFilter === 'ALL' ? undefined : statusFilter,
      }

      const cacheKey = generateCacheKey('order', { ...requestFilters, statusFilter })

      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey + '_data')
        const cachedKPIs = getCachedData(cacheKey + '_kpis')
        const cachedCustomer = getCachedData(cacheKey + '_customer')

        if (cachedData && cachedKPIs && cachedCustomer) {
          setData(cachedData)
          setFilteredData(cachedData)
          setKpis(cachedKPIs)
          setCustomerAnalysis(cachedCustomer)
          setLoading(false)
          return
        }
      }

      const [orders, kpiData, customerData] = await Promise.all([
        getOrderData(requestFilters),
        calculateOrderKPIs({
          ...filters,
          userType,
          userEmail,
        }),
        getCustomerAnalysis({
          ...filters,
          userType,
          userEmail,
        })
      ])

      setData(orders)
      setFilteredData(orders)
      setKpis(kpiData)
      setCustomerAnalysis(customerData)

      setCachedData(cacheKey + '_data', orders)
      setCachedData(cacheKey + '_kpis', kpiData)
      setCachedData(cacheKey + '_customer', customerData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredData(data)
    } else {
      const filtered = data.filter(row =>
        row.submission_id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredData(filtered)
    }
  }, [searchQuery, data])

  const handleExport = () => {
    // Export only Order Overview table data (filteredData respects status filter and search)
    const exportData = filteredData.map(row => ({
      'Date': row.time_stamp || '',
      'Order ID': row.submission_id || '',
      'Customer Name': row.company_trade_name || '',
      'Invoice Amount': Math.round(parseFloat(row.order_amount) || 0),
      'Books': row.no_of_books || 0,
      'Status': row.status || '',
      'Invoice Link': row.invoice_link || '',
      'Dispatched Date': row.dispatched_date || '',
      'Tracking ID': row.tracking_id || '',
      'No. of Boxes': row.no_of_boxes || '',
      'Logistic Partner': row.logistic_partner || '',
      'Tracking Link': row.tracking_link || '',
      'Delivered Date': row.delivered_date || '',
      'SKU Info': row.sku_info || '',
    }))

    const statusLabel = statusFilter === 'ALL' ? 'all' : statusFilter.toLowerCase().replace(/ /g, '_')
    const filename = `order_overview_${statusLabel}_${new Date().toISOString().split('T')[0]}.xlsx`
    exportToExcel(exportData, filename)
  }

  const handleExportCustomer = () => {
    const exportData = customerAnalysis.map((row, idx) => ({
      'Rank': idx + 1,
      'Customer Name': row.customerName || '',
      'Invoice Amount': Math.round(row.invoiceAmount || 0),
      'Total Books': row.totalBooks || 0,
    }))

    const filename = `customer_analysis_${new Date().toISOString().split('T')[0]}.xlsx`
    exportToExcel(exportData, filename)
  }

  const analyzeBooks = () => {
    const bookCounts = {}

    filteredData
      .filter(o => o.status !== 'Cancelled')
      .forEach(row => {
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

    const bookArray = Object.entries(bookCounts).map(([name, qty]) => ({
      name,
      quantity: qty,
    }))

    bookArray.sort((a, b) => b.quantity - a.quantity)

    const top10 = bookArray.slice(0, 10)
    const low10 = bookArray.slice(-10).reverse()

    return { top10, low10 }
  }

  const { top10, low10 } = analyzeBooks()
  const displayBooks = bookAnalysisView === 'Top 10' ? top10 : low10

  const tableColumns = [
    { key: 'time_stamp', label: 'Date', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { key: 'submission_id', label: 'Order ID' },
    { key: 'company_trade_name', label: 'Customer', render: (val) => val && val.length > 20 ? val.substring(0, 20) + '...' : val || '-' },
    { key: 'order_amount', label: 'Amount', render: (val) => val ? formatIndianCurrency(val) : '-' },
    { key: 'no_of_books', label: 'Books' },
    { key: 'status', label: 'Status' },
    { key: 'invoice_link', label: 'Invoice', render: (val) => val ? <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Link</a> : '-' },
    { key: 'dispatched_date', label: 'Dispatched', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { key: 'tracking_id', label: 'Tracking ID' },
    { key: 'no_of_boxes', label: 'Boxes' },
    { key: 'logistic_partner', label: 'Partner' },
    { key: 'tracking_link', label: 'Track', render: (val) => val ? <a href={val} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Link</a> : '-' },
    { key: 'delivered_date', label: 'Delivered', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
  ]

  return (
    <div className="min-h-screen p-4 pb-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Orders</h1>

        <FilterBar filters={filters} onFilterChange={setFilters} showCustomerFilter={true} />

        {/* KPI Section 1: Order Overview */}
        <div className="bg-white rounded-xl p-4 shadow-lg mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Order Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KPIcard
              title="Total Invoice Amount"
              value={formatIndianCurrency(kpis.totalInvoiceAmount)}
              gradient="from-emerald-500 to-emerald-600"
              small={true}
            />
            <KPIcard
              title="Total Books"
              value={kpis.totalBooks}
              gradient="from-orange-500 to-orange-600"
              small={true}
            />
            <KPIcard
              title="Total Order Placed"
              value={kpis.totalOrderPlaced}
              gradient="from-cyan-500 to-cyan-600"
              small={true}
            />
          </div>
        </div>

        {/* KPI Section 2: Order Status Overview */}
        <div className="bg-white rounded-xl p-4 shadow-lg mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Order Status Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KPIcard
              title="Order InProcess"
              value={kpis.orderInProcess}
              gradient="from-amber-500 to-amber-600"
              small={true}
            />
            <KPIcard
              title="ZM Approval Pending"
              value={kpis.zmApprovalPending}
              gradient="from-orange-500 to-orange-600"
              small={true}
            />
            <KPIcard
              title="Order in Transit"
              value={kpis.orderInTransit}
              gradient="from-cyan-500 to-cyan-600"
              small={true}
            />
            <KPIcard
              title="Order Delivered"
              value={kpis.orderDelivered}
              gradient="from-green-500 to-green-600"
              small={true}
            />
            <KPIcard
              title="Order Cancelled"
              value={kpis.orderCancelled}
              gradient="from-red-500 to-red-600"
              small={true}
            />
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="my-4 flex flex-wrap gap-2">
          {['Order In Progress', 'ZM Approval Pending', 'Dispatched', 'Delivered'].map((status) => (
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
              placeholder="🔍 Search by Order ID..."
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

        {/* Order Overview Table */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-gray-800">Order Overview</h2>
            <button
              onClick={handleExport}
              className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              📥 Export
            </button>
          </div>
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

        {/* Book Analysis Section */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
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

        {/* Customer Analysis Table */}
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold text-gray-800">Customer Analysis</h2>
            <button
              onClick={handleExportCustomer}
              className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              📥 Export
            </button>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Books</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customerAnalysis.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-xs text-gray-500">
                      No customer data available
                    </td>
                  </tr>
                ) : (
                  customerAnalysis.map((customer, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs text-gray-900 font-medium">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-800">
                        {customer.customerName}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900 font-semibold">
                        {formatIndianCurrency(customer.invoiceAmount)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900">
                        {customer.totalBooks.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Order

