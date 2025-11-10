import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../hooks/useSupabase'
import { useAuthStore } from '../utils/auth'
import { getUserType } from '../services/fetchData'

const Login = () => {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [showOtp, setShowOtp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Check if user exists in emp_record
      const { data: userData, error: userError } = await supabase
        .from('emp_record')
        .select('*')
        .eq('email', email)
        .eq('status', 'Active')
        .in('team', ['Sales', 'Program Team'])
        .single()

      if (userError || !userData) {
        setError('User not found or inactive. Please contact administrator.')
        setLoading(false)
        return
      }

      // Send OTP via Supabase
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: undefined,
    },
      })

      if (otpError) {
        setError(otpError.message || 'Failed to send OTP. Please try again.')
      } else {
        setShowOtp(true)
      }
      setLoading(false)
    } catch (err) {
      console.error('Login error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Try to verify OTP
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email',
      })

      if (verifyError || !authData?.user) {
        setError('Invalid or expired OTP. Please try again.')
        setLoading(false)
        return
      }

      const { type } = await getUserType(email)

      if (!type) {
        setError('Unable to determine user type. Please contact administrator.')
        setLoading(false)
        return
      }

      setUser(authData.user, type, email)
      navigate('/dashboard')
    } catch (err) {
      console.error('Verification error:', err)
      setError('Login failed. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Performance Dashboard</h1>
          <p className="text-gray-600">Sign in to continue</p>
        </div>

        <form onSubmit={showOtp ? handleVerifyOtp : handleSendOtp} className="space-y-6">
          {!showOtp ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Check your email for the 6-digit code we sent you.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOtp(false)
                  setOtp('')
                  setError('')
                }}
                className="w-full text-gray-600 hover:text-gray-800 text-sm"
              >
                Change Email
              </button>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default Login


