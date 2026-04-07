import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Server as SocketIOServer } from "socket.io";
import { Server } from "socket.io";
import { realtimeConfig } from "@/lib/realtime-config";
import { authorizeRealtimeRoomJoin } from "@/server/realtime/authz";
import { realtimeObservability } from "@/server/realtime/observability";
import { resolveRealtimePrincipal } from "@/server/realtime/principal";
import { getRealtimeRedisClient } from "@/server/realtime/redis";

const globalForSocket = globalThis as unknown as {
  io?: SocketIOServer;
};

export async function getOrCreateSocketServer(httpServer: HttpServer) {
  if (globalForSocket.io) return globalForSocket.io;

  const io = new Server(httpServer, {
    path: "/api/realtime/socket",
    transports: ["websocket", "polling"],
    cors: { origin: true, credentials: true },
  });

  if (realtimeConfig.redisUrl) {
    const pub = await getRealtimeRedisClient();
    const sub = pub.duplicate();
    await sub.connect();
    io.adapter(createAdapter(pub, sub));
  }

  io.use(async (socket, next) => {
    try {
      const principal = await resolveRealtimePrincipal({
        judgeToken: String(socket.handshake.auth?.judgeToken ?? ""),
      });
      socket.data.principal = principal;
      return next();
    } catch (error) {
      return next(error as Error);
    }
  });

  io.on("connection", (socket) => {
    realtimeObservability.transportConnected("socket", {
      socketId: socket.id,
      principalType: socket.data.principal?.principalType ?? "anonymous",
    });

    socket.on("realtime:join", async (room: string) => {
      const allowed = authorizeRealtimeRoomJoin(
        socket.data.principal ?? null,
        room,
      );
      if (!allowed) {
        socket.emit("realtime:error", { code: "forbidden_room", room });
        return;
      }
      await socket.join(room);
      socket.emit("realtime:joined", { room });
    });

    socket.on("disconnect", (reason) => {
      realtimeObservability.transportDisconnected("socket", {
        socketId: socket.id,
        reason,
      });
    });
  });

  globalForSocket.io = io;
  return io;
}
