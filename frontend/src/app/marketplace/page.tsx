'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Search, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Auction {
  id: string;
  asset: {
    id: string;
    title: string;
    imageUrl: string;
    thumbnailUrl: string;
  };
  startingPrice: string;
  currentPrice: string | null;
  buyNowPrice: string | null;
  endsAt: string;
  bidCount: number;
  _count: {
    bids: number;
  };
}

export default function MarketplacePage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await api.get('/marketplace/auctions');
      setAuctions(response.data.data);
    } catch (error) {
      toast({
        title: 'Failed to load auctions',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAuctions = auctions.filter((auction) =>
    auction.asset.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Discover and collect unique AI artwork</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search artwork..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAuctions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">No auctions found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAuctions.map((auction) => (
            <Link key={auction.id} href={`/marketplace/${auction.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className="aspect-square bg-muted relative">
                  <img
                    src={auction.asset.thumbnailUrl || auction.asset.imageUrl}
                    alt={auction.asset.title}
                    className="w-full h-full object-cover"
                  />
                  {auction.buyNowPrice && (
                    <Badge className="absolute top-2 right-2 bg-green-600">
                      Buy Now
                    </Badge>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg truncate">{auction.asset.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current Bid</span>
                    <span className="font-semibold">
                      {auction.currentPrice
                        ? formatCurrency(parseFloat(auction.currentPrice))
                        : formatCurrency(parseFloat(auction.startingPrice))}
                    </span>
                  </div>
                  {auction.buyNowPrice && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Buy Now</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(parseFloat(auction.buyNowPrice))}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Ends {formatDate(auction.endsAt)}
                    </span>
                    <span className="text-muted-foreground">
                      {auction._count.bids} bids
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
