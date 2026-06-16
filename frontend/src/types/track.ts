export interface TrackLesson {
  id: string;
  title: string;
  order: number;
  completed: boolean;
}

export interface TrackModule {
  id: string;
  title: string;
  order: number;
  lessons: TrackLesson[];
  completed_count: number;
  total_count: number;
  percent_complete: number;
}

export interface TrackView {
  modules: TrackModule[];
  total_lessons: number;
  completed_lessons: number;
  percent_complete: number;
  resume_lesson_id: string | null;
}
