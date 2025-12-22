import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import IngredientList from './components/IngredientList';
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

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRecipesRoute = location.pathname === '/recipes';

  return (
    <div className="app">
      <nav style={{ padding: '1rem 2rem', borderBottom: '1px solid #ddd', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h1 style={{ margin: 0, flex: 1 }}>Mixology App</h1>
          <NavLink
            to="/recipes"
            style={({ isActive }) => ({
              padding: '0.5rem 1rem',
              backgroundColor: isActive ? '#007bff' : '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            })}
          >
            Recipes
          </NavLink>
          <NavLink
            to="/ingredients"
            style={({ isActive }) => ({
              padding: '0.5rem 1rem',
              backgroundColor: isActive ? '#007bff' : '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            })}
          >
            Ingredients
          </NavLink>
          <NavLink
            to="/categories"
            style={({ isActive }) => ({
              padding: '0.5rem 1rem',
              backgroundColor: isActive ? '#007bff' : '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
            })}
          >
            Categories
          </NavLink>
          {isRecipesRoute && (
            <button
              onClick={() => navigate('/recipes/new')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              + New Recipe
            </button>
          )}
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
          <Route path="/categories" element={<CategoryList />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
