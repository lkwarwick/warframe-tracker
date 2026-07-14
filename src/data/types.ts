import { BaseItem, Buildable, Component } from "@wfcd/items";

export type Item = BaseItem & Buildable;

export type PrimePart = BaseItem & Buildable & Component & {
    parentName: string;
    componentName: string;
    parentUniqueName: string;
    componentUniqueName: string;
};