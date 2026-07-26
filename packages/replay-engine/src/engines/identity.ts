import { getDeviceId, getLastNickname, getLevelProgress } from "@game-platform/game-sdk";

export const Identity = {
  deviceId: getDeviceId,
  nickname: getLastNickname,
  level: getLevelProgress,
};
