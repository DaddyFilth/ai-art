'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Coins, Search, Gavel, ShoppingBag, Loader2, Filter } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/components/ui/use-toast';

interface Listing {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  price: number;
  type: 'fixed' | 'auction';
  highestBid?: number;
  auctionEndsAt?: string;
  seller: { username: string; avatarUrl?: string };
}

const STYLES = ['All', 'Photorealistic', 'Anime', 'Oil Painting', 'Watercolor', 'Pixel Art', 'Surrealist', 'Abstract', 'Sketch'];

export default function MarketplacePage() {
  const { toast } = useToast();
  const [listings, setListings]     = useState<Listing[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [search, setSearch]         = useState('');
  const [styleFilter, setStyleFilter] = useState('All');
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [buyingId, setBuyingId]     = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          search,
          style: styleFilter === 'All' ? '' : styleFilter,
          minPrice: String(priceRange[0]),
          maxPrice: String(priceRange[1]),
        });
        const res = await fetch(`/api/marketplace/listings?${params}`);
        if (res.ok) setListings((await res.json()).items ?? []);
      } finally {
        setIsLoading(false);
      }
    };
    const timeout = setTimeout(fetchListings, 300);
    return () => clearTimeout(timeout);
  }, [search, styleFilter, priceRange]);

  const handleBuy = async (listing: Listing) => {
    setBuyingId(listing.id);
    try {
      const res = await fetch(`/api/marketplace/listings/${listing.id}/buy`, { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Purchase successful!', description: `You now own "${listing.prompt.slice(0, 40)}..."` });
        setListings(prev => prev.filter(l => l.id !== listing.id));
      } else {
        const err = await res.json();
        toast({ title: 'Purchase failed', description: err.message, variant: 'destructive' });
      }
    } finally {
      setBuyingId(null);
    }
  };

  const handleBid = async (listing: Listing) => {
    setBuyingId(listing.id);
    try {
      const bidAmount = (listing.highestBid ?? listing.price) + 1;
      const res = await fetch(`/api/marketplace/listings/${listing.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: bidAmount }),
      });
      if (res.ok) {
        toast({ title: 'Bid placed!', description: `You bid ${bidAmount} tokens` });
        setListings(prev => prev.map(l => l.id === listing.id ? { ...l, highestBid: bidAmount } : l));
      } else {
        toast({ title: 'Bid failed', variant: 'destructive' });
      }
    } finally {
      setBuyingId(null);
    }
  };

  const filtered = listings.filter(l =>
    l.prompt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground">Discover and collect unique AI artworks</p>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artworks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />Filters
        </Button>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Style</p>
              <div className="flex flex-wrap gap-2">
                {STYLES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStyleFilter(s)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all
                      ${styleFilter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">
                Price: <span className="font-bold">{priceRange[0]}–{priceRange[1]}</span> tokens
              </p>
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                min={0} max={500} step={5}
                className="max-w-sm"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Listings Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="fixed" className="gap-1">
            <ShoppingBag className="w-3 h-3" />Buy Now
          </TabsTrigger>
          <TabsTrigger value="auction" className="gap-1">
            <Gavel className="w-3 h-3" />Auctions
          </TabsTrigger>
        </TabsList>

        {(['all', 'fixed', 'auction'] as const).map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[3/4]" />
                ))}
              </div>
            ) : filtered.filter(l => tab === 'all' || l.type === tab).length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No listings found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered
                  .filter(l => tab === 'all' || l.type === tab)
                  .map(l => (
                    <Card key={l.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                      <div className="relative aspect-square bg-muted overflow-hidden">
                        <Image
                          src={l.imageUrl}
                          alt={l.prompt}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                        <Badge
                          className={`absolute top-2 left-2 text-xs ${
                            l.type === 'auction' ? 'bg-orange-500' : 'bg-blue-600'
                          }`}
                        >
                          {l.type === 'auction' ? <><Gavel className="w-3 h-3 mr-1" />Auction</> : <><ShoppingBag className="w-3 h-3 mr-1" />Buy Now</>}
                        </Badge>
                      </div>
                      <CardContent className="p-3 space-y-3">
                        <div>
                          <p className="text-sm font-medium line-clamp-2 leading-tight">{l.prompt}</p>
                          <p className="text-xs text-muted-foreground mt-1">by @{l.seller.username}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            <span className="font-bold">
                              {l.type === 'auction' ? (l.highestBid ?? l.price) : l.price}
                            </span>
                            {l.type === 'auction' && (
                              <span className="text-xs text-muted-foreground">top bid</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className={`w-full gap-1 ${
                            l.type === 'auction'
                              ? 'bg-orange-500 hover:bg-orange-600'
                              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                          }`}
                          disabled={buyingId === l.id}
                          onClick={() => l.type === 'fixed' ? handleBuy(l) : handleBid(l)}
                        >
                          {buyingId === l.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : l.type === 'fixed'
                              ? <><ShoppingBag className="w-3 h-3" />Buy</>
                              : <><Gavel className="w-3 h-3" />Place Bid</>
                          }
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
