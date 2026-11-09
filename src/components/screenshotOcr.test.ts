import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas, Image } from "@napi-rs/canvas";
import { expect, it } from "vitest";
import { recognizeScreenshot } from "./screenshotOcr";

Object.defineProperty(globalThis, "Image", { configurable: true, value: Image });
Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
        createElement(tagName: string) {
            if (tagName !== "canvas") {
                throw new Error(`Unsupported test element: ${tagName}`);
            }
            return createCanvas(1, 1);
        },
    },
});

const screenshotCases = [
    {
        imagePath: "./__fixtures__/rewards-forma.jpg",  // 4 Rewards, 2 Forma
        fileName: "rewards-forma.jpg",
        expectedItems: [
            "Forma Blueprint",
            "Lex Prime Barrel",
            "Akbronco Prime Link",
            "Forma Blueprint",
        ],
    },
    {
        imagePath: "./__fixtures__/rewards-long-forma.jpg",  // 4 Rewards, 1 Forma, 1 Two-Lines
        fileName: "rewards-long-forma.jpg",
        expectedItems: [
            "Vadarya Prime Stock",
            "Steflos Prime Receiver",
            "Forma Blueprint",
            "Nidus Prime Chassis Blueprint",
        ],
    },
    {
        imagePath: "./__fixtures__/rewards-long-three.jpg",  // 3 Rewards, 1 Two-Lines
        fileName: "rewards-long-three.jpg",
        expectedItems: [
            "Akbronco Prime Link",
            "Perigale Prime Stock",
            "Caliban Prime Neuroptics Blueprint",
        ],
    },
    {
        imagePath: "./__fixtures__/rewards-long-four.jpg",  // 4 Rewards, 1 Two-Lines
        fileName: "rewards-long-four.jpg",
        expectedItems: [
            "Daikyu Prime String",
            "Octavia Prime Systems Blueprint",
            "Fang Prime Handle",
            "Fang Prime Blueprint",
        ],
    },
    {
        imagePath: "./__fixtures__/warframe-0011.jpg",
        fileName: "warframe-0011.jpg",
        expectedItems: [
            "Paris Prime String",
            "Afuris Prime Barrel",
            "Kompressa Prime Blueprint",
            "Spira Prime Blueprint",
        ],
    },
    {
        imagePath: "./__fixtures__/warframe-0012.jpg",
        fileName: "warframe-0012.jpg",
        expectedItems: [
            "Paris Prime Upper Limb",
            "Kompressa Prime Blueprint",
            "Oberon Prime Chassis Blueprint",
            "Cedo Prime Receiver",
        ],
    },
    {
        imagePath: "./__fixtures__/warframe-0013.jpg",
        fileName: "warframe-0013.jpg",
        expectedItems: [
            "Braton Prime Blueprint",
            "Gyre Prime Chassis Blueprint",
            "Burston Prime Stock",
        ],
    },
];

it.each(screenshotCases)("recognizes reward cards in $fileName", async ({ fileName, imagePath, expectedItems }) => {
    const image = await readFile(new URL(imagePath, import.meta.url));
    const dataUrl = `data:image/jpeg;base64,${image.toString("base64")}`;
    const originalDirectory = process.cwd();
    const cacheDirectory = await mkdtemp(join(tmpdir(), "warframe-tracker-ocr-"));
    try {
        process.chdir(cacheDirectory);
        const results = await recognizeScreenshot(dataUrl, () => {});

        expect(results).toHaveLength(expectedItems.length);

        const extractedItems = results.map((result) => result.matches[0]?.name ?? null);
        expect(extractedItems).toEqual(expectedItems);
    } finally {
        process.chdir(originalDirectory);
        await rm(cacheDirectory, { recursive: true, force: true });
    }
});
