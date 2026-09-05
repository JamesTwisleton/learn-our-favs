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
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const favourites = await prisma.favouriteSong.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(favourites);
}

export async function POST(request: NextRequest) {
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
  const { spotifyTrackId, trackName, artistName, albumName, albumImageUrl } = body;

  // Toggle: if already favourited, remove; otherwise add
  const existing = await prisma.favouriteSong.findUnique({
    where: {
      userId_spotifyTrackId: { userId: user.id, spotifyTrackId },
    },
  });

  if (existing) {
    await prisma.favouriteSong.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ favourited: false });
  }

  await prisma.favouriteSong.create({
    data: {
      userId: user.id,
      spotifyTrackId,
      trackName,
      artistName,
      albumName,
      albumImageUrl,
    },
  });

  return NextResponse.json({ favourited: true });
}
