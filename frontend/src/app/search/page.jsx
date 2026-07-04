"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Search, Star, UtensilsCrossed } from 'lucide-react';
import { motion } from 'motion/react';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) {
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`${backendUrl}/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, backendUrl]);

  return (
    <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black text-stone-900 mb-2">
          Search Results
        </h1>
        <p className="text-stone-500 font-medium mb-10">
          Showing results for <span className="text-brand-500 font-bold">"{query}"</span>
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-stone-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((vendor, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={vendor.id}
              >
                <Link href={`/city/${vendor.city_slug}`} className="block group">
                  <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300">
                    <div className="h-48 bg-stone-200 relative overflow-hidden">
                      {vendor.image_url ? (
                        <img 
                          src={vendor.image_url} 
                          alt={vendor.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                          <UtensilsCrossed className="w-10 h-10 text-stone-300" />
                        </div>
                      )}
                      
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                        <Star size={12} className="fill-brand-500 text-brand-500" />
                        {vendor.rating ? vendor.rating.toFixed(1) : 'New'}
                      </div>
                      
                      {vendor.is_hidden_gem && (
                        <div className="absolute top-4 right-4 bg-brand-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                          Hidden Gem
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-stone-900 mb-1 group-hover:text-brand-500 transition-colors">
                        {vendor.name}
                      </h3>
                      <div className="flex items-center gap-2 text-stone-500 text-sm mb-4">
                        <MapPin size={14} className="text-brand-500" />
                        <span>{vendor.city_name}</span>
                      </div>
                      <div className="bg-stone-50 text-stone-600 px-3 py-1.5 rounded-xl text-sm font-medium inline-block">
                        {vendor.cuisine_type}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100 shadow-sm">
            <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-stone-900 mb-2">No results found</h3>
            <p className="text-stone-500">We couldn't find anything matching "{query}". Try searching for another city, dish, or stall name.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex justify-center py-40"><div className="w-10 h-10 border-4 border-stone-200 border-t-brand-500 rounded-full animate-spin" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
