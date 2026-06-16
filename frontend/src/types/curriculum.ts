export interface LessonResponse {
  id: string;
  title: string;
  description: string;
  template_name: string;
  template_id: string | null;
  difficulty: string;
  order: number;
}

export interface ModuleResponse {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: LessonResponse[];
}

export interface CurriculumResponse {
  modules: ModuleResponse[];
}
