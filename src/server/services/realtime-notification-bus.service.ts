import { EventEmitter } from "events";

export type NotificationStreamEvent = {
  festivalId: string;
  recipientStudentId?: string;
  recipientUserId?: string;
  type: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

const EVENT_NAME = "programme-notification";

export const RealtimeNotificationBus = {
  publish(event: NotificationStreamEvent) {
    emitter.emit(EVENT_NAME, event);
  },
  subscribe(listener: (event: NotificationStreamEvent) => void) {
    emitter.on(EVENT_NAME, listener);
    return () => {
      emitter.off(EVENT_NAME, listener);
    };
  },
};
