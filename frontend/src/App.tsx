import { Routes, Route, NavLink, Link } from 'react-router-dom';
import IngredientList from './components/IngredientList';
import IngredientDetail from './components/IngredientDetail';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import CategoryList from './components/CategoryList';
import HomePage from './components/HomePage';
import './App.css';

// Wrapper component to extract recipe ID from route params
const RecipeDetailWrapper = () => {
  return <RecipeDetail />;
};

// Wrapper component for RecipeForm to handle both create and edit
const RecipeFormWrapper = () => {
  return <RecipeForm />;
};

// Wrapper component to extract ingredient ID from route params
const IngredientDetailWrapper = () => {
  return <IngredientDetail />;
};

function App() {
  return (
    <div className="app">
      <nav className="app-nav">
        <Link to="/" className="nav-wordmark">Mixology App</Link>
        <div className="nav-links">
          <NavLink to="/recipes" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Recipes
          </NavLink>
          <NavLink to="/ingredients" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Ingredients
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Categories
          </NavLink>
          <Link to="/recipes/new" className="nav-action">+ New Recipe</Link>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recipes" element={<RecipeList />} />
          <Route path="/recipes/:id" element={<RecipeDetailWrapper />} />
          <Route path="/recipes/new" element={<RecipeFormWrapper />} />
          <Route path="/recipes/:id/edit" element={<RecipeFormWrapper />} />
          <Route path="/ingredients" element={<IngredientList />} />
          <Route path="/ingredients/:id" element={<IngredientDetailWrapper />} />
          <Route path="/categories" element={<CategoryList />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
