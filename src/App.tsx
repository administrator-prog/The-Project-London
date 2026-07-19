import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import Home from '@/pages/Home'
import Shop from '@/pages/Shop'
import Product from '@/pages/Product'
import About from '@/pages/About'
import Editorial from '@/pages/Editorial'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="collections" element={<Shop />} />
        <Route path="collections/:slug" element={<Shop />} />
        <Route path="products/:id" element={<Product />} />
        <Route path="editorial" element={<Editorial />} />
        <Route path="editorial/:slug" element={<Editorial />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
