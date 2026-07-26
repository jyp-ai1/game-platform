/** Logic Marketplace — plug-in systems (Inventory, Save, Quest, etc.). */

export type LogicModuleId =
  | "inventory" | "save" | "achievement" | "ads" | "ranking"
  | "stage" | "quest" | "mission" | "collection" | "cloud";

export interface LogicModule {
  id: LogicModuleId;
  label: string;
  description: string;
  sdkCall: string;
  downloads: number;
  price: number;
  currency: "free" | "coin";
}

export const LOGIC_MODULES: LogicModule[] = [
  { id: "inventory", label: "Inventory System", description: "아이템 수집 · 장착 · 사용", sdkCall: "Replay.logic.inventory()", downloads: 890, price: 0, currency: "free" },
  { id: "save", label: "Save System", description: "로컬 + 클라우드 세이브", sdkCall: "Replay.logic.save()", downloads: 1200, price: 0, currency: "free" },
  { id: "achievement", label: "Achievement System", description: "업적 · 배지 · 해금", sdkCall: "Replay.logic.achievement()", downloads: 760, price: 0, currency: "free" },
  { id: "ads", label: "Ads Integration", description: "보상형 · 배너 광고", sdkCall: "Replay.logic.ads()", downloads: 340, price: 200, currency: "coin" },
  { id: "ranking", label: "Ranking System", description: "일간 · 주간 · 친구 랭킹", sdkCall: "Replay.logic.ranking()", downloads: 980, price: 0, currency: "free" },
  { id: "stage", label: "Stage System", description: "스테이지 · 보스 · 진행", sdkCall: "Replay.logic.stage()", downloads: 650, price: 0, currency: "free" },
  { id: "quest", label: "Quest System", description: "퀘스트 · NPC · 보상", sdkCall: "Replay.logic.quest()", downloads: 420, price: 150, currency: "coin" },
  { id: "mission", label: "Mission Pack", description: "일일 · 주간 미션", sdkCall: "Replay.logic.mission()", downloads: 510, price: 0, currency: "free" },
  { id: "collection", label: "Collection System", description: "도감 · 수집률", sdkCall: "Replay.logic.collection()", downloads: 380, price: 0, currency: "free" },
  { id: "cloud", label: "Cloud Save Pro", description: "크로스 디바이스 클라우드", sdkCall: "Replay.logic.cloud()", downloads: 290, price: 300, currency: "coin" },
];

export function getLogicModule(id: LogicModuleId): LogicModule | null {
  return LOGIC_MODULES.find((m) => m.id === id) ?? null;
}
