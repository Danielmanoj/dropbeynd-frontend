import { format } from "date-fns";
import { CreditCard, ArrowUpRight, Clock, CheckCircle2, XCircle, AlertCircle, Compass } from "lucide-react";
import { useGetMySubscriptions, useCreateBillingPortal } from "@/lib/api-client";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Subscriptions() {
  const { data: subscriptions, isLoading } = useGetMySubscriptions();
  const billingPortal = useCreateBillingPortal();

  const handleManageBilling = () => {
    billingPortal.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.url;
      },
    });
  };

  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> Active
          </span>
        );
      case "past_due":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30">
            <AlertCircle className="h-3 w-3" /> Past Due
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            <XCircle className="h-3 w-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border capitalize">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My Subscriptions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {subscriptions?.length
              ? `Supporting ${subscriptions.length} creator${subscriptions.length !== 1 ? "s" : ""}`
              : "Manage the creators you support."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleManageBilling}
          disabled={billingPortal.isPending}
          className="rounded-xl gap-2"
        >
          <CreditCard className="h-4 w-4" />
          {billingPortal.isPending ? "Loading..." : "Manage Billing"}
        </Button>
      </div>

      {!subscriptions || subscriptions.length === 0 ? (
        <div className="flex flex-col items-center py-20 rounded-2xl border border-border bg-card/40 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">No active subscriptions</h3>
          <p className="text-muted-foreground mb-6 max-w-xs text-sm">
            You aren't subscribed to any creators yet. Discover amazing content makers.
          </p>
          <Link href="/browse">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl gap-2">
              <Compass className="h-4 w-4" />
              Discover Creators
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((sub: any) => (
            <div
              key={sub.id}
              className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:border-border/70 hover:bg-accent/30 transition-all duration-200"
            >
              <Avatar className="h-14 w-14 border-2 shrink-0 border-border">
                <AvatarImage src={sub.creatorAvatarUrl || undefined} />
                <AvatarFallback className="text-lg font-bold bg-violet-600/20 text-violet-600 dark:text-violet-300">
                  {sub.creatorName?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <h3 className="font-bold text-foreground text-base">{sub.creatorName}</h3>
                  <StatusBadge status={sub.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {sub.monthlyPrice != null && sub.monthlyPrice > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-foreground/80">
                      <CreditCard className="h-3 w-3 text-violet-500" />
                      ${Number(sub.monthlyPrice).toFixed(2)}/mo
                    </span>
                  )}
                  {sub.currentPeriodEnd && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {sub.status === "cancelled" ? "Ends" : "Renews"}{" "}
                      {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
                    </span>
                  )}
                  {sub.createdAt && (
                    <span>
                      Subscribed {format(new Date(sub.createdAt), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={`/creators/${sub.creatorId}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5 hover:border-violet-500"
                  >
                    View Content
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {subscriptions && subscriptions.length > 0 && (
        <div className="mt-6 p-4 rounded-2xl border border-border bg-muted/30 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-muted-foreground text-sm">
            Total monthly spend:{" "}
            <span className="text-foreground font-bold">
              ${subscriptions
                .filter((s: any) => s.status === "active")
                .reduce((sum: number, s: any) => sum + (Number(s.monthlyPrice) || 0), 0)
                .toFixed(2)}
              /mo
            </span>
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManageBilling}
            disabled={billingPortal.isPending}
            className="text-muted-foreground hover:text-foreground gap-1.5 text-xs"
          >
            <CreditCard className="h-3 w-3" />
            Manage billing on Stripe
          </Button>
        </div>
      )}
    </div>
  );
}
