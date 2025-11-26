import { supabase } from '../hooks/useSupabase'
import {
  getEmployeesByRM,
  getReportingManagersByZM,
  getAllActiveSalesEmployees,
  getEmployeesByZM,
} from './fetchData'

/**
 * Get orders based on hierarchy and filters
 */
export const getOrderData = async (filters) => {
  try {
    // First, get employee emails based on hierarchy
    let allowedEmails = []

    if (filters.userType === 'employee') {
      allowedEmails = [filters.userEmail]
    } else if (filters.userType === 'reporting_manager') {
      if (filters.selectedEmployee && filters.selectedEmployee !== 'ALL') {
        allowedEmails = [filters.selectedEmployee]
      } else {
        const employees = await getEmployeesByRM(filters.userEmail)
        allowedEmails = employees.map(e => e.email)
      }
    } else if (filters.userType === 'zonal_manager') {
      if (filters.selectedRM && filters.selectedRM !== 'ALL') {
        const employees = await getEmployeesByRM(filters.selectedRM)
        allowedEmails = employees.map(e => e.email)

        if (filters.selectedEmployee && filters.selectedEmployee !== 'ALL') {
          allowedEmails = [filters.selectedEmployee]
        }
      } else if (filters.selectedEmployee && filters.selectedEmployee !== 'ALL') {
        allowedEmails = [filters.selectedEmployee]
      } else {
        // Get all employees under ZM
        const rms = await getReportingManagersByZM(filters.userEmail)
        const allEmails = []
        for (const rm of rms) {
          const employees = await getEmployeesByRM(rm.email)
          allEmails.push(...employees.map(e => e.email))
        }
        allowedEmails = [...new Set(allEmails)]
      }
    } else if (filters.userType === 'program_team') {
      if (filters.selectedRM && filters.selectedRM !== 'ALL') {
        // Use getEmployeesByRM which includes the RM themselves
        const employees = await getEmployeesByRM(filters.selectedRM)
        allowedEmails = employees.map(e => e.email)
        
        if (filters.selectedEmployee && filters.selectedEmployee !== 'ALL') {
          allowedEmails = [filters.selectedEmployee]
        }
      } else {
        let employees = await getAllActiveSalesEmployees()

        if (filters.selectedZM && filters.selectedZM !== 'ALL') {
          employees = employees.filter(emp => emp.zonal_manager_email === filters.selectedZM)
        }

        if (filters.selectedEmployee && filters.selectedEmployee !== 'ALL') {
          employees = employees.filter(emp => emp.email === filters.selectedEmployee)
        }

        allowedEmails = employees.map(emp => emp.email)
      }
    }

    allowedEmails = [...new Set(allowedEmails)]

    // Verify employees are Active and in Sales team with correct line_of_business
    if (allowedEmails.length > 0) {
      const { data: validEmployees } = await supabase
        .from('emp_record')
        .select('email')
        .in('email', allowedEmails)
        .eq('status', 'Active')
        .eq('team', 'Sales')
        .in('line_of_business', ['K8 & Test Prep', 'K8'])

      allowedEmails = validEmployees?.map(e => e.email) || []
    }

    if (allowedEmails.length === 0) {
      return []
    }

    // Now fetch orders
    let query = supabase
      .from('order_form_k8_25_26')
      .select('*')
      .in('employee_email_id', allowedEmails)

    // Apply date filters
    if (filters.startDate) {
      query = query.gte('time_stamp', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('time_stamp', filters.endDate)
    }

    // Apply customer filter
    if (filters.selectedCustomer && filters.selectedCustomer !== 'ALL') {
      query = query.eq('company_trade_name', filters.selectedCustomer)
    }

    // Apply status filter
    if (filters.statusFilter && filters.statusFilter !== 'ALL') {
      if (filters.statusFilter === 'Order In Progress') {
        query = query.eq('status', 'Request Received')
      } else if (filters.statusFilter === 'Yet to be Dispatched') {
        query = query.in('status', ['B2B App Uploaded', 'Invoice Created'])
      } else if (filters.statusFilter === 'ZM Approval Pending') {
        query = query.eq('zm_approval', 'Pending Approval')
      } else if (filters.statusFilter === 'Dispatched') {
        query = query.eq('status', 'Dispatched with Tracking ID')
      } else if (filters.statusFilter === 'Delivered') {
        query = query.eq('status', 'Delivered')
      } else {
        query = query.eq('status', filters.statusFilter)
      }
    }

    const { data, error } = await query.order('time_stamp', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching orders:', error)
    return []
  }
}

/**
 * Calculate Order KPIs
 */
export const calculateOrderKPIs = async (filters) => {
  const orders = await getOrderData(filters)

  // Exclude cancelled orders for Total Invoice Amount, Total Books, and Total Order Placed
  const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled')

  const kpis = {
    totalInvoiceAmount: nonCancelledOrders.reduce((sum, o) => sum + (parseFloat(o.order_amount) || 0), 0),
    totalBooks: nonCancelledOrders.reduce((sum, o) => sum + (parseInt(o.no_of_books) || 0), 0),
    totalOrderPlaced: new Set(nonCancelledOrders.map(o => o.submission_id)).size,
    orderInProcess: orders.filter(o => o.status === 'Request Received').length,
    yetToBeDispatched: orders.filter(o => ['B2B App Uploaded', 'Invoice Created'].includes(o.status)).length,
    zmApprovalPending: orders.filter(o => o.zm_approval === 'Pending Approval').length,
    orderInTransit: orders.filter(o => o.status === 'Dispatched with Tracking ID').length,
    orderDelivered: orders.filter(o => o.status === 'Delivered').length,
    orderCancelled: orders.filter(o => o.status === 'Cancelled').length,
  }

  return kpis
}

/**
 * Get unique customers sorted A-Z
 */
export const getUniqueCustomers = async (filters) => {
  try {
    const orders = await getOrderData({ ...filters, statusFilter: 'ALL' })
    const customerNames = [...new Set(orders.map(o => o.company_trade_name).filter(Boolean))]
    return customerNames.sort((a, b) => a.localeCompare(b)).map(name => ({ name }))
  } catch (error) {
    console.error('Error fetching customers:', error)
    return []
  }
}

/**
 * Get customer-wise analysis (exclude cancelled)
 */
export const getCustomerAnalysis = async (filters) => {
  try {
    const orders = await getOrderData({ ...filters, statusFilter: 'ALL' })
    const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled')

    const customerMap = {}

    nonCancelledOrders.forEach(order => {
      const customer = order.company_trade_name
      if (!customer) return

      if (!customerMap[customer]) {
        customerMap[customer] = {
          customerName: customer,
          invoiceAmount: 0,
          totalBooks: 0,
        }
      }

      customerMap[customer].invoiceAmount += parseFloat(order.order_amount) || 0
      customerMap[customer].totalBooks += parseInt(order.no_of_books) || 0
    })

    const customerArray = Object.values(customerMap)
    customerArray.sort((a, b) => b.invoiceAmount - a.invoiceAmount)

    return customerArray
  } catch (error) {
    console.error('Error analyzing customers:', error)
    return []
  }
}

/**
 * Analyze books by quantity (exclude cancelled)
 */
export const analyzeOrderBooks = async (filters) => {
  try {
    const orders = await getOrderData({ ...filters, statusFilter: 'ALL' })
    const nonCancelledOrders = orders.filter(o => o.status !== 'Cancelled')

    const bookCounts = {}

    nonCancelledOrders.forEach(order => {
      if (order.sku_info) {
        const items = order.sku_info.split(' // ')
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
  } catch (error) {
    console.error('Error analyzing books:', error)
    return { top10: [], low10: [] }
  }
}

/**
 * Get customer-wise invoice amount for chart (exclude cancelled)
 */
export const getCustomerWiseInvoiceAmount = async (filters) => {
  try {
    const customerAnalysis = await getCustomerAnalysis(filters)
    // Return top 10 customers for chart (to avoid clutter)
    return customerAnalysis.slice(0, 10).map(c => ({
      name: c.customerName,
      value: c.invoiceAmount,
    }))
  } catch (error) {
    console.error('Error getting customer invoice data:', error)
    return []
  }
}


