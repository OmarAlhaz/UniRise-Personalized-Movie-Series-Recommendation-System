import { useEffect } from 'react'
import Home from './pages/Home/Home'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Login from './pages/Login/Login'
import Player from './pages/Player/Player'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { ToastContainer } from 'react-toastify';
import SearchPage from './pages/SearchPage/SearchPage'
import HistoryPage from './pages/HistoryPage/HistoryPage'
import NotFoundPage from './pages/NotFoundPage/NotFoundPage'

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Set up the auth state listener.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If logged in, only redirect to home if currently on the login page.
        if (location.pathname === '/login') {
          console.log("Logged in, redirecting to home");
          navigate('/');
        }
      } else {
        // If not logged in, and not already on the login page, redirect there.
        if (location.pathname !== '/login') {
          console.log("Logged out, redirecting to login");
          navigate('/login');
        }
      }
    });
    return unsubscribe; // Clean up the listener on unmount.
  }, [navigate, location]);

  return (
    <div>
      <ToastContainer theme='dark'/>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/player/:id' element={<Player />} />
        <Route path='/search/' element={<SearchPage />} />
        <Route path='/history/' element={<HistoryPage />} />
        <Route path='/*' element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App;
