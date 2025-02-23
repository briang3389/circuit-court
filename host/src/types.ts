export enum GamePhase {
    MAIN_MENU,
    JUDGE_TALKING,
    PROSECUTOR_TALKING,
    DEFENSE_TALKING,
}

export type Role = "Prosecutor" | "Defense" | null;
export type Speaker = "Judge" | "Prosecutor" | "Defense";
