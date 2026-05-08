import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import IngredientList from './components/IngredientList';
import IngredientDetail from './components/IngredientDetail';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import CategoryList from './components/CategoryList';
import HomePage from './components/HomePage';
import MenuList from './components/menus/MenuList';
import MenuForm from './components/menus/MenuForm';
import MenuDetail from './components/menus/MenuDetail';
import PublicMenu from './components/menus/PublicMenu';
import OrdersPage from './components/orders/OrdersPage';
import { fetchOrders } from './services/cocktailsApi';
import './App.css';

const RecipeDetailWrapper = () => <RecipeDetail />;
const RecipeFormWrapper = () => <RecipeForm />;
const IngredientDetailWrapper = () => <IngredientDetail />;

function App() {
  const [hasPendingOrders, setHasPendingOrders] = useState(false);

  useEffect(() => {
    fetchOrders({ today: true, fulfilled: false })
      .then(orders => setHasPendingOrders(orders.length > 0))
      .catch(() => {});
  }, []);

  return (
    <Routes>
      {/* Public share route — no nav */}
      <Route path="/share/:shareToken" element={<PublicMenu />} />

      {/* Main app */}
      <Route
        path="*"
        element={
          <div className="app">
            <nav className="app-nav">
              <Link to="/" className="nav-wordmark">The Bar Cart</Link>
              {hasPendingOrders && (
                <NavLink to="/orders" className={({ isActive }) => `nav-orders${isActive ? ' active' : ''}`}>Orders</NavLink>
              )}
              <div className="nav-links">
                <NavLink to="/recipes" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Recipes</NavLink>
                <NavLink to="/ingredients" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Ingredients</NavLink>
                <NavLink to="/categories" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Categories</NavLink>
                <NavLink to="/menus" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Menus</NavLink>
                <Link to="/recipes/new" className="nav-action">+ New Recipe</Link>
              </div>
            </nav>

            <main>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/recipes" element={<RecipeList />} />
                <Route path="/recipes/new" element={<RecipeFormWrapper />} />
                <Route path="/recipes/:id" element={<RecipeDetailWrapper />} />
                <Route path="/recipes/:id/edit" element={<RecipeFormWrapper />} />
                <Route path="/ingredients" element={<IngredientList />} />
                <Route path="/ingredients/:id" element={<IngredientDetailWrapper />} />
                <Route path="/categories" element={<CategoryList />} />
                <Route path="/menus" element={<MenuList />} />
                <Route path="/menus/new" element={<MenuForm />} />
                <Route path="/menus/:id" element={<MenuDetail />} />
                <Route path="/orders" element={<OrdersPage />} />
              </Routes>
            </main>

            <nav className="bottom-nav">
              <NavLink to="/recipes" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>Recipes</NavLink>
              <NavLink to="/ingredients" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>Ingred.</NavLink>
              <NavLink to="/categories" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>Categs.</NavLink>
              <NavLink to="/menus" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>Menus</NavLink>
              {hasPendingOrders && (
                <NavLink to="/orders" className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}>Orders</NavLink>
              )}
              <Link to="/recipes/new" className="bottom-nav-item bottom-nav-new">+ New</Link>
            </nav>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
