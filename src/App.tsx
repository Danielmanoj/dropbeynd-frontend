import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth, useUser } from '@clerk/react';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/components/layout/main-layout";

import Home from "@/pages/home";
import Feed from "@/pages/feed";
import Browse from "@/pages/browse";
import CreatorProfile from "@/pages/creator-profile";
import CourseView from "@/pages/course-view";
import CreatorDashboard from "@/pages/creator/dashboard";
import CreatorProfilePage from "@/pages/creator/profile";
import CreatePost from "@/pages/creator/posts/new";
import CreateCourse from "@/pages/creator/courses/new";
import EditCourse from "@/pages/creator/courses/edit";
import Subscriptions from "@/pages/subscriptions";
import Payments from "@/pages/payments";
import AdminDashboard from "@/pages/admin/dashboard";
import AIAgentPage from "@/pages/admin/ai-agent";
import Settings from "@/pages/settings";
import RoleSelection from "@/pages/role-selection";
import Inbox from "@/pages/inbox";
import Support from "@/pages/support";

const queryClient = new QueryClient();

const clerkPubKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  "pk_test_cmVsZXZhbnQtYmFib29uLTkwLmNsZXJrLmFjY291bnRzLmRldiQ";

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || undefined;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const BASE = basePath;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(250 84% 54%)",
    colorForeground: "hsl(240 20% 10%)",
    colorMutedForeground: "hsl(240 10% 40%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(240 10% 90%)",
    colorInputForeground: "hsl(240 20% 10%)",
    colorNeutral: "hsl(240 10% 90%)",
    fontFamily: "'Inter', system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-card border-border rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-sm font-medium text-foreground",
    footerActionLink: "text-primary hover:text-primary/90 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground text-xs font-medium uppercase",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-green-600 text-sm",
    alertText: "text-sm",
    logoBox: "h-12 flex justify-center mb-6",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border-input bg-background hover:bg-muted/50 transition-colors",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
    formFieldInput: "bg-background border-input text-foreground focus:ring-ring rounded-md",
    footerAction: "bg-muted/30 py-4 border-t border-border",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/20 text-destructive",
    otpCodeFieldInput: "bg-background border-input text-foreground focus:ring-ring rounded-md",
    formFieldRow: "mb-4",
    main: "flex flex-col gap-4",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 px-4 py-12">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/feed`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 px-4 py-12">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/role-selection`}
        forceRedirectUrl={`${basePath}/role-selection`}
      />
    </div>
  );
}

function HomeRedirect() {
  return <Home />;
}

function useDbUser() {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["db-user-role"],
    queryFn: async () => {
      const token = await (window as any).Clerk?.session?.getToken();
      const r = await fetch(`${BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        if (r.status === 403 && body?.code === "SUSPENDED") {
          return { role: "suspended", roleSelected: true };
        }
        return { role: "user", roleSelected: false };
      }
      const d = await r.json();
      return {
        role: (d.role as string) ?? "user",
        roleSelected: d.roleSelected ?? (d.role === "creator" || d.role === "admin"),
      };
    },
    enabled: isSignedIn === true,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

function useDbRole() {
  const q = useDbUser();
  return {
    ...q,
    data: q.data?.role ?? "user",
  };
}

function SuspendedScreen() {
  const { signOut } = useClerk();
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="h-20 w-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
          <span className="text-4xl">🚫</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-white mb-3">Account Suspended</h1>
          <p className="text-zinc-400 leading-relaxed">
            Your account has been suspended for violating our community guidelines.
            If you believe this is a mistake, please contact our support team.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@dropbeynd.app"
            className="w-full py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors text-sm font-medium inline-block"
          >
            Contact Support
          </a>
          <button
            onClick={() => signOut()}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminAutoRedirect() {
  const { data: role } = useDbRole();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (role === "admin" && !location.startsWith("/admin")) {
      setLocation("/admin");
    }
  }, [role, location, setLocation]);

  return null;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: role } = useDbRole();

  if (role === "suspended") return <SuspendedScreen />;
  if (role === "admin") return <Redirect to="/admin" />;

  return (
    <>
      <Show when="signed-in">
        <MainLayout>
          <Component />
        </MainLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { data: role, isLoading } = useDbRole();
  return (
    <>
      <Show when="signed-in">
        {isLoading ? null : role === "admin" ? <Component /> : <Redirect to="/feed" />}
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function RoleAutoRedirect() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { data: dbUserData, isLoading } = useDbUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Only process when auth & user data are completely loaded for signed-in users
    if (!isLoaded || !isSignedIn || isLoading || !clerkUser) return;
    const role = dbUserData?.role;
    if (role === "admin" || role === "suspended" || role === "creator") return;

    // Check if the user has already chosen a role
    const hasChosenInClerk = clerkUser.unsafeMetadata?.roleSelected === true;
    const hasChosenInDb = dbUserData?.roleSelected === true;
    const hasChosenInStorage = localStorage.getItem(`role_selected_${clerkUser.id}`) === "true";

    const isExistingUser = hasChosenInClerk || hasChosenInDb || hasChosenInStorage;

    // Only prompt role selection for genuinely new users who have not yet selected their role
    if (!isExistingUser && location !== "/role-selection" && !location.startsWith("/sign-in") && !location.startsWith("/sign-up")) {
      setLocation("/role-selection");
    }
  }, [isLoaded, isSignedIn, isLoading, clerkUser, dbUserData, location, setLocation]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/feed`}
      signUpFallbackRedirectUrl={`${basePath}/role-selection`}
      signUpForceRedirectUrl={`${basePath}/role-selection`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access DropBeynd",
          },
        },
        signUp: {
          start: {
            title: "Join DropBeynd",
            subtitle: "Create your account today",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AdminAutoRedirect />
        <RoleAutoRedirect />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/role-selection" component={RoleSelection} />

          <Route path="/admin"><AdminRoute component={AdminDashboard} /></Route>
          <Route path="/admin/ai-agent"><AdminRoute component={AIAgentPage} /></Route>

          <Route path="/feed"><ProtectedRoute component={Feed} /></Route>
          <Route path="/browse" component={Browse} />
          <Route path="/creators/:creatorId" component={CreatorProfile} />
          <Route path="/courses/:courseId"><ProtectedRoute component={CourseView} /></Route>
          <Route path="/creator/dashboard"><ProtectedRoute component={CreatorDashboard} /></Route>
          <Route path="/creator/profile"><ProtectedRoute component={CreatorProfilePage} /></Route>
          <Route path="/creator/posts/new"><ProtectedRoute component={CreatePost} /></Route>
          <Route path="/creator/courses/new"><ProtectedRoute component={CreateCourse} /></Route>
          <Route path="/creator/courses/:courseId"><ProtectedRoute component={EditCourse} /></Route>
          <Route path="/subscriptions"><ProtectedRoute component={Subscriptions} /></Route>
          <Route path="/payments"><ProtectedRoute component={Payments} /></Route>
          <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
          <Route path="/inbox"><ProtectedRoute component={Inbox} /></Route>
          <Route path="/support"><ProtectedRoute component={Support} /></Route>

          <Route>
            <MainLayout>
              <NotFound />
            </MainLayout>
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="dropbeynd-theme">
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
