/** Notification engine — stub for Growth OS integration. */

export const Notification = {
  send: async (_userId: string, _message: string) => ({ sent: false, reason: "stub" }),
  subscribe: (_topic: string) => () => {},
};
