import { Link } from 'react-router-dom';
import '../App.css';

const HomePage = () => {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <div className="rocks-glass">
          <div className="glass"></div>
          <div className="ice"></div>
        </div>
        <h1 style={{ marginBottom: 0 }}>Mixology App</h1>
        <div className="rocks-glass">
          <div className="glass"></div>
          <div className="ice"></div>
        </div>
      </div>
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
      <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'flex-end', marginTop: '3rem', flexWrap: 'wrap' }}>
        <div className="martini-glass">
          <div className="glass"></div>
          <div className="glass-left-edge"></div>
          <div className="glass-right-edge"></div>
          <div className="stem"></div>
          <div className="base"></div>
        </div>
        <div className="wine-glass">
          <div className="bowl"></div>
          <div className="stem"></div>
          <div className="base"></div>
        </div>
        <div className="champagne-flute">
          <div className="glass"></div>
          <div className="stem"></div>
          <div className="base"></div>
        </div>
        <div className="collins-glass">
          <div className="glass"></div>
          <div className="ice ice-1"></div>
          <div className="ice ice-2"></div>
          <div className="ice ice-3"></div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

