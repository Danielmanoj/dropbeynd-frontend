import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  BarChart3, 
  DollarSign, 
  Users, 
  FileText, 
  BookOpen, 
  TrendingUp,
  Plus,
  Settings,
  CreditCard
} from "lucide-react";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis,
  BarChart,
  Bar
} from "recharts";

import { useGetCreatorDashboard, useGetCreatorAnalytics } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function CreatorDashboard() {
  const { data: dashboard, isLoading: dashboardLoading } = useGetCreatorDashboard();
  const { data: analytics, isLoading: analyticsLoading } = useGetCreatorAnalytics();

  if (dashboardLoading || analyticsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!dashboard) return <div>Failed to load dashboard</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your content and track your business.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/creator/posts/new">
            <Button variant="outline" className="bg-background">
              <FileText className="mr-2 h-4 w-4" /> New Post
            </Button>
          </Link>
          <Link href="/creator/courses/new">
            <Button>
              <BookOpen className="mr-2 h-4 w-4" /> New Course
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 shadow-sm hover:border-primary/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${dashboard.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <DollarSign className="h-3 w-3 mr-0.5 text-primary" />
              Total lifetime: ${dashboard.totalRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-border/60 shadow-sm hover:border-primary/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard.subscriberCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              +{dashboard.newSubscribersThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:border-primary/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Published</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard.totalPosts}</div>
            <p className="text-xs text-muted-foreground mt-1">Posts across all tiers</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm hover:border-primary/20 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses & Lessons</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard.totalCourses}</div>
            <p className="text-xs text-muted-foreground mt-1">{dashboard.totalLessons} total lessons</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="revenue">Revenue Growth</TabsTrigger>
          <TabsTrigger value="subscribers">Subscriber Growth</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Your monthly recurring revenue over the past 6 months.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.revenueByMonth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`$${value}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Subscriber Growth</CardTitle>
              <CardDescription>New subscribers acquired each month.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.subscriberGrowth || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                    formatter={(value: number) => [`${value}`, 'New Subscribers']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Posts */}
        <Card className="border-border/60 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardDescription>Your most engaging recent content.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-4">
              {analytics?.topPosts?.slice(0, 4).map(post => (
                <div key={post.id} className="flex items-start gap-4 p-3 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors">
                  <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-md flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-sm font-medium line-clamp-1">{post.title || "Untitled Post"}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(post.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                  {post.isLocked ? (
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] shrink-0">Premium</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] shrink-0">Public</Badge>
                  )}
                </div>
              ))}
              {(!analytics?.topPosts || analytics.topPosts.length === 0) && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No posts published yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="border-border/60 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Latest transactions from subscribers.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {dashboard.recentPayments?.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.recentPayments.map((payment) => (
                    <TableRow key={payment.id} className="border-border/50">
                      <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {format(new Date(payment.createdAt), 'MMM d')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-50" />
                No recent payments.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
