import React, { useState, useEffect } from 'react';
import './index.css';

// Mock Data
const MENU_ITEMS = [
  { id: 1, name: 'The Classic Lox', category: 'bagels', price: '$12.50', desc: 'Smoked salmon, cream cheese, capers, red onion on an everything bagel.', img: 'https://images.unsplash.com/photo-1634568686616-2cbda58c0c80?q=80&w=600&auto=format&fit=crop' },
  { id: 2, name: 'BEC', category: 'bagels', price: '$8.00', desc: 'Bacon, egg, and cheddar cheese on a plain bagel.', img: 'https://images.unsplash.com/photo-1598380894050-621e25e9ee98?q=80&w=600&auto=format&fit=crop' },
  { id: 3, name: 'Iced Oat Latte', category: 'coffee', price: '$5.50', desc: 'Double espresso over ice with creamy oat milk.', img: 'https://images.unsplash.com/photo-1461023058943-0708e52235eb?q=80&w=600&auto=format&fit=crop' },
  { id: 4, name: 'Sunbeam Drip', category: 'coffee', price: '$3.50', desc: 'Our signature house blend, roasted locally.', img: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?q=80&w=600&auto=format&fit=crop' },
  { id: 5, name: 'Turkey Club', category: 'lunch', price: '$14.00', desc: 'Roasted turkey, bacon, lettuce, tomato, and mayo on toasted sourdough.', img: 'https://images.unsplash.com/photo-1627308595229-7830f5c92f31?q=80&w=600&auto=format&fit=crop' },
  { id: 6, name: 'Vegan Delight', category: 'lunch', price: '$11.00', desc: 'Hummus, roasted peppers, cucumber, and spring mix on a whole wheat bagel.', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop' },
];

const GALLERY_IMAGES = [
  { id: 1, url: 'https://images.unsplash.com/photo-1558227691-41ea77d1f85f?q=80&w=800&auto=format&fit=crop', caption: 'Fresh Baked Daily' },
  { id: 2, url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop', caption: 'Pour Over Magic' },
  { id: 3, url: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?q=80&w=800&auto=format&fit=crop', caption: 'Lunch Break Vibes' },
  { id: 4, url: 'https://images.unsplash.com/photo-1522851509172-e5b0b2b80053?q=80&w=800&auto=format&fit=crop', caption: 'The Perfect Spread' },
];

function Hero() {
  const [videoLoaded, setVideoLoaded] = useState(false);

  return (
    <section className="hero">
      {/* Fallback Animated Gradient Background */}
      <div className="hero-bg-gradient"></div>
      
      {/* Video Background (loads lazily or if connection is fast enough) */}
      <video 
        className="hero-video" 
        autoPlay 
        loop 
        muted 
        playsInline
        onLoadedData={() => setVideoLoaded(true)}
        style={{ opacity: videoLoaded ? 0.6 : 0 }}
      >
        <source src="https://cdn.prod.website-files.com/6a0b23e95c87a2a35ab59d39%2F6a18b589cbf740622ca99d9a_Sunbeamcomp_mp4.mp4" type="video/mp4" />
      </video>

      <div className="hero-content">
        <h1>Coffee. <br/><span className="gradient-text">Breakfast.</span> <br/>Lunch.</h1>
        <p style={{ fontSize: '1.2rem', margin: '1rem 0 2rem' }}>Start Your Day Right in Bryan, Tx</p>
        <a href="#menu" className="gradient-btn">Explore Menu</a>
      </div>
    </section>
  );
}

function Menu() {
  const [filter, setFilter] = useState('all');

  const filteredMenu = filter === 'all' 
    ? MENU_ITEMS 
    : MENU_ITEMS.filter(item => item.category === filter);

  return (
    <section id="menu" className="section menu-section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>Our <span className="gradient-text">Menu</span></h2>
        
        <div className="menu-filters">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'bagels' ? 'active' : ''}`} onClick={() => setFilter('bagels')}>Bagels</button>
          <button className={`filter-btn ${filter === 'coffee' ? 'active' : ''}`} onClick={() => setFilter('coffee')}>Coffee</button>
          <button className={`filter-btn ${filter === 'lunch' ? 'active' : ''}`} onClick={() => setFilter('lunch')}>Lunch</button>
        </div>

        <div className="menu-grid">
          {filteredMenu.map(item => (
            <div key={item.id} className="menu-item">
              <img src={item.img} alt={item.name} className="menu-item-img" loading="lazy" />
              <div className="menu-item-content">
                <div className="menu-item-header">
                  <h3>{item.name}</h3>
                  <span className="menu-item-price">{item.price}</span>
                </div>
                <p style={{ color: '#666' }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const [lightboxImg, setLightboxImg] = useState(null);

  // Close lightbox on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxImg(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <section className="section gallery-section">
      <div className="container">
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>More Than a Morning Spot</h2>
        
        <div className="gallery-grid">
          {GALLERY_IMAGES.map(img => (
            <div key={img.id} className="gallery-item" onClick={() => setLightboxImg(img)}>
              <img src={img.url} alt={img.caption} loading="lazy" />
              <div className="gallery-overlay">
                <span>{img.caption}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div className="lightbox" onClick={() => setLightboxImg(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxImg(null)}>×</button>
            <img src={lightboxImg.url} alt={lightboxImg.caption} />
          </div>
        </div>
      )}
    </section>
  );
}

function App() {
  return (
    <div className="App">
      <Hero />
      <Menu />
      <Gallery />
    </div>
  );
}

export default App;
