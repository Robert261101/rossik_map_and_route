import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LoginPage from './Login'
import MainPage from './MainPage'
import HistoryPage from './HistoryPage'
import AdminDashboard from './admin/AdminDashboard'
import TeamList from './admin/TeamList'
import AddUser from './admin/AddUser'
import DeleteUser from './admin/DeleteUser'
import ResetPassword from './admin/ResetPassword'
import AddTruck from './admin/AddTruck'
import DeleteTruck from './admin/DeleteTruck'
import AddTeam from './admin/AddTeam'
import TeamView from './admin/TeamView'
import AddTeamMembers from './admin/AddTeamMembers'
import ForgotPasswordPage from './ForgotPassword'
import ResetPasswordPage from './ResetPassword'
import SpotGoPage from './spotGoPage';
import RossikTools from './LandingPage'
import SpotGoTrucks from './spotGoTrucks'
import ConversationsPage from './ConversationsPage'
import ReactDOM from 'react-dom'
import { ThemeProvider } from '../contexts/ThemeContext'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // ReactDOM.render(
  //   <ThemeProvider>
  //     <App />
  //   </ThemeProvider>,
  //   document.getElementById('root')
  // );



  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
        error
      } = await supabase.auth.getSession()

      if (error || !session?.user) {
        setUser(null)
        setLoading(false)
        return
      }

      const userId = session.user.id

      const { data: userDetails, error: userDetailsError } = await supabase
        .from('users')
        .select('role, team_id')
        .eq('id', userId)
        .single()

      if (userDetailsError || !userDetails) {
        console.error('Failed to load user details:', userDetailsError?.message)
        setUser({ ...session.user, role: 'unknown' })
      } else {
        setUser({ ...session.user, role: userDetails.role, team_id: userDetails.team_id })
      }

      setLoading(false)
    }

    fetchUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
        return
      }

      supabase
        .from('users')
        .select('role, team_id')
        .eq('id', session.user.id)
        .single()
        .then(({ data: userDetails }) => {
          setUser({ ...session.user, role: userDetails?.role, team_id: userDetails?.team_id })
        })
    })

    return () => {
      listener && listener.subscription && listener.subscription.unsubscribe()
    }

  }, [])

  if (loading) return <div>Loading...</div>

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route 
          path="/forgot-password" 
          element={!user ? <ForgotPasswordPage /> : <Navigate to="/" />} />
        <Route 
          path="/reset-password"  
          element={<ResetPasswordPage />} />
        <Route 
          path="/" 
          element={user ? <RossikTools user={user} /> : <Navigate to="login" />} />
        <Route
          path="/map-and-guide"
          element={user ? <MainPage user={user} /> : <Navigate to="/login" />} />
        <Route 
          path="/spotgo"
          element={user ? <SpotGoPage user={user} /> : <Navigate to="/login" />} />
        <Route 
          path="/spotgotrucks"
          element={user ? <SpotGoTrucks user={user} /> : <Navigate to="/login" />} />
        <Route
          path="/history"
          element={user ? <HistoryPage user={user} /> : <Navigate to="/login" />} />
        <Route
          path="/admin"
          element={user && user.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/" />} />
        <Route
          path="/admin/teams"
          element={user && (user.role === 'admin' || user.role === 'team_lead') ? <TeamList user={user} /> : <Navigate to="/" />} />
        <Route
          path="/admin/user/add"
          element={user && user.role === 'admin' ? <AddUser user={user} /> : <Navigate to="/" />} />
        <Route
          path="/admin/user/delete"
          element={user && user.role === 'admin' ? <DeleteUser user={user} /> : <Navigate to="/" />} />
        <Route
          path="/admin/user/reset"
          element={user && user.role === 'admin' ? <ResetPassword user={user} /> : <Navigate to="/" />} />
        <Route
          path="/admin/truck/add"
          element={user && user.role === 'admin' ? <AddTruck user={user} /> : <Navigate to="/" />} />
        <Route
          path="/admin/truck/delete"
          element={user && user.role === 'admin' ? <DeleteTruck user={user} /> : <Navigate to="/" />} />
        <Route
          path="/add"
          element={user && user.role === 'admin' ? <AddTeam user={user} /> : <Navigate to="/" />} />
        <Route
          path="/admin/teams/:key"
          element={<TeamView />} />
        <Route
          path="/admin/teams/:key/add-members"
          element={user && (user.role === 'admin' || user.role === 'team_lead') ? <AddTeamMembers user={user} /> : <Navigate to="/" />} />
        <Route
          path="/conversations"
          element={user ? <ConversationsPage user={user} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}
