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
        fileName: "rewards-forma.jpg",  // 4 Rewards, 2 Forma
        expectedItems: [
            "Forma Blueprint",
            "Lex Prime Barrel",
            "Akbronco Prime Link",
            "Forma Blueprint",
        ],
    },
    {
        fileName: "rewards-long-forma.jpg",  // 4 Rewards, 1 Forma, 1 Two-Lines
        expectedItems: [
            "Vadarya Prime Stock",
            "Steflos Prime Receiver",
            "Forma Blueprint",
            "Nidus Prime Chassis Blueprint",
        ],
    },
    {
        fileName: "rewards-long-three.jpg",  // 3 Rewards, 1 Two-Lines
        expectedItems: [
            "Akbronco Prime Link",
            "Perigale Prime Stock",
            "Caliban Prime Neuroptics Blueprint",
        ],
    },
    {
        fileName: "rewards-long-four.jpg",  // 4 Rewards, 1 Two-Lines
        expectedItems: [
            "Daikyu Prime String",
            "Octavia Prime Systems Blueprint",
            "Fang Prime Handle",
            "Fang Prime Blueprint",
        ],
    },
];

it.each(screenshotCases)("recognizes reward cards in $fileName", async ({ fileName, expectedItems }) => {
    const image = await readFile(new URL(`./__fixtures__/${fileName}`, import.meta.url));
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
