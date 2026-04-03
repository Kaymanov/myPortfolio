import { SkillGroup, Project, Experience, Education, BlogPost } from "@/types";
import {
  getSkills,
  getProjects,
  getExperience,
  getEducation,
  getBlogPosts,
} from "@/lib/api";
import { ProgressBar } from "@/components/ProgressBar";
import { TerminalInput } from "@/components/TerminalInput";
import { ProjectCard } from "@/components/ProjectCard";
import { ExperienceTimeline } from "@/components/ExperienceTimeline";
import { EducationMemory } from "@/components/EducationMemory";
import { ContactTerminal } from "@/components/ContactTerminal";
import { HeroSection } from "@/components/HeroSection";
import { BlogPreview } from "@/components/BlogPreview";
import { getDictionary, Locale } from "@/i18n/dictionaries";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang as Locale);
  // Получаем данные напрямую с бэкенда
  const skillGroups: SkillGroup[] = await getSkills(lang);
  const projects: Project[] = await getProjects(lang);
  const experienceLogs: Experience[] = await getExperience(lang);
  const educationRecords: Education[] = await getEducation(lang);
  const allPosts: BlogPost[] = await getBlogPosts(lang); // Запрашиваем посты
  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto relative min-h-screen">
      {/* Секция Hero */}
      <HeroSection dictionary={dictionary.hero} />
      <section id="blog" className="mb-24">
        <h2 className="text-xl mb-12 flex items-center gap-2 uppercase tracking-widest border-b border-terminal-green/30 pb-2">
          <span className="text-terminal-green opacity-50">{">"}</span>
          <span className="text-glitch" data-text="KNOWLEDGE_BASE">
            KNOWLEDGE_BASE
          </span>
        </h2>

        {/* Передаем только 2 последние статьи */}
        <BlogPreview posts={allPosts.slice(0, 2)} />
      </section>
      {/* Секция навыков */}
      <section id="skills" className="mb-16 scroll-mt-20">
        {/* ГЛАВНЫЙ ЗАГОЛОВОК: Применяем глитч только к слову, чтобы не ломать структуру со span */}
        <h2 className="text-xl mb-8 flex items-center gap-2 uppercase tracking-widest border-b border-terminal-green/30 pb-2">
          <span className="text-terminal-green opacity-50">{">"}</span>
          <span className="text-glitch" data-text="SKILLS">
            SKILLS
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {skillGroups.map((group) => (
            <div
              key={group.id}
              className="border border-terminal-border p-4 bg-terminal-green/5 hover:bg-terminal-green/10 transition-colors"
            >
              {/* ЗАГОЛОВОК ГРУППЫ: Добавляем // в data-text, чтобы глитч дергал всю строку целиком */}
              <h3
                data-text={`// ${group.name.toUpperCase()}`}
                className="text-terminal-green text-glitch mb-4 text-sm font-bold tracking-tighter uppercase"
              >
                // {group.name}
              </h3>

              {group.skills.map((skill) => (
                <ProgressBar
                  key={skill.id}
                  label={skill.name}
                  value={skill.level}
                />
              ))}
            </div>
          ))}
        </div>
      </section>
      <section id="projects" className="mb-20 scroll-mt-20">
        <h2 className="text-xl mb-8 flex items-center gap-2 uppercase tracking-widest border-b border-terminal-green/30 pb-2">
          <span className="text-terminal-green opacity-50">{">"}</span>
          <span className="text-glitch" data-text="PROJECTS">
            PROJECTS
          </span>
        </h2>

        {/* Сетка проектов */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length > 0 ? (
            projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          ) : (
            <div className="col-span-full py-10 border border-dashed border-terminal-green/20 text-center opacity-40 italic text-sm">
              [ No active projects found in database ]
            </div>
          )}
        </div>
      </section>
      <section id="experience" className="mb-24 scroll-mt-20">
        <h2 className="text-xl mb-12 flex items-center gap-2 uppercase tracking-widest border-b border-terminal-green/30 pb-2">
          <span className="text-terminal-green opacity-50">{">"}</span>
          <span className="text-glitch" data-text="EXPERIENCE_LOG">
            EXPERIENCE_LOG
          </span>
        </h2>

        {/* Передаем данные из Django в компонент */}
        <ExperienceTimeline experiences={experienceLogs} />
      </section>
      <section id="education" className="mb-24 scroll-mt-20">
        <h2 className="text-xl mb-12 flex items-center gap-2 uppercase tracking-widest border-b border-terminal-green/30 pb-2">
          <span className="text-terminal-green opacity-50">{">"}</span>
          <span className="text-glitch" data-text="FIRMWARE_LOG">
            FIRMWARE_LOG
          </span>
        </h2>

        <EducationMemory records={educationRecords} />
      </section>
      {/* СЕКЦИЯ CONTACT (CTA) */}
      <section id="contact" className="mb-32 scroll-mt-20">
        <ContactTerminal dictionary={dictionary.contact} />
      </section>
      {/* Эффект мерцания */}
      <div className="crt-overlay" />
    </main>
  );
}
