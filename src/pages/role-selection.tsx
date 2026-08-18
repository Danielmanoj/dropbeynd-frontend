import { useState } from "react";
import { useLocation } from "wouter";
import { User, Compass, PenSquare } from "lucide-react";
import { useUpdateMe, useCreateCreatorProfile } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [step, setStep] = useState<"role" | "creator-setup">("role");
  
  const updateMe = useUpdateMe();
  const createCreator = useCreateCreatorProfile();

  const [creatorData, setCreatorData] = useState({
    name: "",
    bio: "",
    niche: "",
    monthlyPrice: 5,
  });

  const handleSelectFan = () => {
    updateMe.mutate({ data: {} }, {
      onSuccess: () => {
        setLocation("/feed");
      },
      onError: () => {
        toast({ title: "Error", description: "Could not set up account. Please try again.", variant: "destructive" });
      }
    });
  };

  const handleCreateCreator = () => {
    if (!creatorData.name) {
      toast({ title: "Error", description: "Name is required.", variant: "destructive" });
      return;
    }

    createCreator.mutate({ data: creatorData }, {
      onSuccess: () => {
        setLocation("/creator/dashboard");
      },
      onError: () => {
        toast({ title: "Error", description: "Could not create creator profile. Please try again.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
            <Compass className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to DropBeynd</h1>
          <p className="text-muted-foreground text-center mt-2">
            {step === "role" ? "How do you want to use the platform?" : "Set up your creator profile"}
          </p>
        </div>

        {step === "role" ? (
          <div className="grid gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setStep("creator-setup")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenSquare className="h-5 w-5 text-primary" />
                  I'm a Creator
                </CardTitle>
                <CardDescription>
                  I want to publish content, courses, and build a subscription business.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleSelectFan}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  I'm a Fan
                </CardTitle>
                <CardDescription>
                  I want to subscribe to creators and consume premium content.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Creator Profile</CardTitle>
              <CardDescription>Tell us a bit about what you do.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input 
                  id="name" 
                  value={creatorData.name} 
                  onChange={e => setCreatorData({...creatorData, name: e.target.value})} 
                  placeholder="e.g. Fitness with Jane"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="niche">Niche / Category</Label>
                <Select
                  value={creatorData.niche}
                  onValueChange={(value) => setCreatorData({ ...creatorData, niche: value })}
                >
                  <SelectTrigger id="niche">
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
                  onChange={e => setCreatorData({...creatorData, bio: e.target.value})} 
                  placeholder="Describe what you do and what subscribers will get."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Monthly Subscription Price ($)</Label>
                <Input 
                  id="price" 
                  type="number" 
                  min="1"
                  value={creatorData.monthlyPrice} 
                  onChange={e => setCreatorData({...creatorData, monthlyPrice: Number(e.target.value)})} 
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("role")}>Back</Button>
              <Button onClick={handleCreateCreator} disabled={createCreator.isPending}>
                {createCreator.isPending ? "Creating..." : "Complete Setup"}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
