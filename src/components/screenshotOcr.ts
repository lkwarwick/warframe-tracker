import { createWorker, PSM } from "tesseract.js";
import { all } from "../data/items";

type CatalogItem = {
    name: string;
    ducats?: number;
    itemCount?: number;
    itemUniqueName?: string;
    componentUniqueName?: string;
};

export type OcrMatch = {
    name: string;
    score: number;
    ducats?: number;
    itemCount?: number;
    itemUniqueName?: string;
    componentUniqueName?: string;
};

export type OcrCardResult = {
    text: string;
    matches: OcrMatch[];
};

export type OcrProgress = {
    card: number;
    totalCards: number;
    status: string;
    progress: number;
};

const catalog = buildCatalog();
type OcrWorker = Awaited<ReturnType<typeof createWorker>>;
let workerPoolPromise: Promise<OcrWorker[]> | null = null;

function getWorkerPool(): Promise<OcrWorker[]> {
    if (workerPoolPromise) return workerPoolPromise;

    console.info("[ocr] Initializing worker pool.");

    workerPoolPromise = Promise.all(
        Array.from({ length: 4 }, () => createWorker("eng", 1)),
    )
        .then(async (workers) => {
            await Promise.all(workers.map((worker) => worker.setParameters({
                tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
                preserve_interword_spaces: "1",
            })));
            console.info(`[ocr] Worker pool ready with ${workers.length} workers.`);
            return workers;
        })
        .catch((error: unknown) => {
            workerPoolPromise = null;
            console.error("[ocr] Failed to initialize worker pool.", error);
            throw error;
        });

    return workerPoolPromise;
}

function buildCatalog(): CatalogItem[] {
    const names = new Set<string>();

    for (const item of all) {
        for (const component of item.components ?? []) {
            const ducats = (component as { ducats?: unknown }).ducats;
            if (typeof ducats === "number" && ducats >= 0) {
                names.add(JSON.stringify({
                    name: `${item.name} ${component.name}`,
                    ducats,
                    itemCount: component.itemCount,
                    itemUniqueName: item.uniqueName,
                    componentUniqueName: component.uniqueName,
                }));

            }
        }
    }
    names.add(JSON.stringify({ name: "Forma Blueprint" }));

    const result = [...names]
        .map((value) => JSON.parse(value) as CatalogItem)
        .filter((item) => item.name.trim().length >= 3);
    console.info(`[ocr] Catalog loaded with ${result.length} reward entries.`);
    return result;
}

function normalize(value: string): string {
    return value
        .toLowerCase()
        .replace(/\b\d+\s*x?\b/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function levenshtein(left: string, right: string): number {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    const current = new Array<number>(right.length + 1);

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        current[0] = leftIndex;
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
            current[rightIndex] = Math.min(
                current[rightIndex - 1] + 1,
                previous[rightIndex] + 1,
                substitution,
            );
        }
        for (let rightIndex = 0; rightIndex <= right.length; rightIndex += 1) previous[rightIndex] = current[rightIndex];
    }

    return previous[right.length];
}

function matchItem(text: string): OcrMatch[] {
    const normalizedText = normalize(text);
    if (!normalizedText) {
        console.warn("[ocr] No usable text after normalization.", { text });
        return [];
    }
    const textTokens = normalizedText.split(" ");

    const matches = catalog
        .map((item) => {
            const normalizedName = normalize(item.name);
            const nameTokens = normalizedName.split(" ");
            const tokenScores = nameTokens.map((nameToken) => {
                const closestTokenDistance = Math.min(
                    ...textTokens.map((textToken) => levenshtein(nameToken, textToken) / Math.max(nameToken.length, textToken.length)),
                );
                return closestTokenDistance;
            });
            const score = tokenScores.reduce((sum, tokenScore) => sum + tokenScore, 0) / tokenScores.length;
            return { ...item, score, tokenScores };
        })
        .filter((match) => match.tokenScores.every((tokenScore) => tokenScore <= 0.34))
        .sort((left, right) => left.score - right.score)
        .map(({ name, score, ducats, itemCount, itemUniqueName, componentUniqueName }) => ({
            name,
            score,
            ducats,
            itemCount,
            itemUniqueName,
            componentUniqueName,
        }))
        .slice(0, 3);

    if (matches.length === 0) {
        console.warn("[ocr] No catalog match for OCR text.", { text, normalizedText });
    } else {
        console.info("[ocr] Catalog candidates:", matches.map(({ name, score, componentUniqueName }) => ({ name, score, componentUniqueName })));
    }
    return matches;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => {
            console.error("[ocr] Screenshot image failed to load.", { dataUrlLength: dataUrl.length });
            reject(new Error("The screenshot could not be loaded for OCR."));
        };
        image.src = dataUrl;
    });
}

function createCardCrop(image: HTMLImageElement, cardIndex: number): HTMLCanvasElement {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const rewardLeft = sourceWidth * 0.273;
    const rewardWidth = sourceWidth * 0.454;
    const cardWidth = rewardWidth / 4;
    const crop = document.createElement("canvas");
    const sourceX = rewardLeft + cardIndex * cardWidth;
    const sourceY = sourceHeight * 0.347;
    const sourceCropWidth = cardWidth * 0.98;
    const sourceCropHeight = sourceHeight * 0.125;
    const scale = 4;

    crop.width = Math.round(sourceCropWidth * scale);
    crop.height = Math.round(sourceCropHeight * scale);
    const context = crop.getContext("2d");
    if (!context) {
        console.error(`[ocr] Could not create OCR canvas for card ${cardIndex + 1}.`);
        throw new Error("Could not create an OCR canvas.");
    }

    context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceCropWidth,
        sourceCropHeight,
        0,
        0,
        crop.width,
        crop.height,
    );

    return crop;
}

export async function recognizeScreenshot(
    dataUrl: string,
    onProgress: (progress: OcrProgress) => void,
): Promise<OcrCardResult[]> {
    console.info("[ocr] Starting screenshot recognition.");
    const image = await loadImage(dataUrl);
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
        console.error("[ocr] Loaded screenshot has invalid dimensions.", { width: image.naturalWidth, height: image.naturalHeight });
        throw new Error("The screenshot has invalid dimensions.");
    }
    const workers = await getWorkerPool();
    return await Promise.all(workers.map(async (worker, cardIndex) => {
        try {
            onProgress({ card: cardIndex + 1, totalCards: 4, status: "Recognizing reward", progress: 0 });
            const crop = createCardCrop(image, cardIndex);
            const result = await worker.recognize(crop);
            const text = result.data.text.trim();
            onProgress({ card: cardIndex + 1, totalCards: 4, status: "Recognized reward", progress: 1 });
            console.info(`[ocr] Card ${cardIndex + 1} recognized.`, { text });
            return { text, matches: matchItem(text) };
        } catch (error) {
            console.error(`[ocr] Card ${cardIndex + 1} recognition failed.`, error);
            throw error;
        }
    }));
}
