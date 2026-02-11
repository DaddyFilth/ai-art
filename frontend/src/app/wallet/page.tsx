'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Wallet, Coins, ArrowDownLeft, ArrowUpRight, Loader2 } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';

interface Balance {
  balance: string;
  totalEarned: string;
  totalSpent: string;
}

export default function WalletPage() {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await api.get('/tokens/balance');
      setBalance(response.data.data);
    } catch (error) {
      toast({
        title: 'Failed to load balance',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDailyLogin = async () => {
    try {
      const response = await api.post('/tokens/daily-login');
      const { awarded, streakDay, isNewDay } = response.data.data;

      if (isNewDay) {
        toast({
          title: 'Daily reward claimed!',
          description: `You received ${awarded} tokens. Streak: ${streakDay} days!`,
        });
        fetchBalance();
      } else {
        toast({
          title: 'Already claimed',
          description: 'Come back tomorrow for your next reward!',
        });
      }
    } catch (error) {
      toast({
        title: 'Failed to claim',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Wallet</h1>
        <p className="text-muted-foreground">Manage your tokens and funds</p>
      </div>

      {/* Balance Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Token Balance</CardTitle>
            <Coins className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(BigInt(balance?.balance || '0'))}</div>
            <p className="text-xs text-muted-foreground">Tokens available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fiat Balance</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(parseFloat(user?.fiatBalance || '0'))}</div>
            <p className="text-xs text-muted-foreground">Available funds</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Earn or spend tokens</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleDailyLogin} variant="outline">
            Claim Daily Reward
          </Button>
          <Button variant="outline">Watch Ad (+10 tokens)</Button>
          <Button>Buy Tokens</Button>
          <Button variant="secondary">Deposit Funds</Button>
        </CardContent>
      </Card>

      {/* Token Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Token Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-green-600" />
                <span>Total Earned</span>
              </div>
              <span className="font-semibold">{formatNumber(BigInt(balance?.totalEarned || '0'))}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
                <span>Total Spent</span>
              </div>
              <span className="font-semibold">{formatNumber(BigInt(balance?.totalSpent || '0'))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Tabs defaultValue="tokens" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tokens">Token History</TabsTrigger>
          <TabsTrigger value="fiat">Fiat History</TabsTrigger>
        </TabsList>
        <TabsContent value="tokens">
          <Card>
            <CardHeader>
              <CardTitle>Token Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Token transaction history will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="fiat">
          <Card>
            <CardHeader>
              <CardTitle>Fiat Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                Fiat transaction history will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
