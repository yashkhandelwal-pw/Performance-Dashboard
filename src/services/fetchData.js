import { supabase } from '../hooks/useSupabase'

/**
 * Determine user type based on emp_record
 */
export const getUserType = async (email) => {
  try {
    const { data, error } = await supabase
      .from('emp_record')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      return { type: null, data: null }
    }

    const isProgramTeam = data.team === 'Program Team'
    if (!isProgramTeam && data.status !== 'Active') {
      return { type: null, data: null }
    }

    if (isProgramTeam) {
      return { type: 'program_team', data }
    }

    // Check if user is Zonal Manager
    const { data: zmCheck } = await supabase
      .from('emp_record')
      .select('email')
      .eq('zonal_manager_email', email)
      .eq('status', 'Active')
      .eq('team', 'Sales')
      .limit(1)

    if (zmCheck && zmCheck.length > 0) {
      return { type: 'zonal_manager', data }
    }

    // Check if user is Reporting Manager
    const { data: rmCheck } = await supabase
      .from('emp_record')
      .select('email')
      .eq('reporting_manager_email', email)
      .eq('status', 'Active')
      .eq('team', 'Sales')
      .limit(1)

    if (rmCheck && rmCheck.length > 0) {
      return { type: 'reporting_manager', data }
    }

    return { type: 'employee', data }
  } catch (error) {
    console.error('Error getting user type:', error)
    return { type: null, data: null }
  }
}

/**
 * Get employees under a reporting manager
 */
export const getEmployeesByRM = async (rmEmail) => {
  try {
    const { data, error } = await supabase
      .from('emp_record')
      .select('email, name')
      .eq('reporting_manager_email', rmEmail)
      .eq('status', 'Active')
      .eq('team', 'Sales')

    if (error) throw error

    // Include the RM themselves
    const { data: rmData } = await supabase
      .from('emp_record')
      .select('email, name')
      .eq('email', rmEmail)
      .eq('status', 'Active')
      .eq('team', 'Sales')
      .single()

    const employees = data || []
    if (rmData) {
      employees.push(rmData)
    }

    return uniqueByEmail(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return []
  }
}

/**
 * Get reporting managers under a zonal manager
 * Only returns those who actually have employees reporting to them
 */
export const getReportingManagersByZM = async (zmEmail) => {
  try {
    const { data, error } = await supabase
      .from('emp_record')
      .select('reporting_manager, reporting_manager_email')
      .eq('zonal_manager_email', zmEmail)
      .eq('status', 'Active')
      .eq('team', 'Sales')
      .not('reporting_manager_email', 'is', null)

    if (error) throw error

    const formatted = (data || [])
      .filter(item => item.reporting_manager_email)
      .map(item => ({
        email: item.reporting_manager_email,
        name: item.reporting_manager,
      }))

    return uniqueByEmail(formatted)
  } catch (error) {
    console.error('Error fetching reporting managers:', error)
    return []
  }
}

const uniqueByEmail = (list = []) => {
  const map = new Map()
  list.forEach((item) => {
    if (item?.email && !map.has(item.email)) {
      map.set(item.email, item)
    }
  })
  return Array.from(map.values())
}

export const getAllActiveSalesEmployees = async () => {
  try {
    const { data, error } = await supabase
      .from('emp_record')
      .select('email, name, reporting_manager, reporting_manager_email, zonal_manager, zonal_manager_email, status, team')
      .eq('status', 'Active')
      .eq('team', 'Sales')

    if (error) throw error
    return uniqueByEmail(data || [])
  } catch (error) {
    console.error('Error fetching employees:', error)
    return []
  }
}

export const getAllReportingManagers = async () => {
  try {
    const { data, error } = await supabase
      .from('emp_record')
      .select('reporting_manager, reporting_manager_email')
      .eq('status', 'Active')
      .eq('team', 'Sales')
      .not('reporting_manager_email', 'is', null)

    if (error) throw error

    const formatted = (data || [])
      .filter(item => item.reporting_manager_email)
      .map(item => ({
        email: item.reporting_manager_email,
        name: item.reporting_manager,
      }))

    return uniqueByEmail(formatted)
  } catch (error) {
    console.error('Error fetching reporting managers:', error)
    return []
  }
}

export const getAllZonalManagers = async () => {
  try {
    const { data, error } = await supabase
      .from('emp_record')
      .select('zonal_manager, zonal_manager_email')
      .eq('status', 'Active')
      .eq('team', 'Sales')
      .not('zonal_manager_email', 'is', null)

    if (error) throw error

    const formatted = (data || [])
      .filter(item => item.zonal_manager_email)
      .map(item => ({
        email: item.zonal_manager_email,
        name: item.zonal_manager,
      }))

    return uniqueByEmail(formatted)
  } catch (error) {
    console.error('Error fetching zonal managers:', error)
    return []
  }
}

export const getEmployeesByZM = async (zmEmail) => {
  try {
    const { data, error } = await supabase
      .from('emp_record')
      .select('email, name')
      .eq('zonal_manager_email', zmEmail)
      .eq('status', 'Active')
      .eq('team', 'Sales')

    if (error) throw error
    return uniqueByEmail(data || [])
  } catch (error) {
    console.error('Error fetching employees by ZM:', error)
    return []
  }
}

/**
 * Get sample requests based on filters
 */
export const getSampleRequests = async (filters) => {
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
        allowedEmails = [...new Set(allEmails)] // Remove duplicates
      }
    } else if (filters.userType === 'program_team') {
      let employees = await getAllActiveSalesEmployees()

      if (filters.selectedZM && filters.selectedZM !== 'ALL') {
        employees = employees.filter(emp => emp.zonal_manager_email === filters.selectedZM)
      }

      if (filters.selectedRM && filters.selectedRM !== 'ALL') {
        employees = employees.filter(emp => emp.reporting_manager_email === filters.selectedRM)
      }

      if (filters.selectedEmployee && filters.selectedEmployee !== 'ALL') {
        employees = employees.filter(emp => emp.email === filters.selectedEmployee)
      }

      allowedEmails = employees.map(emp => emp.email)
    }

    allowedEmails = [...new Set(allowedEmails)]

    // Verify employees are Active and in Sales team
    if (allowedEmails.length > 0) {
      const { data: validEmployees } = await supabase
        .from('emp_record')
        .select('email')
        .in('email', allowedEmails)
        .eq('status', 'Active')
        .eq('team', 'Sales')

      allowedEmails = validEmployees?.map(e => e.email) || []
    }

    if (allowedEmails.length === 0) {
      return []
    }

    // Now fetch sample requests
    let query = supabase
      .from('sample_request')
      .select('*')
      .in('employee_email', allowedEmails)

    // Apply date filters
    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate)
    }

    // Apply status filter
    if (filters.statusFilter && filters.statusFilter !== 'ALL') {
      if (filters.statusFilter === 'ZM Approval Pending') {
        query = query
          .eq('sample_status', 'Request Received')
          .eq('zm_approval', 'Pending Approval')
      } else if (filters.statusFilter === 'Order Placed') {
        // Show "Request Received" OR "B2B App Uploaded"
        query = query.in('sample_status', ['Request Received', 'B2B App Uploaded'])
      } else if (filters.statusFilter === 'Dispatched') {
        query = query.eq('sample_status', 'Dispatched with Tracking ID')
      } else if (filters.statusFilter === 'Delivered') {
        query = query.eq('sample_status', 'Delivered')
      } else {
        query = query.eq('sample_status', filters.statusFilter)
      }
    }

    const { data, error } = await query.order('timestamp', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching sample requests:', error)
    return []
  }
}

