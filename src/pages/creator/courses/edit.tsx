import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { useGetCourse, useUpdateCourse, useCreateLesson } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const lessonSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  contentType: z.enum(["video", "pdf", "text"]),
  contentUrl: z.string().optional(),
});

const courseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  isPublished: z.boolean().default(false),
  lessons: z.array(lessonSchema).min(1, "You must add at least one lesson"),
});

export default function EditCourse() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const params = useParams();
  const courseId = params.courseId as string;
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useGetCourse(courseId, { query: { enabled: !!courseId } as any });
  
  const updateCourse = useUpdateCourse();
  const createLesson = useCreateLesson();

  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      thumbnailUrl: "",
      isPublished: false,
      lessons: [{ title: "", contentType: "video", contentUrl: "", description: "" }],
    },
  });

  useEffect(() => {
    if (course) {
      form.reset({
        title: course.title || "",
        description: course.description || "",
        thumbnailUrl: course.thumbnailUrl || "",
        isPublished: course.isPublished || false,
        lessons: course.lessons && course.lessons.length > 0 
          ? course.lessons.map(l => ({
              title: l.title,
              description: l.description || "",
              contentType: l.contentType,
              contentUrl: l.contentUrl || ""
            }))
          : [{ title: "", contentType: "video", contentUrl: "", description: "" }],
      });
    }
  }, [course, form]);

  const lessons = form.watch("lessons");

  const addLesson = () => {
    form.setValue("lessons", [
      ...lessons,
      { title: "", contentType: "video", contentUrl: "", description: "" }
    ]);
  };

  const removeLesson = (index: number) => {
    if (lessons.length <= 1) return;
    const newLessons = [...lessons];
    newLessons.splice(index, 1);
    form.setValue("lessons", newLessons);
  };

  const onSubmit = async (values: z.infer<typeof courseSchema>) => {
    try {
      await updateCourse.mutateAsync({
        courseId,
        data: {
          title: values.title,
          description: values.description,
          thumbnailUrl: values.thumbnailUrl || undefined,
          isPublished: values.isPublished,
        }
      });

      // Simple implementation: this would ideally be a bulk update or delete/recreate
      // For now we'll just try to add new lessons if they exceed the existing count
      if (course?.lessons && values.lessons.length > course.lessons.length) {
        for (let i = course.lessons.length; i < values.lessons.length; i++) {
          const lesson = values.lessons[i];
          await createLesson.mutateAsync({
            courseId: courseId,
            data: {
              title: lesson.title,
              description: lesson.description,
              contentType: lesson.contentType,
              contentUrl: lesson.contentUrl || undefined,
              orderIndex: i,
            }
          });
        }
      }

      toast({ title: "Success", description: "Course updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
      setLocation("/creator/dashboard");
      
    } catch (error) {
      toast({ title: "Error", description: "Failed to update course.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="max-w-4xl mx-auto space-y-6"><Skeleton className="h-[400px] w-full" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Course</h1>
        <p className="text-muted-foreground mt-1">Update your course details and curriculum.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Complete Web Development Bootcamp" className="text-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What will students learn in this course?" 
                        className="h-32"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thumbnailUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thumbnail URL (Optional)</FormLabel>
                    <div className="flex gap-4">
                      <div className="h-20 w-32 shrink-0 bg-muted rounded-md border border-border flex items-center justify-center overflow-hidden">
                        {field.value ? (
                          <img src={field.value} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground opacity-50" />
                        )}
                      </div>
                      <div className="flex-1 flex items-center">
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Curriculum</h2>
            <Button type="button" onClick={addLesson} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Add Lesson
            </Button>
          </div>

          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <Card key={index} className="border-border/60 shadow-sm relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted/50 border-r border-border flex flex-col items-center justify-center cursor-grab text-muted-foreground">
                  <GripVertical className="h-5 w-5 opacity-50" />
                  <div className="font-mono text-xs mt-2 font-bold">{index + 1}</div>
                </div>
                
                <CardContent className="pl-14 pt-6 pb-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg">Lesson {index + 1}</h3>
                    {lessons.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => removeLesson(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`lessons.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Lesson Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Introduction to Variables" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lessons.${index}.contentType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || "video"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="pdf">PDF Document</SelectItem>
                              <SelectItem value="text">Text / Article</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lessons.${index}.contentUrl`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content URL</FormLabel>
                          <FormControl>
                            <Input placeholder="URL to video, pdf, or leave blank for text" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`lessons.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Lesson Content / Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add lesson notes, transcript, or full text content here..." 
                              className="h-24"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/60 shadow-sm bg-muted/10">
            <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-lg">Publish Course</h3>
                <p className="text-sm text-muted-foreground">Make this course visible to your subscribers immediately.</p>
              </div>
              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 m-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 sticky bottom-6 z-10 bg-background/80 backdrop-blur-md p-4 rounded-xl border border-border shadow-lg">
            <Button variant="outline" type="button" onClick={() => setLocation("/creator/dashboard")}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={updateCourse.isPending || createLesson.isPending}>
              {(updateCourse.isPending || createLesson.isPending) ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
