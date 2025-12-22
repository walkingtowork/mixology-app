import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '1rem' }}>Mixology App</h1>
      <p style={{ fontSize: '1.1rem', marginBottom: '2rem', color: '#666' }}>
        Manage your cocktail recipes, ingredients, and categories all in one place.
        Create, edit, and organize your favorite drinks with ease.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to="/recipes"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
          }}
        >
          View Recipes
        </Link>
        <Link
          to="/ingredients"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
          }}
        >
          View Ingredients
        </Link>
        <Link
          to="/categories"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#6f42c1',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
          }}
        >
          View Categories
        </Link>
      </div>
    </div>
  );
};

export default HomePage;

