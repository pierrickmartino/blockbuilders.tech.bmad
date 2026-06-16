export interface LessonResponse {
  id: string;
  title: string;
  description: string;
  template_name: string;
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
