'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import {
  Coins, ArrowUpRight, ArrowDownLeft, TrendingUp,
  Sparkles, ShoppingBag, Gift, CreditCard
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category: 'generation' | 'purchase' | 'sale' | 'reward' | 'deposit';
  createdAt: string;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  transactions: Transaction[];
}

const TOKEN_PACKAGES = [
  { id: 'starter', tokens: 50,   price: '$4.99',  label: 'Starter', popular: false },
  { id: 'creator', tokens: 150,  price: '$12.99', label: 'Creator', popular: true  },
  { id: 'pro',     tokens: 350,  price: '$24.99', label: 'Pro',     popular: false },
  { id: 'studio',  tokens: 1000, price: '$59.99', label: 'Studio',  popular: false },
];

const CATEGORY_CONFIG: Record<Transaction['category'], { icon: JSX.Element; color: string }> = {
  generation: { icon: <Sparkles className="w-4 h-4" />,    color: 'text-purple-500' },
  purchase:   { icon: <ShoppingBag className="w-4 h-4" />, color: 'text-blue-500'   },
  sale:       { icon: <TrendingUp className="w-4 h-4" />,  color: 'text-green-500'  },
  reward:     { icon: <Gift className="w-4 h-4" />,        color: 'text-yellow-500' },
  deposit:    { icon: <CreditCard className="w-4 h-4" />,  color: 'text-indigo-500' },
};

export default function WalletPage() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet]       = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await fetch('/api/wallets/me');
        if (res.ok) setWallet(await res.json());
      } finally {
        setIsLoading(false);
      }
    };
    fetchWallet();
  }, []);

  const refreshWallet = async () => {
    const res = await fetch('/api/wallets/me');
    if (res.ok) setWallet(await res.json());
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <PayPalScriptProvider options={{
      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
      currency: 'USD',
    }}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Manage your tokens and transactions</p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-1 bg-gradient-to-br from-purple-600 to-blue-600 text-white">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Coins className="w-4 h-4" />Current Balance
              </div>
              <div className="text-5xl font-bold">
                {isLoading ? '—' : wallet?.balance ?? 0}
              </div>
              <div className="text-white/70 text-sm">tokens available</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-green-500 text-sm">
                <ArrowDownLeft className="w-4 h-4" />Total Earned
              </div>
              <div className="text-3xl font-bold text-green-600">
                {isLoading ? '—' : wallet?.totalEarned ?? 0}
              </div>
              <div className="text-muted-foreground text-xs">from sales & rewards</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-2">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <ArrowUpRight className="w-4 h-4" />Total Spent
              </div>
              <div className="text-3xl font-bold text-red-500">
                {isLoading ? '—' : wallet?.totalSpent ?? 0}
              </div>
              <div className="text-muted-foreground text-xs">on generations & purchases</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="buy">
          <TabsList>
            <TabsTrigger value="buy">Buy Tokens</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>

          {/* Buy Tokens */}
          <TabsContent value="buy" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {TOKEN_PACKAGES.map(pkg => (
                <Card
                  key={pkg.id}
                  className={`relative transition-shadow hover:shadow-lg ${
                    pkg.popular ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-purple-600 text-xs">
                      Most Popular
                    </Badge>
                  )}
                  <CardContent className="p-5 text-center space-y-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{pkg.label}</p>
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <Coins className="w-5 h-5 text-yellow-500" />
                        <span className="text-3xl font-bold">{pkg.tokens}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">tokens</p>
                    </div>
                    <div className="text-2xl font-bold">{pkg.price}</div>
                    <PayPalButtons
                      style={{ layout: 'vertical', shape: 'rect', label: 'pay', height: 35 }}
                      createOrder={async () => {
                        const res = await fetch('/api/payments/create-order', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ packageId: pkg.id }),
                        });
                        const data = await res.json();
                        return data.orderId;
                      }}
                      onApprove={async (data) => {
                        const res = await fetch(`/api/payments/capture-order/${data.orderID}`, {
                          method: 'POST',
                        });
                        if (res.ok) {
                          const result = await res.json();
                          toast({
                            title: '🎉 Tokens added!',
                            description: `${result.tokens} tokens added to your wallet.`,
                          });
                          await refreshWallet();
                        } else {
                          toast({ title: 'Payment failed', variant: 'destructive' });
                        }
                      }}
                      onError={() => {
                        toast({ title: 'PayPal error', description: 'Please try again.', variant: 'destructive' });
                      }}
                      onCancel={() => {
                        toast({ title: 'Payment cancelled' });
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Earn Free Tokens */}
            <Card className="mt-4 border-dashed">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gift className="w-5 h-5 text-yellow-500" />Earn Free Tokens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-3">
                  {[
                    { label: 'Daily Login',    reward: '+2 tokens',  desc: 'Log in every day'        },
                    { label: 'Refer a Friend', reward: '+25 tokens', desc: 'Share your invite link'  },
                    { label: 'First Sale',     reward: '+10 tokens', desc: 'Sell your first artwork' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                      <Gift className="w-8 h-8 text-yellow-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                        <Badge variant="outline" className="mt-1 text-xs text-green-600 border-green-300">
                          {item.reward}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction History */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-1 p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : !wallet?.transactions?.length ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {wallet.transactions.map(tx => {
                      const config = CATEGORY_CONFIG[tx.category];
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-muted flex items-center justify-center ${config.color}`}>
                              {config.icon}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1 font-bold ${
                            tx.type === 'credit' ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {tx.type === 'credit'
                              ? <ArrowDownLeft className="w-4 h-4" />
                              : <ArrowUpRight className="w-4 h-4" />
                            }
                            {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                            <Coins className="w-3 h-3 text-yellow-500 ml-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PayPalScriptProvider>
  );
}
