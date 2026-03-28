// Описываем структуру одного навыка
export interface Skill {
  id: number;
  name: string;
  level: number; // Мы договорились, что это 0-100
  icon_name?: string; // Вопросительный знак значит, что поле необязательное
}

// Описываем структуру группы (как она приходит из Django)
export interface SkillGroup {
  id: number;
  name: string;
  order: number;
  skills: Skill[]; // Массив объектов типа Skill
}

// Описываем структуру проекта
export interface Project {
  id: number;
  title: string;
  description: string;
  image?: string; // URL картинки из Django Media
  technologies: string[]; // JSON поле из Django (превращается в массив строк)
  link?: string;
  created_at: string;
}

// Обнови этот интерфейс в src/types/index.ts
export interface Experience {
  id: number;
  title: string;
  stage: string; // Должность (например, "Заместитель директора...")
  company: string; // Компания
  date_range: string; // Дата начала (YYYY-MM-DD)
  end_date: string | null; // Дата окончания или null
  objective: string; // Описание работы
  details: string[]; // Стек (Nginx, Docker и т.д.)
  status: string; // active, archived и т.д.
}

export interface Education {
  id: number;
  record_type: string;
  institution: string;
  degree: string;
  date_range: string;
  status: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  created_at: string; // Django отдает дату строкой (ISO)
  tags: string[];
  is_published: boolean;
}
