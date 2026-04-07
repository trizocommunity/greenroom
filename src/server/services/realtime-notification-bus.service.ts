import { EventEmitter } from "events";

export type NotificationStreamEvent = {
  eventId?: string;
  festivalId: string;
  recipientStudentId?: string;
  recipientUserId?: string;
  type: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  rooms?: string[];
};

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

const EVENT_NAME = "programme-notification";

export const RealtimeNotificationBus = {
  publish(event: NotificationStreamEvent) {
    emitter.emit(EVENT_NAME, event);
  },
  subscribe(
    listener: (event: NotificationStreamEvent) => void,
    options?: { rooms?: string[]; studentId?: string | null },
  ) {
    emitter.on(EVENT_NAME, listener);
    return () => {
      emitter.off(EVENT_NAME, listener);
    };
  },
};
