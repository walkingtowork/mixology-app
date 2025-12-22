import { useState } from 'react';
import IngredientList from './components/IngredientList';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import CategoryList from './components/CategoryList';
import type { Recipe } from './types/cocktails';
import './App.css';

type View = 'recipes' | 'ingredients' | 'categories' | 'recipe-detail' | 'recipe-form' | 'recipe-edit';

function App() {
  const [currentView, setCurrentView] = useState<View>('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);

  const handleRecipeSelect = (recipeId: number) => {
    setSelectedRecipeId(recipeId);
    setCurrentView('recipe-detail');
  };

  const handleCreateRecipe = () => {
    setSelectedRecipeId(null);
    setCurrentView('recipe-form');
  };

  const handleEditRecipe = () => {
    setCurrentView('recipe-edit');
  };

  const handleRecipeSaved = (recipe: Recipe) => {
    setSelectedRecipeId(recipe.id);
    setCurrentView('recipe-detail');
  };

  const handleBackToRecipes = () => {
    setSelectedRecipeId(null);
    setCurrentView('recipes');
  };

  const handleCancelForm = () => {
    if (selectedRecipeId) {
      setCurrentView('recipe-detail');
    } else {
      setCurrentView('recipes');
    }
  };

  return (
    <div className="app">
      <nav style={{ padding: '1rem 2rem', borderBottom: '1px solid #ddd', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h1 style={{ margin: 0, flex: 1 }}>Mixology App</h1>
          <button
            onClick={() => setCurrentView('recipes')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'recipes' ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Recipes
          </button>
          <button
            onClick={() => setCurrentView('ingredients')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'ingredients' ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Ingredients
          </button>
          <button
            onClick={() => setCurrentView('categories')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentView === 'categories' ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Categories
          </button>
          {currentView === 'recipes' && (
            <button
              onClick={handleCreateRecipe}
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
        {currentView === 'recipes' && (
          <RecipeList onRecipeSelect={handleRecipeSelect} />
        )}
        {currentView === 'ingredients' && <IngredientList />}
        {currentView === 'categories' && <CategoryList />}
        {currentView === 'recipe-detail' && selectedRecipeId && (
          <RecipeDetail
            recipeId={selectedRecipeId}
            onEdit={handleEditRecipe}
            onBack={handleBackToRecipes}
          />
        )}
        {currentView === 'recipe-form' && (
          <RecipeForm onSave={handleRecipeSaved} onCancel={handleCancelForm} />
        )}
        {currentView === 'recipe-edit' && selectedRecipeId && (
          <RecipeForm
            recipeId={selectedRecipeId}
            onSave={handleRecipeSaved}
            onCancel={handleCancelForm}
          />
        )}
      </main>
    </div>
  );
}

export default App;
