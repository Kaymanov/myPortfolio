import { timingSafeEqual } from "node:crypto";

/**
 * Сравнивает две строки за постоянное время.
 *
 * Возвращает `true` тогда и только тогда, когда `a` побайтово равно `b`.
 * Сравнение оценивается независимо от позиции первого несовпадения
 * (через `node:crypto` `timingSafeEqual`), и длина не утекает раньше времени:
 * при разной длине всё равно выполняется `timingSafeEqual` (против самого
 * себя), после чего возвращается `false`.
 *
 * Validates: Requirements 5.3
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");

  // Уравниваем длины, чтобы сравнение оценивало все символы независимо
  // от позиции первого несовпадения и не утекало длину раньше времени.
  if (ba.length !== bb.length) {
    // Всё равно выполняем timingSafeEqual против самого себя, затем
    // возвращаем false (буферы разной длины бросили бы исключение).
    timingSafeEqual(ba, ba);
    return false;
  }

  return timingSafeEqual(ba, bb);
}
