import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './utils/auth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Order from './pages/Order'
import Sample from './pages/Sample'
import Profile from './pages/Profile'
import BottomNav from './components/BottomNav'

function App() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/order" 
          element={user ? <Order /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/sample" 
          element={user ? <Sample /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/profile" 
          element={user ? <Profile /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
      {user && <BottomNav />}
    </div>
  )
}

export default App


