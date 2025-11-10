import { useState, useEffect } from 'react'
import { useAuthStore } from '../utils/auth'
import {
  getEmployeesByRM,
  getReportingManagersByZM,
  getAllZonalManagers,
  getAllReportingManagers,
  getAllActiveSalesEmployees,
  getEmployeesByZM,
} from '../services/fetchData'

const FilterBar = ({ filters, onFilterChange }) => {
  const { userType, userEmail } = useAuthStore()
  const [employees, setEmployees] = useState([])
  const [reportingManagers, setReportingManagers] = useState([])
  const [zonalManagers, setZonalManagers] = useState([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const loadFilters = async () => {
      if (userType === 'reporting_manager') {
        const emps = await getEmployeesByRM(userEmail)
        setEmployees(emps)
      } else if (userType === 'zonal_manager') {
        const rms = await getReportingManagersByZM(userEmail)
        setReportingManagers(rms)
        
        if (filters.selectedRM && filters.selectedRM !== 'ALL') {
          const emps = await getEmployeesByRM(filters.selectedRM)
          setEmployees(emps)
        } else {
          setEmployees([])
        }
      } else if (userType === 'program_team') {
        const zms = await getAllZonalManagers()
        setZonalManagers(zms)

        if (filters.selectedZM && filters.selectedZM !== 'ALL') {
          const rms = await getReportingManagersByZM(filters.selectedZM)
          setReportingManagers(rms)

          if (filters.selectedRM && filters.selectedRM !== 'ALL') {
            const emps = await getEmployeesByRM(filters.selectedRM)
            setEmployees(emps)
          } else {
            const emps = await getEmployeesByZM(filters.selectedZM)
            setEmployees(emps)
          }
        } else {
          const allRms = await getAllReportingManagers()
          setReportingManagers(allRms)

          if (filters.selectedRM && filters.selectedRM !== 'ALL') {
            const emps = await getEmployeesByRM(filters.selectedRM)
            setEmployees(emps)
          } else {
            const allEmps = await getAllActiveSalesEmployees()
            setEmployees(allEmps.map(emp => ({ email: emp.email, name: emp.name })))
          }
        }
      }
    }

    loadFilters()
  }, [userType, userEmail, filters.selectedRM, filters.selectedZM])

  const handleZMChange = async (zmEmail) => {
    onFilterChange({ ...filters, selectedZM: zmEmail, selectedRM: 'ALL', selectedEmployee: 'ALL' })

    if (zmEmail === 'ALL') {
      const rms = await getAllReportingManagers()
      setReportingManagers(rms)
      const allEmps = await getAllActiveSalesEmployees()
      setEmployees(allEmps.map(emp => ({ email: emp.email, name: emp.name })))
    } else {
      const rms = await getReportingManagersByZM(zmEmail)
      setReportingManagers(rms)
      const emps = await getEmployeesByZM(zmEmail)
      setEmployees(emps)
    }
  }

  const handleRMChange = async (rmEmail) => {
    const updated = { ...filters, selectedRM: rmEmail, selectedEmployee: 'ALL' }
    onFilterChange(updated)
    if (rmEmail !== 'ALL') {
      const emps = await getEmployeesByRM(rmEmail)
      setEmployees(emps)
    } else {
      if (userType === 'program_team') {
        const currentZM = updated.selectedZM
        if (currentZM && currentZM !== 'ALL') {
          const emps = await getEmployeesByZM(currentZM)
          setEmployees(emps)
        } else {
          const allEmps = await getAllActiveSalesEmployees()
          setEmployees(allEmps.map(emp => ({ email: emp.email, name: emp.name })))
        }
      } else {
        setEmployees([])
      }
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">Filters</span>
        <span className="text-gray-500">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Program Team Filters */}
          {userType === 'program_team' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Zonal Manager
                </label>
                <select
                  value={filters.selectedZM || 'ALL'}
                  onChange={(e) => handleZMChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Zonal Managers</option>
                  {zonalManagers.map((zm) => (
                    <option key={zm.email} value={zm.email}>
                      {zm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reporting Manager
                </label>
                <select
                  value={filters.selectedRM || 'ALL'}
                  onChange={(e) => handleRMChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Reporting Managers</option>
                  {reportingManagers.map((rm) => (
                    <option key={rm.email} value={rm.email}>
                      {rm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={filters.selectedEmployee || 'ALL'}
                  onChange={(e) => onFilterChange({ ...filters, selectedEmployee: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.email} value={emp.email}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Zonal Manager Filters */}
          {userType === 'zonal_manager' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reporting Manager
                </label>
                <select
                  value={filters.selectedRM || 'ALL'}
                  onChange={(e) => handleRMChange(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Reporting Managers</option>
                  {reportingManagers.map((rm) => (
                    <option key={rm.email} value={rm.email}>
                      {rm.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={filters.selectedEmployee || 'ALL'}
                  onChange={(e) => onFilterChange({ ...filters, selectedEmployee: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.email} value={emp.email}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Reporting Manager Filter */}
          {userType === 'reporting_manager' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Employee
              </label>
              <select
                value={filters.selectedEmployee || 'ALL'}
                onChange={(e) => onFilterChange({ ...filters, selectedEmployee: e.target.value })}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.email} value={emp.email}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default FilterBar


