import { FestivalController } from "@/controllers/FestivalController";

export async function GET() {
  return FestivalController.index();
}

export async function POST(request: Request) {
  return FestivalController.store(request);
}
