import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  type: string;
}

interface MapSearchProps {
  onLocationFound: (location: { latitude: number; longitude: number; name: string }) => void;
  placeholder?: string;
  searchType?: 'delivery' | 'member';
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiY2VsdnVzIiwiYSI6ImNtZjVvcm1zejA2dWsyanM5cGdxOTM5NWkifQ.1I0VU-32Ek6bg3sZvpUS0w';

export default function MapSearch({
  onLocationFound,
  placeholder = 'Rechercher une adresse...',
  searchType = 'delivery',
}: MapSearchProps) {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nominatim (OpenStreetMap) search for better African coverage
  const searchLocations = async (query: string) => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8&addressdetails=1&accept-language=fr&countrycodes=bj,ml,sn,ci,tg,bf,ne,gn,cm,ga,cg,cd,mg`
      );

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche');
      }

      const data = await response.json();

      const formattedResults: SearchResult[] = (data || []).map((item: any) => ({
        id: item.place_id?.toString() || item.osm_id?.toString(),
        name: item.address?.road || item.address?.city || item.display_name?.split(',')[0] || 'Lieu',
        address: item.display_name || '',
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type || 'location',
      }));

      setResults(formattedResults);
      setShowResults(true);
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Erreur lors de la recherche. Veuillez réessayer.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchText(value);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchLocations(value);
    }, 500);
  };

  const handleSelectResult = (result: SearchResult) => {
    onLocationFound({
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
    });
    setSearchText('');
    setResults([]);
    setShowResults(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchLocations(searchText);
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={placeholder}
              value={searchText}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-10"
              onFocus={() => searchText && setShowResults(true)}
            />
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && results.length > 0 && (
            <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[300px] overflow-y-auto">
              <div className="divide-y">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left p-3 hover:bg-accent transition-colors flex items-start gap-2"
                  >
                    <MapPin className="w-4 h-4 mt-1 text-orange-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{result.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{result.address}</div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {showResults && results.length === 0 && searchText.length >= 3 && !loading && (
            <Card className="absolute top-full left-0 right-0 mt-2 z-50 p-4">
              <p className="text-sm text-muted-foreground text-center">Aucun résultat trouvé</p>
            </Card>
          )}
        </div>

        <Button
          type="submit"
          variant="outline"
          size="icon"
          disabled={!searchText || loading}
        >
          <Search className="w-4 h-4" />
        </Button>
      </form>

      {error && (
        <Alert className="mt-2 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Click outside to close results */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
