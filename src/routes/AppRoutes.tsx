import { Navigate, Route, Routes } from 'react-router-dom'
import { Hero } from '../components/homepage/hero'
import { Shell } from '../components/Shell'
function HomePagePlaceholder() {
  return <Hero />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Shell><HomePagePlaceholder /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
