import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { constantTimeEqual } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    // R5.4: настроенный секрет отсутствует/пуст → 401 БЕЗ сравнения и БЕЗ ревалидации.
    const configured = process.env.REVALIDATION_SECRET;
    if (!configured) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json();
    const provided = typeof payload?.secret === "string" ? payload.secret : "";
    const tags = payload?.tags;

    // R3.3, R5.5: сравнение секрета за постоянное время; несовпадение → 401, кэш не трогаем.
    if (!constantTimeEqual(provided, configured)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // R3.4: tags должен быть непустым массивом, иначе 400, кэш не трогаем.
    if (!Array.isArray(tags) || tags.length === 0) {
      return NextResponse.json({ message: "Invalid tags" }, { status: 400 });
    }

    // R3.2: инвалидируем кэш для каждого тега и возвращаем список тегов.
    for (const tag of tags) {
      revalidateTag(tag, "max");
    }

    return NextResponse.json({ revalidated: true, tags });
  } catch {
    // Любая необработанная ошибка → 500.
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 },
    );
  }
}
