import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Download, Search, Receipt, CreditCard, Building2,
  Plus, Trash2, CheckCircle2, ShieldCheck, Zap, RefreshCw,
  Sparkles, AlertCircle, ArrowUpRight, Lock, Check
} from "lucide-react";
import { useGetPaymentHistory, useGetMe } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface PaymentMethod {
  id: string;
  userId: string;
  cardHolder: string;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  isDefault: boolean;
  createdAt: string;
}

interface PayoutAccount {
  id: string;
  userId: string;
  creatorId: string | null;
  bankName: string;
  accountHolderName: string;
  accountNumberLast4: string;
  routingNumber: string;
  accountType: string;
  currency: string;
  isDefault: boolean;
  createdAt: string;
}

export default function Payments() {
  const { data: payments, isLoading: paymentsLoading } = useGetPaymentHistory();
  const { data: me } = useGetMe();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("transactions");
  const [search, setSearch] = useState("");

  // Payment Methods (Cards) State
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [savingCard, setSavingCard] = useState(false);

  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardZip, setCardZip] = useState("");
  const [cardBrand, setCardBrand] = useState("visa");

  // Payout Account State
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [savingPayout, setSavingPayout] = useState(false);

  const [bankName, setBankName] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountType, setAccountType] = useState("checking");

  async function authFetch(url: string, opts?: RequestInit) {
    const token = await getToken();
    return fetch(url, {
      ...opts,
      credentials: "include",
      headers: {
        ...(opts?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  const loadMethods = async () => {
    try {
      setMethodsLoading(true);
      const r = await authFetch(`${BASE}/api/payments/methods`);
      if (r.ok) {
        const data = await r.json();
        setMethods(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setMethodsLoading(false);
    }
  };

  const loadPayoutAccount = async () => {
    try {
      setPayoutLoading(true);
      const r = await authFetch(`${BASE}/api/payments/payout-account`);
      if (r.ok) {
        const data = await r.json();
        setPayoutAccount(data ?? null);
        if (data) {
          setBankName(data.bankName);
          setAccountHolder(data.accountHolderName);
          setRoutingNumber(data.routingNumber);
          setAccountType(data.accountType || "checking");
        }
      }
    } catch {
      // ignore
    } finally {
      setPayoutLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
    loadPayoutAccount();
  }, []);

  // Card brand detection based on first digit
  useEffect(() => {
    const clean = cardNumber.replace(/\D/g, "");
    if (clean.startsWith("4")) setCardBrand("visa");
    else if (clean.startsWith("5") || clean.startsWith("2")) setCardBrand("mastercard");
    else if (clean.startsWith("3")) setCardBrand("amex");
    else if (clean.startsWith("6")) setCardBrand("discover");
  }, [cardNumber]);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = cardNumber.replace(/\D/g, "");
    if (cleanNumber.length < 13) {
      toast({ title: "Invalid card", description: "Please enter a valid card number.", variant: "destructive" });
      return;
    }

    const expParts = cardExp.split("/");
    const expMonth = expParts[0]?.trim() || "12";
    const expYear = expParts[1]?.trim() || "28";

    setSavingCard(true);
    try {
      const r = await authFetch(`${BASE}/api/payments/methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardHolder: cardHolder.trim() || me?.name || "Cardholder",
          brand: cardBrand,
          last4: cleanNumber.slice(-4),
          expMonth: expMonth.padStart(2, "0"),
          expYear: expYear.length === 2 ? `20${expYear}` : expYear,
          isDefault: methods.length === 0,
        }),
      });

      if (r.ok) {
        toast({ title: "Card added successfully!", description: "Your payment method is now saved and ready for real-time payments." });
        setAddCardOpen(false);
        setCardNumber("");
        setCardExp("");
        setCardCvv("");
        setCardHolder("");
        setCardZip("");
        loadMethods();
      } else {
        const err = await r.json().catch(() => ({}));
        toast({ title: "Failed to save card", description: err.error ?? "Please check the details.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not save card.", variant: "destructive" });
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    try {
      const r = await authFetch(`${BASE}/api/payments/methods/${id}`, { method: "DELETE" });
      if (r.ok) {
        setMethods(prev => prev.filter(m => m.id !== id));
        toast({ title: "Card removed" });
      }
    } catch {
      toast({ title: "Error", description: "Could not remove card.", variant: "destructive" });
    }
  };

  const handleSetDefaultMethod = async (id: string) => {
    try {
      const r = await authFetch(`${BASE}/api/payments/methods/${id}/default`, { method: "PATCH" });
      if (r.ok) {
        setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
        toast({ title: "Default card updated" });
      }
    } catch {
      toast({ title: "Error", description: "Could not set default.", variant: "destructive" });
    }
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountHolder || !accountNumber || !routingNumber) {
      toast({ title: "Incomplete details", description: "Please fill in all bank details.", variant: "destructive" });
      return;
    }

    setSavingPayout(true);
    try {
      const r = await authFetch(`${BASE}/api/payments/payout-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName,
          accountHolderName: accountHolder,
          accountNumber,
          routingNumber,
          accountType,
          currency: "usd",
        }),
      });

      if (r.ok) {
        const saved = await r.json();
        setPayoutAccount(saved);
        toast({ title: "Bank account saved!", description: "Your payout details have been verified for real-time earnings distribution." });
      } else {
        const err = await r.json().catch(() => ({}));
        toast({ title: "Error", description: err.error ?? "Failed to save bank details.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not save payout details.", variant: "destructive" });
    } finally {
      setSavingPayout(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "succeeded":
        return <Badge variant="outline" className="bg-emerald-950/40 text-emerald-400 border-emerald-700/50">Success</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-amber-950/40 text-amber-400 border-amber-700/50">Pending</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-950/40 text-red-400 border-red-700/50">Failed</Badge>;
      case "refunded":
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filtered = payments?.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.creatorName ?? "").toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  }) ?? [];

  function exportCSV() {
    if (!payments || payments.length === 0) return;
    const header = ["ID", "Date", "Description", "Status", "Amount"];
    const rows = payments.map((p) => [
      p.id,
      format(new Date(p.createdAt), "yyyy-MM-dd"),
      `Subscription: ${p.creatorName ?? "CreatorHub"}`,
      p.status,
      `$${p.amount.toFixed(2)}`,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payment-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-5xl mx-auto pb-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Payments & Accounts</h1>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs gap-1">
              <Zap className="h-3 w-3 fill-emerald-400" /> Real-time
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your payment cards, bank payout account, and live transaction records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { queryClient.invalidateQueries(); loadMethods(); loadPayoutAccount(); toast({ title: "Refreshed live data" }); }}
            className="rounded-xl gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          {activeTab === "transactions" && (
            <Button
              variant="outline"
              size="sm"
              className="bg-background rounded-xl gap-1.5"
              onClick={exportCSV}
              disabled={!payments || payments.length === 0}
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 rounded-xl h-11">
          <TabsTrigger value="transactions" className="rounded-lg text-sm gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Receipt className="h-4 w-4" /> Transactions
          </TabsTrigger>
          <TabsTrigger value="cards" className="rounded-lg text-sm gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CreditCard className="h-4 w-4" /> Payment Cards ({methods.length})
          </TabsTrigger>
          <TabsTrigger value="payouts" className="rounded-lg text-sm gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-4 w-4" /> Payout Bank Account
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Transactions ── */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="border-border/60 shadow-sm overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg">Real-Time Transactions</CardTitle>
                  <CardDescription className="text-xs">Live record of all subscription charges and tips</CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search payments..."
                    className="pl-9 bg-background h-9 rounded-xl text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {paymentsLoading ? (
                <div className="p-8 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !payments || payments.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No payment history yet</h3>
                  <p className="text-sm">Your completed transactions will appear here in real time.</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No payments match your search.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent bg-muted/5">
                      <TableHead className="w-[120px]">Reference</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((payment) => (
                      <TableRow key={payment.id} className="border-border/50">
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {payment.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(payment.createdAt), "MMM d, yyyy · HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          Subscription: {payment.creatorName ?? "CreatorHub"}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-right font-bold text-foreground">
                          ${payment.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Payment Cards ── */}
        <TabsContent value="cards" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Saved Payment Cards</h2>
              <p className="text-muted-foreground text-sm">Cards used for seamless one-click subscriptions and tips.</p>
            </div>

            <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
              <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl gap-2">
                  <Plus className="h-4 w-4" /> Add New Card
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-violet-500" /> Add Payment Card
                  </DialogTitle>
                  <DialogDescription>
                    Securely upload your credit or debit card details for real-time transactions.
                  </DialogDescription>
                </DialogHeader>

                {/* Visual Card Preview */}
                <div className="relative h-40 rounded-2xl bg-gradient-to-tr from-violet-900 via-indigo-900 to-slate-900 p-5 text-white shadow-xl flex flex-col justify-between overflow-hidden border border-violet-500/30 my-2">
                  <div className="flex justify-between items-start">
                    <div className="text-xs tracking-widest uppercase font-semibold text-violet-200">
                      CreatorHub Secure Pay
                    </div>
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-white/20">
                      {cardBrand}
                    </span>
                  </div>

                  <div className="font-mono text-lg tracking-wider text-white drop-shadow">
                    {cardNumber ? cardNumber.replace(/(\d{4})/g, '$1 ').trim() : "•••• •••• •••• ••••"}
                  </div>

                  <div className="flex justify-between items-end text-xs">
                    <div>
                      <div className="text-[10px] text-violet-300 uppercase">Cardholder</div>
                      <div className="font-semibold truncate max-w-[160px]">{cardHolder || "YOUR NAME"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-violet-300 uppercase">Expires</div>
                      <div className="font-mono font-semibold">{cardExp || "MM/YY"}</div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleAddCard} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cardholder Name</Label>
                    <Input
                      placeholder="Jane Doe"
                      value={cardHolder}
                      onChange={e => setCardHolder(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Card Number</Label>
                    <Input
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      required
                      className="rounded-xl font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Expiry (MM/YY)</Label>
                      <Input
                        placeholder="12/28"
                        maxLength={5}
                        value={cardExp}
                        onChange={e => setCardExp(e.target.value)}
                        required
                        className="rounded-xl font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CVV</Label>
                      <Input
                        placeholder="123"
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value)}
                        required
                        className="rounded-xl font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Billing ZIP</Label>
                      <Input
                        placeholder="90210"
                        value={cardZip}
                        onChange={e => setCardZip(e.target.value)}
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-3">
                    <Button type="button" variant="outline" onClick={() => setAddCardOpen(false)} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingCard} className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl">
                      {savingCard ? "Saving..." : "Save Card"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Cards Grid */}
          {methodsLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Skeleton className="h-36 rounded-2xl" />
              <Skeleton className="h-36 rounded-2xl" />
            </div>
          ) : methods.length === 0 ? (
            <Card className="border-dashed border-2 border-border p-10 text-center rounded-2xl">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-bold text-foreground">No payment cards uploaded</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-5">
                Add a credit or debit card to enjoy instant, real-time subscription checkout and creator tips.
              </p>
              <Button onClick={() => setAddCardOpen(true)} className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Add Card Now
              </Button>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {methods.map(m => (
                <div
                  key={m.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    m.isDefault
                      ? "bg-violet-500/5 border-violet-500/50 shadow-md shadow-violet-900/10"
                      : "bg-card border-border hover:border-border/80"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-bold text-xs uppercase tracking-wider px-2 py-1 rounded bg-muted text-foreground">
                        {m.brand}
                      </span>
                      {m.isDefault ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                          <Check className="h-3 w-3" /> Default
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefaultMethod(m.id)}
                          className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                        >
                          Set as default
                        </Button>
                      )}
                    </div>

                    <div className="font-mono text-base font-bold text-foreground">
                      •••• •••• •••• {m.last4}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                      <span>{m.cardHolder}</span>
                      <span>Expires {m.expMonth}/{m.expYear}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-border/60 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Added {format(new Date(m.createdAt), "MMM yyyy")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMethod(m.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7 w-7 p-0 rounded-lg"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Payout Bank Account ── */}
        <TabsContent value="payouts" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-border/60 rounded-2xl overflow-hidden shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-violet-500" /> Bank Payout Details
                      </CardTitle>
                      <CardDescription>
                        Direct deposit account for receiving creator revenue and subscriber payouts.
                      </CardDescription>
                    </div>
                    {payoutAccount && (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active for Payouts
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSavePayout} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Bank Name</Label>
                        <Input
                          placeholder="JPMorgan Chase / Bank of America"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          required
                          className="rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Account Holder Full Name</Label>
                        <Input
                          placeholder="John Smith"
                          value={accountHolder}
                          onChange={e => setAccountHolder(e.target.value)}
                          required
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Routing Number / Swift Code</Label>
                        <Input
                          placeholder="021000021"
                          value={routingNumber}
                          onChange={e => setRoutingNumber(e.target.value)}
                          required
                          className="rounded-xl font-mono text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Account Number</Label>
                        <Input
                          placeholder={payoutAccount ? `•••• •••• ${payoutAccount.accountNumberLast4}` : "Enter account number"}
                          value={accountNumber}
                          onChange={e => setAccountNumber(e.target.value)}
                          required={!payoutAccount}
                          className="rounded-xl font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Account Type</Label>
                      <Select value={accountType} onValueChange={setAccountType}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="checking">Checking Account</SelectItem>
                          <SelectItem value="savings">Savings Account</SelectItem>
                          <SelectItem value="business">Business Checking</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        disabled={savingPayout}
                        className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl gap-2"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {savingPayout ? "Saving Details..." : payoutAccount ? "Update Bank Details" : "Save Payout Account"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Payout Information Info card */}
            <div className="space-y-5">
              <Card className="bg-gradient-to-br from-violet-950/40 via-background to-card border border-violet-500/20 rounded-2xl p-5 shadow-md">
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Real-Time Payout Features
                </h3>
                <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Direct Bank Deposits</strong>: Automatic recurring settlements directly to your linked account.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Zero Hidden Fees</strong>: Transparent 5% platform commission on member payments.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Bank-Grade Encryption</strong>: Account numbers are masked and securely tokenized.</span>
                  </li>
                </ul>
              </Card>

              {payoutAccount && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Connected Bank</p>
                    <p className="font-bold text-sm text-foreground">{payoutAccount.bankName}</p>
                    <p className="text-xs text-muted-foreground font-mono">•••• {payoutAccount.accountNumberLast4}</p>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs">
                    Linked
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
