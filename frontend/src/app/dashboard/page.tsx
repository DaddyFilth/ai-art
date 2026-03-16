'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Coins, Sparkles, ShoppingBag, TrendingUp,
  ImageIcon, Plus, Eye, Tag
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Generation {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  createdAt: string;
  listed: boolean;
  sold: boolean;
}

interface Stats {
  totalGenerations: number;
  totalSales: number;
  totalEarnings: number;
  tokenBalance: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]           = useState<Stats | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading]   = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, gensRes] = await Promise.all([
          fetch('/api/users/me/stats'),
          fetch('/api/ai/generations?limit=12'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (gensRes.ok)  setGenerations((await gensRes.json()).items ?? []);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const statCards = [
    {
      label: 'Token Balance',
      value: stats?.tokenBalance ?? 0,
      icon: <Coins className="w-5 h-5 text-yellow-500" />,
      sub: 'Available to spend',
      color: 'text-yellow-600',
    },
    {
      label: 'Generations',
      value: stats?.totalGenerations ?? 0,
      icon: <Sparkles className="w-5 h-5 text-purple-500" />,
      sub: 'Total artworks created',
      color: 'text-purple-600',
    },
    {
      label: 'Sales',
      value: stats?.totalSales ?? 0,
      icon: <ShoppingBag className="w-5 h-5 text-blue-500" />,
      sub: 'Artworks sold',
      color: 'text-blue-600',
    },
    {
      label: 'Earnings',
      value: `${stats?.totalEarnings ?? 0}`,
      icon: <TrendingUp className="w-5 h-5 text-green-500" />,
      sub: 'Total tokens earned',
      color: 'text-green-600',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {(user as any)?.username ?? 'Artist'} 👋
          </h1>
          <p className="text-muted-foreground">Here's what's happening with your art</p>
        </div>
        <Link href="/generate">
          <Button className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Plus className="w-4 h-4" />New Artwork
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                {s.icon}
              </div>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generations Tabs */}
      <Tabs defaultValue="all">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="listed">Listed</TabsTrigger>
            <TabsTrigger value="sold">Sold</TabsTrigger>
          </TabsList>
        </div>

        {(['all', 'listed', 'sold'] as const).map(tab => (
          <TabsContent key={tab} value={tab}>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : generations.filter(g =>
              tab === 'all' ? true : tab === 'listed' ? g.listed : g.sold
            ).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="font-medium">No artworks yet</p>
                <Link href="/generate">
                  <Button variant="outline" className="gap-2">
                    <Sparkles className="w-4 h-4" />Generate your first
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {generations
                  .filter(g => tab === 'all' ? true : tab === 'listed' ? g.listed : g.sold)
                  .map(g => (
                    <div key={g.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted border">
                      <Image src={g.imageUrl} alt={g.prompt} fill className="object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3 space-y-2">
                        <div className="w-full space-y-2">
                          <p className="text-white text-xs line-clamp-2">{g.prompt}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" className="flex-1 h-7 gap-1 text-xs">
                              <Eye className="w-3 h-3" />View
                            </Button>
                            {!g.listed && !g.sold && (
                              <Button size="sm" className="flex-1 h-7 gap-1 text-xs bg-purple-600 hover:bg-purple-700">
                                <Tag className="w-3 h-3" />List
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {g.listed && (
                        <Badge className="absolute top-2 right-2 bg-blue-600 text-xs">Listed</Badge>
                      )}
                      {g.sold && (
                        <Badge className="absolute top-2 right-2 bg-green-600 text-xs">Sold</Badge>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
