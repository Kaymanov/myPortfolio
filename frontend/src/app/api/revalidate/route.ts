import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const secret = payload?.secret;
    const tags = payload?.tags;

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (!tags || !Array.isArray(tags)) {
      return NextResponse.json({ message: 'Missing tags' }, { status: 400 });
    }

    for (const tag of tags) {
      revalidateTag(tag, "max" as any);
    }

    return NextResponse.json({ revalidated: true, now: Date.now(), tags });
  } catch (err) {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
