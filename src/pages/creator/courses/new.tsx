import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Plus, Trash2, GripVertical, Film, FileText, BookOpen } from "lucide-react";
import { useCreateCourse, useCreateLesson } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropzoneUploader } from "@/components/upload/dropzone-uploader";

const lessonSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  contentType: z.enum(["video", "pdf", "doc", "text"]),
  contentUrl: z.string().optional(),
});

const courseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().optional(),
  isPublished: z.boolean().default(false),
  lessons: z.array(lessonSchema).min(1, "You must add at least one lesson"),
});

const CONTENT_TYPE_LABELS: Record<string, { label: string; hint: string; icon: React.ElementType }> = {
  video: { label: "Video", hint: "MP4, MOV · max 100MB", icon: Film },
  pdf:   { label: "PDF Document", hint: "PDF · max 100MB", icon: FileText },
  doc:   { label: "Word Document", hint: "DOC, DOCX · max 100MB", icon: FileText },
  text:  { label: "Text / Article", hint: "No file needed — write content below", icon: BookOpen },
};

export default function CreateCourse() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createCourse = useCreateCourse();
  const createLesson = useCreateLesson();

  // Uploaded URLs state (parallel arrays to lessons)
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState<string>("");
  const [uploadedLessonUrls, setUploadedLessonUrls] = useState<string[]>([""]);

  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      isPublished: false,
      lessons: [{ title: "", contentType: "video", contentUrl: "", description: "" }],
    },
  });

  const lessons = form.watch("lessons");

  const addLesson = () => {
    form.setValue("lessons", [
      ...lessons,
      { title: "", contentType: "video", contentUrl: "", description: "" },
    ]);
    setUploadedLessonUrls(prev => [...prev, ""]);
  };

  const removeLesson = (index: number) => {
    if (lessons.length <= 1) return;
    const newLessons = [...lessons];
    newLessons.splice(index, 1);
    form.setValue("lessons", newLessons);
    setUploadedLessonUrls(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  function setLessonUrl(index: number, url: string) {
    setUploadedLessonUrls(prev => {
      const next = [...prev];
      next[index] = url;
      return next;
    });
  }

  const onSubmit = async (values: z.infer<typeof courseSchema>) => {
    try {
      const course = await createCourse.mutateAsync({
        data: {
          title: values.title,
          description: values.description,
          thumbnailUrl: uploadedThumbnailUrl || undefined,
          isPublished: values.isPublished,
        },
      });

      for (let i = 0; i < values.lessons.length; i++) {
        const lesson = values.lessons[i];
        const contentUrl = uploadedLessonUrls[i] || lesson.contentUrl || undefined;
        await createLesson.mutateAsync({
          courseId: course.id,
          data: {
            title: lesson.title,
            description: lesson.description,
            contentType: lesson.contentType === "doc" ? "pdf" : lesson.contentType,
            contentUrl,
            orderIndex: i,
          },
        });
      }

      toast({ title: "Course created!", description: "Your course is now live." });
      setLocation("/creator/dashboard");
    } catch {
      toast({ title: "Error", description: "Failed to create course.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Create New Course</h1>
        <p className="text-muted-foreground mt-1 text-sm">Build a structured learning experience for your subscribers.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* Course Details */}
          <Card className="bg-card border-border rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-foreground text-lg">Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Complete Web Development Bootcamp"
                        className="text-base"
                        {...field}
                      />
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
                    <FormLabel>Description <span className="text-zinc-600 font-normal">(optional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What will students learn in this course?"
                        className="h-28 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Thumbnail uploader */}
              <div>
                <p className="text-foreground/80 text-sm font-medium mb-2">
                  Course Thumbnail <span className="text-zinc-600 font-normal">(optional)</span>
                </p>
                <DropzoneUploader
                  uploadType="post"
                  accept="image"
                  hint="JPG, PNG, WebP · max 50MB — course cover image"
                  persistKey="course-thumbnail"
                  defaultPreview={uploadedThumbnailUrl || undefined}
                  onUploadComplete={(url) => setUploadedThumbnailUrl(url)}
                  onClear={() => setUploadedThumbnailUrl("")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Curriculum */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Curriculum</h2>
            <Button
              type="button"
              onClick={addLesson}
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 hover:border-violet-500"
            >
              <Plus className="h-4 w-4" /> Add Lesson
            </Button>
          </div>

          <div className="space-y-4">
            {lessons.map((lesson, index) => {
              const ct = lesson.contentType as string;
              const needsFile = ct !== "text";
              const info = CONTENT_TYPE_LABELS[ct] ?? CONTENT_TYPE_LABELS.text;

              return (
                <Card key={index} className="bg-card border-border rounded-2xl relative overflow-hidden">
                  {/* Lesson index strip */}
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-muted/60 border-r border-border flex flex-col items-center justify-center gap-1 cursor-default">
                    <GripVertical className="h-4 w-4 text-muted-foreground opacity-50" />
                    <span className="font-mono text-xs font-bold text-muted-foreground">{index + 1}</span>
                  </div>

                  <CardContent className="pl-14 pt-5 pb-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground text-base">Lesson {index + 1}</h3>
                      {lessons.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500/70 hover:text-red-400 hover:bg-red-950/30"
                          onClick={() => removeLesson(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name={`lessons.${index}.title`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Lesson Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Introduction to Variables"
                              className=""
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`lessons.${index}.contentType`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Content Type</FormLabel>
                            <Select
                              onValueChange={(val) => {
                                field.onChange(val);
                                setLessonUrl(index, "");
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="pdf">PDF Document</SelectItem>
                                <SelectItem value="doc">Word Document (DOC/DOCX)</SelectItem>
                                <SelectItem value="text">Text / Article</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`lessons.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Notes / Description <span className="text-zinc-600">(optional)</span></FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Brief description of this lesson…"
                                className=""
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* File upload or URL or text content */}
                    {needsFile ? (
                      <div>
                        <p className="text-muted-foreground text-xs font-medium mb-2 flex items-center gap-1.5">
                          <info.icon className="h-3.5 w-3.5" /> Upload {info.label}
                        </p>
                        <DropzoneUploader
                          uploadType="course"
                          accept={ct === "video" ? "image+video" : "video+pdf+doc"}
                          hint={info.hint}
                          persistKey={`course-lesson-${index}`}
                          defaultPreview={uploadedLessonUrls[index] || undefined}
                          onUploadComplete={(url) => setLessonUrl(index, url)}
                          onClear={() => setLessonUrl(index, "")}
                        />
                        {!uploadedLessonUrls[index] && (
                          <div className="mt-2">
                            <p className="text-muted-foreground text-xs mb-1">Or paste a direct URL</p>
                            <FormField
                              control={form.control}
                              name={`lessons.${index}.contentUrl`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      placeholder={ct === "video" ? "https://example.com/video.mp4" : "https://example.com/file.pdf"}
                                      className="text-sm"
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <FormField
                        control={form.control}
                        name={`lessons.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Lesson Content / Article</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Write your lesson content here…"
                                className="min-h-[120px] resize-y"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Publish toggle */}
          <Card className="bg-card border-border rounded-2xl">
            <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">Publish Course</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Make this course visible to subscribers immediately.</p>
              </div>
              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-violet-600"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Sticky footer actions */}
          <div className="flex justify-end gap-3 sticky bottom-6 z-10 bg-background/90 backdrop-blur-md p-4 rounded-2xl border border-border shadow-xl">
            <Button
              variant="outline"
              type="button"
              onClick={() => setLocation("/creator/dashboard")}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={createCourse.isPending || createLesson.isPending}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl px-8"
            >
              {(createCourse.isPending || createLesson.isPending) ? "Saving…" : "Save Course"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
