import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Link } from "wouter";
import { Play, FileText, CheckCircle, ChevronLeft, Lock, BookOpen } from "lucide-react";
import { useGetCourse, useGetCourseProgress, useUpdateCourseProgress } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function CourseView() {
  const params = useParams();
  const courseId = params.courseId as string;
  const queryClient = useQueryClient();
  
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const { data: course, isLoading: courseLoading } = useGetCourse(courseId, { query: { enabled: !!courseId } as any });
  const { data: progress, isLoading: progressLoading } = useGetCourseProgress(courseId, { query: { enabled: !!courseId } as any });
  const updateProgress = useUpdateCourseProgress();

  // Set first lesson as active when course loads if none is selected
  useEffect(() => {
    if (course?.lessons && course.lessons.length > 0 && !activeLessonId) {
      setActiveLessonId(course.lessons[0].id);
    }
  }, [course?.lessons?.[0]?.id]);

  const activeLesson = course?.lessons.find(l => l.id === activeLessonId);

  const handleMarkComplete = () => {
    if (!activeLesson) return;
    
    updateProgress.mutate(
      { courseId, data: { lessonId: activeLesson.id, completed: true } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "progress"] });
          // Move to next lesson if available
          const currentIndex = course?.lessons.findIndex(l => l.id === activeLesson.id) ?? -1;
          if (currentIndex !== -1 && currentIndex < (course?.lessons.length ?? 0) - 1) {
            setActiveLessonId(course!.lessons[currentIndex + 1].id);
          }
        }
      }
    );
  };

  const isCompleted = (lessonId: string) => progress?.completedLessons.includes(lessonId);

  if (courseLoading || progressLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        <Skeleton className="w-80 h-full rounded-xl" />
        <Skeleton className="flex-1 h-full rounded-xl" />
      </div>
    );
  }

  if (!course) return <div>Course not found</div>;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-6rem)] gap-6 -mt-4">
      {/* Sidebar - Lesson List */}
      <Card className="w-full md:w-80 lg:w-96 flex flex-col h-full overflow-hidden border-border/60 shadow-sm rounded-xl rounded-b-none md:rounded-b-xl">
        <CardHeader className="border-b bg-muted/20 pb-4 shrink-0">
          <Link href={`/creators/${course.creatorId}`} className="text-sm text-primary flex items-center hover:underline mb-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to {course.creatorName}
          </Link>
          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>{progress?.percentComplete ?? 0}% Complete</span>
              <span>{progress?.completedLessons.length ?? 0}/{course.lessons.length}</span>
            </div>
            <Progress value={progress?.percentComplete ?? 0} className="h-2" />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <div className="p-3 flex flex-col gap-2">
            {course.lessons.map((lesson, index) => {
              const active = activeLessonId === lesson.id;
              const completed = isCompleted(lesson.id);
              
              return (
                <button
                  key={lesson.id}
                  onClick={() => setActiveLessonId(lesson.id)}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                    active 
                      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
                      : "bg-card border-transparent hover:border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <span className="text-muted-foreground text-xs w-4">{index + 1}.</span>
                      <span className="line-clamp-2">{lesson.title}</span>
                    </div>
                    {completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 ml-2" />
                    ) : lesson.contentType === "video" ? (
                      <Play className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 pl-6 flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                      {lesson.contentType}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Content Area */}
      <Card className="flex-1 flex flex-col h-full overflow-hidden border-border/60 shadow-sm rounded-xl rounded-t-none md:rounded-t-xl">
        {activeLesson ? (
          <>
            <div className="bg-black w-full aspect-video md:aspect-auto md:h-2/3 shrink-0 flex items-center justify-center relative">
              {activeLesson.contentType === "video" ? (
                activeLesson.contentUrl ? (
                  <video src={activeLesson.contentUrl} controls className="w-full h-full object-contain" />
                ) : (
                  <div className="text-white/50 flex flex-col items-center">
                    <Play className="h-16 w-16 mb-4 opacity-50" />
                    <p>Video processing or unavailable</p>
                  </div>
                )
              ) : activeLesson.contentType === "pdf" ? (
                <div className="text-foreground/80 flex flex-col items-center p-8 text-center bg-muted w-full h-full justify-center">
                  <FileText className="h-16 w-16 mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">PDF Document</h3>
                  <a href={activeLesson.contentUrl || "#"} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" className="mt-4">Open Document in New Tab</Button>
                  </a>
                </div>
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
                    <p className="text-muted-foreground mt-1">Lesson {course.lessons.findIndex(l => l.id === activeLesson.id) + 1} of {course.lessons.length}</p>
                  </div>
                  
                  {!isCompleted(activeLesson.id) ? (
                    <Button onClick={handleMarkComplete} className="shrink-0">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark as Complete
                    </Button>
                  ) : (
                    <Button variant="outline" className="text-green-600 border-green-200 bg-green-50 shrink-0 cursor-default hover:bg-green-50 hover:text-green-600">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Completed
                    </Button>
                  )}
                </div>

                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/90">
                  {activeLesson.description ? (
                    <div className="whitespace-pre-wrap">{activeLesson.description}</div>
                  ) : (
                    <p className="text-muted-foreground italic">No description provided for this lesson.</p>
                  )}
                </div>
                
                {activeLesson.contentType === "text" && activeLesson.contentUrl && (
                  <div className="mt-8 prose prose-sm md:prose-base dark:prose-invert max-w-none text-foreground/90 p-6 bg-muted/30 rounded-xl border border-border">
                    {/* If this was a real app, we might fetch the text content from the URL. For now just show a placeholder */}
                    <div className="whitespace-pre-wrap">{activeLesson.contentUrl}</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <BookOpen className="h-16 w-16 mb-4 opacity-50" />
            <p>Select a lesson from the sidebar to begin.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
