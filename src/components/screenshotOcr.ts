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

    workerPoolPromise = Promise.all(
        Array.from({ length: 4 }, () => createWorker("eng", 1)),
    )
        .then(async (workers) => {
            await Promise.all(workers.map((worker) => worker.setParameters({
                tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
                preserve_interword_spaces: "1",
            })));
            return workers;
        })
        .catch((error: unknown) => {
            workerPoolPromise = null;
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

    return [...names]
        .map((value) => JSON.parse(value) as CatalogItem)
        .filter((item) => item.name.trim().length >= 3);
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
    if (!normalizedText) return [];
    const textTokens = normalizedText.split(" ");

    return catalog
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
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("The screenshot could not be loaded for OCR."));
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
    if (!context) throw new Error("Could not create an OCR canvas.");

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
    const image = await loadImage(dataUrl);
    const workers = await getWorkerPool();
    return await Promise.all(workers.map(async (worker, cardIndex) => {
        onProgress({ card: cardIndex + 1, totalCards: 4, status: "Recognizing reward", progress: 0 });
        const crop = createCardCrop(image, cardIndex);
        const result = await worker.recognize(crop);
        const text = result.data.text.trim();
        onProgress({ card: cardIndex + 1, totalCards: 4, status: "Recognized reward", progress: 1 });
        return { text, matches: matchItem(text) };
    }));
}
