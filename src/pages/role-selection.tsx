import { useState } from "react";
import { useLocation } from "wouter";
import { User, Compass, PenSquare, Sparkles, ArrowRight, BookOpen, Layers, CheckCircle2 } from "lucide-react";
import { useGetMe, useGetMyCreatorProfile, useUpdateMe, useCreateCreatorProfile } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const NICHES = [
  "Fitness & Health",
  "Nutrition & Diet",
  "Yoga & Meditation",
  "Education & Tutoring",
  "Business & Entrepreneurship",
  "Finance & Investing",
  "Technology & Coding",
  "Art & Illustration",
  "Photography",
  "Music & Audio",
  "Cooking & Food",
  "Travel & Lifestyle",
  "Fashion & Beauty",
  "Gaming",
  "Parenting & Family",
  "Writing & Storytelling",
  "Podcasting",
  "Personal Development",
  "Language Learning",
  "Other",
];

export default function RoleSelection() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();
  const [step, setStep] = useState<"role" | "creator-setup">("role");

  const { data: me } = useGetMe();
  const { data: creatorProfile } = useGetMyCreatorProfile({
    query: {
      retry: false,
    } as any,
  });

  const updateMe = useUpdateMe();
  const createCreator = useCreateCreatorProfile();

  const [creatorData, setCreatorData] = useState({
    name: "",
    bio: "",
    niche: "",
    monthlyPrice: 9.99,
  });

  const handleSelectUser = async () => {
    if (clerkUser?.id) {
      localStorage.setItem(`role_selected_${clerkUser.id}`, "true");
      try {
        await clerkUser.update({
          unsafeMetadata: {
            ...clerkUser.unsafeMetadata,
            roleSelected: true,
            selectedRole: "user",
          },
        });
      } catch (e) {
        console.warn("Clerk metadata update skipped:", e);
      }
    }
    updateMe.mutate(
      { data: { roleSelected: true } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["db-user-role"] });
          queryClient.invalidateQueries({ queryKey: [`/api/users/me`] });
          setLocation("/feed");
        },
        onError: () => {
          queryClient.invalidateQueries({ queryKey: ["db-user-role"] });
          setLocation("/feed");
        },
      }
    );
  };

  const handleSelectCreator = () => {
    // If user already has a creator profile or is creator, take them directly to dashboard
    if (me?.role === "creator" || creatorProfile?.id) {
      if (clerkUser?.id) {
        localStorage.setItem(`role_selected_${clerkUser.id}`, "true");
        clerkUser.update({
          unsafeMetadata: {
            ...clerkUser.unsafeMetadata,
            roleSelected: true,
            selectedRole: "creator",
          },
        }).catch(() => {});
      }
      setLocation("/creator/dashboard");
      return;
    }
    // Otherwise open creator profile setup
    if (me?.name && !creatorData.name) {
      setCreatorData((prev) => ({ ...prev, name: me.name || "" }));
    }
    setStep("creator-setup");
  };

  const handleCreateCreator = () => {
    if (!creatorData.name.trim()) {
      toast({ title: "Name Required", description: "Please enter a creator display name.", variant: "destructive" });
      return;
    }

    createCreator.mutate(
      { data: creatorData },
      {
        onSuccess: async () => {
          if (clerkUser?.id) {
            localStorage.setItem(`role_selected_${clerkUser.id}`, "true");
            try {
              await clerkUser.update({
                unsafeMetadata: {
                  ...clerkUser.unsafeMetadata,
                  roleSelected: true,
                  selectedRole: "creator",
                },
              });
            } catch (e) {
              console.warn("Clerk metadata update skipped:", e);
            }
          }
          queryClient.invalidateQueries({ queryKey: ["db-user-role"] });
          queryClient.invalidateQueries({ queryKey: [`/api/users/me`] });
          queryClient.invalidateQueries({ queryKey: [`/api/creators/me`] });
          toast({ title: "Creator Profile Created", description: "Welcome to your creator dashboard!" });
          setLocation("/creator/dashboard");
        },
        onError: async (err: any) => {
          if (err?.message?.includes("already exists") || err?.status === 409) {
            if (clerkUser?.id) {
              localStorage.setItem(`role_selected_${clerkUser.id}`, "true");
              try {
                await clerkUser.update({
                  unsafeMetadata: {
                    ...clerkUser.unsafeMetadata,
                    roleSelected: true,
                    selectedRole: "creator",
                  },
                });
              } catch (e) {}
            }
            setLocation("/creator/dashboard");
            return;
          }
          toast({ title: "Error", description: "Could not create creator profile. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-background via-muted/20 to-background px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-sm">
            <Compass className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {step === "role" ? "Choose Your Experience" : "Set Up Creator Profile"}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md text-sm md:text-base">
            {step === "role"
              ? "Select how you would like to use DropBeynd today. You can switch between roles at any time."
              : "Tell us a few details about what you create to launch your creator studio."}
          </p>
        </div>

        {step === "role" ? (
          <div className="grid gap-4">
            {/* User Option */}
            <Card
              className="group relative cursor-pointer border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
              onClick={handleSelectUser}
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        I'm a User / Fan
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20 font-normal">
                          Explore
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Discover top creators, access exclusive content, and learn
                      </CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                    <span>Personalized Feed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                    <span>Courses & Content</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Creator Option */}
            <Card
              className="group relative cursor-pointer border-border hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 overflow-hidden"
              onClick={handleSelectCreator}
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        I'm a Creator
                        <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/20 font-normal">
                          Monetize
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Publish content, build courses, and grow a paid subscriber base
                      </CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <PenSquare className="h-3.5 w-3.5 text-violet-500" />
                    <span>Publish Posts & Media</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-violet-500" />
                    <span>Manage Subscriptions</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-border shadow-xl shadow-black/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenSquare className="h-5 w-5 text-violet-500" />
                Creator Profile Setup
              </CardTitle>
              <CardDescription>Tell subscribers about yourself and your content niche.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name *</Label>
                <Input
                  id="name"
                  value={creatorData.name}
                  onChange={(e) => setCreatorData({ ...creatorData, name: e.target.value })}
                  placeholder="e.g. Alex Rivera or Design Academy"
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="niche">Category / Niche</Label>
                <Select
                  value={creatorData.niche}
                  onValueChange={(value) => setCreatorData({ ...creatorData, niche: value })}
                >
                  <SelectTrigger id="niche" className="rounded-lg">
                    <SelectValue placeholder="Select your category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {NICHES.map((niche) => (
                      <SelectItem key={niche} value={niche}>
                        {niche}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Short Bio</Label>
                <Textarea
                  id="bio"
                  value={creatorData.bio}
                  onChange={(e) => setCreatorData({ ...creatorData, bio: e.target.value })}
                  placeholder="Describe your craft and what exclusive content subscribers will get."
                  rows={3}
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Monthly Membership Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="1"
                  value={creatorData.monthlyPrice}
                  onChange={(e) => setCreatorData({ ...creatorData, monthlyPrice: parseFloat(e.target.value) || 0 })}
                  className="rounded-lg"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep("role")} className="rounded-lg">
                Back
              </Button>
              <Button
                onClick={handleCreateCreator}
                disabled={createCreator.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-sm"
              >
                {createCreator.isPending ? "Creating Profile..." : "Complete Setup & Launch"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
