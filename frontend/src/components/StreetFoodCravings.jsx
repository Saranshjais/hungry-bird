"use client";

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STREET_FOODS = [
  {
    name: 'Golgappa',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1601050690597-df0568f70950&w=200&h=200&fit=cover',
    bg: '#fff8ed',
  },
  {
    name: 'Samosa',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1527756928496-b3ffe3f46ceb&w=200&h=200&fit=cover',
    bg: '#fef9ee',
  },
  {
    name: 'Pav Bhaji',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1585937421612-70a008356fbe&w=200&h=200&fit=cover',
    bg: '#fef5ec',
  },
  {
    name: 'Momos',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1569050467447-ce54b3bbc37d&w=200&h=200&fit=cover',
    bg: '#f0fdf4',
  },
  {
    name: 'Biryani',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1563379091339-03b21ab4a4f8&w=200&h=200&fit=cover',
    bg: '#fffbeb',
  },
  {
    name: 'Dosa',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1589301760014-d4a9438fc3f3&w=200&h=200&fit=cover',
    bg: '#fffbeb',
  },
  {
    name: 'Jalebi',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1551024506-0bccd828d307&w=200&h=200&fit=cover',
    bg: '#fff7ed',
  },
  {
    name: 'Kachori',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1555126634-323283e090fa&w=200&h=200&fit=cover',
    bg: '#fef9ee',
  },
  {
    name: 'Chole',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1626132647523-66c4a0ddf577&w=200&h=200&fit=cover',
    bg: '#fef5ec',
  },
  {
    name: 'Vada Pav',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1567188040759-fb8a883dc6d8&w=200&h=200&fit=cover',
    bg: '#fffbeb',
  },
  {
    name: 'Aloo Tikki',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1564671165093-20688ff1fffa&w=200&h=200&fit=cover',
    bg: '#fff8ed',
  },
  {
    name: 'Lassi',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1544145945-f90425340c7e&w=200&h=200&fit=cover',
    bg: '#f0f9ff',
  },
  {
    name: 'Dal Baati',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1574653853027-5382a3d23a15&w=200&h=200&fit=cover',
    bg: '#fef9ee',
  },
  {
    name: 'Kulfi',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1559304822-9eb2813c9240&w=200&h=200&fit=cover',
    bg: '#ecfdf5',
  },
  {
    name: 'Masala Chai',
    img: 'https://wsrv.nl/?url=images.unsplash.com/photo-1571934811356-5cc061b6821f&w=200&h=200&fit=cover',
    bg: '#fef5ec',
  },
];

export default function StreetFoodCravings() {
  const scrollRef = useRef(null);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-10 border-y border-amber-100/60" style={{ background: 'transparent' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header row */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-[22px] sm:text-[26px] font-extrabold text-stone-900 tracking-[-0.02em] leading-tight">
              What's On Your Mind?
            </h2>
            <p className="text-stone-400 text-[13px] mt-0.5 font-normal">
              Tap any street food to explore nearby stalls
            </p>
          </div>

          {/* Arrow buttons (desktop) */}
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="w-9 h-9 rounded-full border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center shadow-sm transition-colors"
            >
              <ChevronLeft size={16} className="text-stone-500" />
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="w-9 h-9 rounded-full border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center shadow-sm transition-colors"
            >
              <ChevronRight size={16} className="text-stone-500" />
            </button>
          </div>
        </div>

        {/* Scrollable food row */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto pb-3"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', gap: '24px', paddingLeft: '4px' }}
        >
          {STREET_FOODS.map((food, i) => (
            <button
              key={i}
              className="flex flex-col items-center flex-shrink-0 group outline-none"
              style={{ width: 100 }}
            >
              {/* Plate circle */}
              <div
                className="rounded-full mb-3 overflow-hidden transition-all duration-200 group-hover:scale-105"
                style={{
                  width: 92,
                  height: 92,
                  background: food.bg,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.11)',
                  border: '4px solid rgba(255,255,255,0.9)',
                  outline: '1.5px solid rgba(234,88,12,0.1)',
                  padding: 4,
                }}
              >
                <img
                  src={food.img}
                  alt={food.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>

              {/* Name */}
              <span
                className="text-center leading-snug group-hover:text-orange-500 transition-colors duration-150"
                style={{ fontSize: 12, fontWeight: 600, color: '#57534e', maxWidth: 96, display: 'block' }}
              >
                {food.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
