/**
 * JsonLd — вставляет блок структурированных данных schema.org (JSON-LD).
 *
 * Рендерится на сервере в <script type="application/ld+json">.
 * Невидим для пользователя, читается поисковыми роботами (Google, Yandex).
 *
 * Безопасность: данные сериализуются через JSON.stringify, а опасная
 * последовательность "</" экранируется, чтобы исключить выход из <script>.
 */
export const JsonLd = ({ data }: { data: Record<string, unknown> }) => {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
};
