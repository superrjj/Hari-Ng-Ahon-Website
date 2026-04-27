import { Navigate, Route, Routes } from 'react-router-dom'
import { Hero } from '../components/homepage/hero'
import { RegistrationForm } from '../components/homepage/registration-form'
import { RegistrationInfo } from '../components/homepage/registration-info'
import { RegistrationPayment } from '../components/homepage/registration-payment'
import { Shell } from '../components/Shell'
function HomePagePlaceholder() {
  return <Hero />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Shell><HomePagePlaceholder /></Shell>} />
      <Route path="/register/info" element={<Shell><RegistrationInfo /></Shell>} />
      <Route path="/register/form" element={<Shell><RegistrationForm /></Shell>} />
      <Route path="/register/payment" element={<Shell><RegistrationPayment /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
