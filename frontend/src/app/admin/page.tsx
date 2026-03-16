'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Users, Sparkles, ShoppingBag, Coins, Shield,
  Search, Ban, CheckCircle, AlertTriangle,
  TrendingUp, Eye, Loader2, Flag
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AdminStats {
  totalUsers: number;
  totalGenerations: number;
  totalListings: number;
  totalRevenue: number;
  newUsersToday: number;
  generationsToday: number;
  pendingModeration: number;
  activeUsers: number;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  status: 'active' | 'banned' | 'unverified';
  tokenBalance: number;
  totalGenerations: number;
  createdAt: string;
}

interface ModerationItem {
  id: string;
  imageUrl: string;
  prompt: string;
  reason: string;
  reportedBy: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  user: { username: string };
}

export default function AdminPage() {
  const { user }  = useAuth();
  const router    = useRouter();
  const { toast } = useToast();

  const [stats, setStats]           = useState<AdminStats | null>(null);
  const [users, setUsers]           = useState<UserRow[]>([]);
  const [modItems, setModItems]     = useState<ModerationItem[]>([]);
  const [search, setSearch]         = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const [actionId, setActionId]     = useState<string | null>(null);

  // Guard: only admins
  useEffect(() => {
    if (user && (user as any).role !== 'admin') router.push('/dashboard');
  }, [user, router]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, usersRes, modRes] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/users?limit=20'),
          fetch('/api/moderation/queue?status=pending&limit=20'),
        ]);
        if (statsRes.ok) setStats(await statsRes.json());
        if (usersRes.ok) setUsers((await usersRes.json()).items ?? []);
        if (modRes.ok)   setModItems((await modRes.json()).items ?? []);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleBanUser = async (userId: string, currentStatus: string) => {
    setActionId(userId);
    const action = currentStatus === 'banned' ? 'unban' : 'ban';
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: 'POST' });
      if (res.ok) {
        setUsers(prev => prev.map(u =>
          u.id === userId
            ? { ...u, status: action === 'ban' ? 'banned' : 'active' }
            : u
        ));
        toast({ title: `User ${action}ned successfully` });
      }
    } finally {
      setActionId(null);
    }
  };

  const handleModerate = async (itemId: string, decision: 'approved' | 'rejected') => {
    setActionId(itemId);
    try {
      const res = await fetch(`/api/moderation/${itemId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        setModItems(prev => prev.filter(i => i.id !== itemId));
        toast({
          title: decision === 'approved' ? 'Content approved' : 'Content removed',
        });
      }
    } finally {
      setActionId(null);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { label: 'Total Users',       value: stats?.totalUsers ?? 0,       icon: <Users className="w-5 h-5 text-blue-500" />,    sub: `+${stats?.newUsersToday ?? 0} today`,        color: 'text-blue-600'   },
    { label: 'Generations',       value: stats?.totalGenerations ?? 0, icon: <Sparkles className="w-5 h-5 text-purple-500" />, sub: `${stats?.generationsToday ?? 0} today`,     color: 'text-purple-600' },
    { label: 'Active Listings',   value: stats?.totalListings ?? 0,    icon: <ShoppingBag className="w-5 h-5 text-green-500" />, sub: 'On marketplace',                         color: 'text-green-600'  },
    { label: 'Total Revenue',     value: stats?.totalRevenue ?? 0,     icon: <Coins className="w-5 h-5 text-yellow-500" />,  sub: 'Tokens circulated',                          color: 'text-yellow-600' },
    { label: 'Active Users',      value: stats?.activeUsers ?? 0,      icon: <TrendingUp className="w-5 h-5 text-indigo-500" />, sub: 'Last 24 hours',                          color: 'text-indigo-600' },
    { label: 'Mod Queue',         value: stats?.pendingModeration ?? 0, icon: <Flag className="w-5 h-5 text-red-500" />,     sub: 'Pending review',                             color: 'text-red-600'    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-purple-600" />Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Platform overview and management</p>
        </div>
        <Badge variant="outline" className="gap-1 px-3 py-1 text-sm border-purple-300 text-purple-600">
          <Shield className="w-3 h-3" />Admin
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                {s.icon}
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>
                {isLoading ? '—' : s.value.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1">
            <Users className="w-4 h-4" />Users
          </TabsTrigger>
          <TabsTrigger value="moderation" className="gap-1">
            <Flag className="w-4 h-4" />
            Moderation
            {(stats?.pendingModeration ?? 0) > 0 && (
              <Badge className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0 h-5">
                {stats?.pendingModeration}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Users Tab ── */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-1 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-4 text-muted-foreground font-medium">User</th>
                        <th className="p-4 text-muted-foreground font-medium">Status</th>
                        <th className="p-4 text-muted-foreground font-medium">Role</th>
                        <th className="p-4 text-muted-foreground font-medium">Tokens</th>
                        <th className="p-4 text-muted-foreground font-medium">Generations</th>
                        <th className="p-4 text-muted-foreground font-medium">Joined</th>
                        <th className="p-4 text-muted-foreground font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={u.avatarUrl} />
                                <AvatarFallback className="text-xs bg-purple-100 text-purple-600">
                                  {u.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{u.username}</p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className={
                                u.status === 'active'     ? 'border-green-300 text-green-600'  :
                                u.status === 'banned'     ? 'border-red-300 text-red-600'      :
                                                            'border-yellow-300 text-yellow-600'
                              }
                            >
                              {u.status}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={u.role === 'admin' ? 'default' : 'outline'} className="text-xs">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="p-4 font-medium">{u.tokenBalance}</td>
                          <td className="p-4">{u.totalGenerations}</td>
                          <td className="p-4 text-muted-foreground text-xs">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-7 w-7 p-0 ${u.status === 'banned' ? 'text-green-500 hover:text-green-600' : 'text-red-500 hover:text-red-600'}`}
                                disabled={actionId === u.id || u.role === 'admin'}
                                onClick={() => handleBanUser(u.id, u.status)}
                              >
                                {actionId === u.id
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : u.status === 'banned'
                                    ? <CheckCircle className="w-4 h-4" />
                                    : <Ban className="w-4 h-4" />
                                }
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Moderation Tab ── */}
        <TabsContent value="moderation" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[3/4]" />
              ))}
            </div>
          ) : modItems.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <p className="font-medium">Moderation queue is clear</p>
              <p className="text-sm text-muted-foreground">No flagged content to review</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modItems.map(item => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="relative aspect-square bg-muted">
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover"
                    />
                    <Badge className="absolute top-2 left-2 bg-red-500 text-xs gap-1">
                      <AlertTriangle className="w-3 h-3" />Flagged
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium line-clamp-2">{item.prompt}</p>
                      <p className="text-xs text-muted-foreground mt-1">by @{item.user.username}</p>
                    </div>
                    <div className="p-2 rounded bg-red-50 dark:bg-red-950/20">
                      <p className="text-xs text-red-600 font-medium">Reported for:</p>
                      <p className="text-xs text-red-500 mt-0.5">{item.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 border-green-300 text-green-600 hover:bg-green-50"
                        disabled={actionId === item.id}
                        onClick={() => handleModerate(item.id, 'approved')}
                      >
                        {actionId === item.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <><CheckCircle className="w-3 h-3" />Approve</>
                        }
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 gap-1 bg-red-500 hover:bg-red-600"
                        disabled={actionId === item.id}
                        onClick={() => handleModerate(item.id, 'rejected')}
                      >
                        {actionId === item.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <><Ban className="w-3 h-3" />Remove</>
                        }
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
