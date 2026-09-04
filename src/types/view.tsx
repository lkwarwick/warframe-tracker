export type View = "foundry";
export type ItemGroup = "all" | "warframes" | "primaries" | "secondaries" | "melee" | "archwing" | "companions";
export type PrimeFilter = "all" | "prime-only" | "non-prime-only";
export type PrimePartEntry = {
	uniqueName: string;
	name: string;
	imageName?: string;
	ducats: number;
	owned: number;
	removeAmount: number;
};