/**
 * Get quota data from Sample Request Backend 26-27 table
 */
export const getQuotaData = async (filters) => {
  try {
    // First, get employee emails based on hierarchy (same logic as getSampleRequests)
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
      let employees = await getAllActiveSalesEmployees()

      if (filters.selectedZM && filters.selectedZM !== 'ALL') {
        employees = employees.filter(emp => emp.zonal_manager_email === filters.selectedZM)
      }

      if (filters.selectedRM && filters.selectedRM !== 'ALL') {
        employees = employees.filter(emp => emp.reporting_manager_email === filters.selectedRM)
      }

      if (filters.selectedEmployee && filters.selectedEmployee !== 'ALL') {
        employees = employees.filter(emp => emp.email === filters.selectedEmployee)
      }

      allowedEmails = employees.map(emp => emp.email)
    }

    allowedEmails = [...new Set(allowedEmails)]

    if (allowedEmails.length === 0) {
      return {
        samplingQuota: 0,
        quotaUsed: 0,
        remainingQuota: 0,
        quotaUsedPercentage: 0,
      }
    }

    // Fetch quota data from Sample Request Backend 26-27 table
    const { data, error } = await supabase
      .from('Sample Request Backend 26-27')
      .select('Max_Quota, Quota_Used')
      .in('Employee_Email_ID', allowedEmails)

    if (error) throw error

    const quotaData = data || []
    
    const samplingQuota = quotaData.reduce((sum, r) => sum + (parseFloat(r.Max_Quota) || 0), 0)
    const quotaUsed = quotaData.reduce((sum, r) => sum + (parseFloat(r.Quota_Used) || 0), 0)
    const remainingQuota = samplingQuota - quotaUsed
    const quotaUsedPercentage = samplingQuota > 0 ? (quotaUsed / samplingQuota) * 100 : 0

    return {
      samplingQuota,
      quotaUsed,
      remainingQuota,
      quotaUsedPercentage: Math.round(quotaUsedPercentage * 100) / 100, // Round to 2 decimal places
    }
  } catch (error) {
    console.error('Error fetching quota data:', error)
    return {
      samplingQuota: 0,
      quotaUsed: 0,
      remainingQuota: 0,
      quotaUsedPercentage: 0,
    }
  }
}

/**
 * Calculate KPI metrics
 */
export const calculateKPIs = async (filters, useCache = false) => {
  const requests = await getSampleRequests(filters)

  const kpis = {
    sampleOrderPlaced: requests.length,
    totalRequestBooks: requests.reduce((sum, r) => sum + (parseInt(r.total_books) || 0), 0),
    orderReceived: requests.filter(r => r.sample_status === 'Request Received').length,
    zmApprovalPending: requests.filter(
      r => r.sample_status === 'Request Received' && r.zm_approval === 'Pending Approval'
    ).length,
    dispatched: requests.filter(r => r.sample_status === 'Dispatched with Tracking ID').length,
    delivered: requests.filter(r => r.sample_status === 'Delivered').length,
  }

  return kpis
}

