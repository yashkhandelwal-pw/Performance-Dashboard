import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../utils/auth'
import { supabase } from '../hooks/useSupabase'

const Profile = () => {
  const { userEmail, userType, logout } = useAuthStore()
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('emp_record')
        .select('*')
        .eq('email', userEmail)
        .eq('status', 'Active')
        .eq('team', 'Sales')
        .single()

      if (error) throw error
      setUserData(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  const getRoleLabel = () => {
    switch (userType) {
      case 'zonal_manager':
        return 'Zonal Manager'
      case 'reporting_manager':
        return 'Reporting Manager'
      case 'employee':
        return 'Employee'
      default:
        return 'User'
    }
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Profile</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div className="text-center pb-6 border-b border-gray-200">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl text-white">
                {userData?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <h2 className="text-xl font-bold text-gray-800">{userData?.name || 'User'}</h2>
              <p className="text-sm text-gray-600 mt-1">{getRoleLabel()}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p className="text-gray-800">{userEmail}</p>
              </div>

              {userData?.team && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Team</label>
                  <p className="text-gray-800">{userData.team}</p>
                </div>
              )}

              {userData?.reporting_manager && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Reporting Manager
                  </label>
                  <p className="text-gray-800">{userData.reporting_manager}</p>
                  <p className="text-sm text-gray-600">{userData.reporting_manager_email}</p>
                </div>
              )}

              {userData?.zonal_manager && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Zonal Manager
                  </label>
                  <p className="text-gray-800">{userData.zonal_manager}</p>
                  <p className="text-sm text-gray-600">{userData.zonal_manager_email}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  {userData?.status || 'Active'}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors mt-8"
            >
              Logout
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Profile


