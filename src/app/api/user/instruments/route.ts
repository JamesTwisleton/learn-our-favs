import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { spotifyId: session.user.id },
    include: {
      instruments: {
        include: { instrument: true },
      },
    },
  });

  return NextResponse.json(user?.instruments || []);
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { spotifyId: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const { instruments } = body as {
    instruments: {
      instrumentId: string;
      skillLevel: string;
      playStyle?: string;
    }[];
  };

  // Delete existing and recreate
  await prisma.userInstrument.deleteMany({
    where: { userId: user.id },
  });

  const created = await Promise.all(
    instruments.map((inst) =>
      prisma.userInstrument.create({
        data: {
          userId: user.id,
          instrumentId: inst.instrumentId,
          skillLevel: inst.skillLevel as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
          playStyle: inst.playStyle as "CHORDS" | "FINGERPICKING" | "STRUMMING" | "LEAD" | "RHYTHM" | "ACCOMPANIMENT" | "FULL_SCORE" | undefined,
        },
        include: { instrument: true },
      })
    )
  );

  return NextResponse.json(created);
}
