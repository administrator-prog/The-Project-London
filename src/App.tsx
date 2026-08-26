import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import Home from '@/pages/Home'
import Shop from '@/pages/Shop'
import Product from '@/pages/Product'
import About from '@/pages/About'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="products/:id" element={<Product />} />
        <Route path="about" element={<About />} />
        {/* Legacy paths from the larger store structure. */}
        <Route path="collections/*" element={<Navigate to="/shop" replace />} />
        <Route path="editorial/*" element={<Navigate to="/shop" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
