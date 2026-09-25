import type { BaseItem, Buildable } from "@wfcd/items";

export type ItemComponent = {
	uniqueName: string;
	name: string;
	itemCount: number;
	imageName?: string;
	ducats?: number;
};

export type Item = BaseItem & Omit<Buildable, "components"> & {
	components?: ItemComponent[];
};