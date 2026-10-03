import { familyIdSchema } from "@/features/families/schemas";
import { requireFamilyMember } from "@/server/auth/authorization";
import { requireUser } from "@/server/auth/session";
import { AppError, errorResponse } from "@/server/http/api-error";
import { subscribeFamilyEvents } from "@/server/realtime/family-events";
import { encodeSseMessage } from "@/server/realtime/publish";

type RouteContext = {
  params: Promise<{ familyId: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requireUser();
    const { familyId } = await context.params;
    const parsedFamilyId = familyIdSchema.safeParse(familyId);
    if (!parsedFamilyId.success) {
      throw new AppError(404, "FAMILY_NOT_FOUND", "Family was not found.");
    }

    await requireFamilyMember(user.id, parsedFamilyId.data);

    const deviceFilter = new URL(request.url).searchParams.get("deviceId");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        let closed = false;

        const sendRaw = (chunk: string) => {
          if (closed) {
            return;
          }
          controller.enqueue(encoder.encode(chunk));
        };

        sendRaw(`event: ready\ndata: ${JSON.stringify({ familyId: parsedFamilyId.data })}\n\n`);

        const unsubscribe = subscribeFamilyEvents(parsedFamilyId.data, (event) => {
          if (deviceFilter) {
            const eventDeviceId =
              event.type === "CommandResult" ? event.command.deviceId : event.deviceId;
            if (eventDeviceId !== deviceFilter) {
              return;
            }
          }
          sendRaw(encodeSseMessage(event));
        });

        const heartbeat = setInterval(() => {
          sendRaw(`: heartbeat ${Date.now()}\n\n`);
        }, 15000);

        const close = () => {
          if (closed) {
            return;
          }
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {
            // already closed
          }
        };

        request.signal.addEventListener("abort", close);
      },
      cancel() {
        // abort handler closes resources
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
