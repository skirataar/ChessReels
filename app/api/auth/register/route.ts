import { NextRequest } from "next/server";
import { handleRegisterAccount } from "@/lib/registerAccount";

export async function POST(request: NextRequest) {
  return handleRegisterAccount(request);
}
