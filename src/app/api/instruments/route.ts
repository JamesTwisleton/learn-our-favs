import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const instruments = await prisma.instrument.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(instruments);
}
