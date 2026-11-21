import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true });
    const session = await getIronSession<IronSessionData>(
      request,
      response,
      sessionOptions
    );
    session.destroy();
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "حدث خطأ أثناء تسجيل الخروج" },
      { status: 500 }
    );
  }
}
