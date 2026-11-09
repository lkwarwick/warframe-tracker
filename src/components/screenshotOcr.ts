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

function phraseDistance(name: string, textTokens: string[]): number {
    const normalizedName = normalize(name);
    const nameTokens = normalizedName.split(" ");
    const expected = textTokens.includes("blueprint") && !nameTokens.includes("blueprint")
        ? `${normalizedName} blueprint`.replace(/\s+/g, "")
        : normalizedName.replace(/\s+/g, "");
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let start = 0; start < textTokens.length; start += 1) {
        const minLength = Math.max(1, nameTokens.length - 1);
        const maxLength = Math.min(textTokens.length - start, nameTokens.length + 3);
        for (let length = minLength; length <= maxLength; length += 1) {
            const phrase = textTokens.slice(start, start + length).join("");
            const distance = levenshtein(expected, phrase) / Math.max(expected.length, phrase.length);
            bestDistance = Math.min(bestDistance, distance);
        }
    }

    return bestDistance;
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
            const phraseMatch = ` ${normalizedText} `.includes(` ${normalizedName} `);
            return { ...item, score, tokenScores, phraseMatch };
        })
        .filter((match) => match.tokenScores.every((tokenScore) => tokenScore <= 0.45))
        .map((match) => ({ ...match, phraseScore: phraseDistance(match.name, textTokens) }))
        .sort((left, right) => Number(right.phraseMatch) - Number(left.phraseMatch)
            || left.score - right.score
            || left.phraseScore - right.phraseScore)
        .map(({ name, score, phraseScore, ducats, itemCount, itemUniqueName, componentUniqueName }) => ({
            name: textTokens.includes("blueprint") && !normalize(name).split(" ").includes("blueprint")
                ? `${name} Blueprint`
                : name,
            score: score + phraseScore * 0.5,
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

function detectRewardCardCount(image: HTMLImageElement): 2 | 3 | 4 {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const scanY = Math.round(sourceHeight * 0.23);
    const scanHeight = Math.round(sourceHeight * 0.21);
    const scan = document.createElement("canvas");
    scan.width = sourceWidth;
    scan.height = scanHeight;

    const context = scan.getContext("2d");
    if (!context) {
        console.error("[ocr] Could not create card-layout detection canvas.");
        throw new Error("Could not detect the reward card layout.");
    }

    context.drawImage(image, 0, scanY, sourceWidth, scanHeight, 0, 0, sourceWidth, scanHeight);
    const pixels = context.getImageData(0, 0, sourceWidth, scanHeight).data;
    const edgeStrength = new Float64Array(sourceWidth);

    for (let y = 0; y < scanHeight; y += 1) {
        const firstIndex = y * sourceWidth * 4;
        let previousLuminance = pixels[firstIndex] * 0.2126
            + pixels[firstIndex + 1] * 0.7152
            + pixels[firstIndex + 2] * 0.0722;

        for (let x = 1; x < sourceWidth; x += 1) {
            const index = (y * sourceWidth + x) * 4;
            const luminance = pixels[index] * 0.2126
                + pixels[index + 1] * 0.7152
                + pixels[index + 2] * 0.0722;
            edgeStrength[x] += Math.abs(luminance - previousLuminance);
            previousLuminance = luminance;
        }
    }

    const cardWidth = sourceWidth * 0.454 / 4;
    const edgeRadius = Math.max(2, Math.round(sourceWidth * 0.002));
    const candidates = ([2, 3, 4] as const).map((cardCount) => {
        const rewardLeft = (sourceWidth - cardWidth * cardCount) / 2;
        const boundaryStrength = Array.from({ length: cardCount + 1 }, (_, index) => {
            const boundary = Math.round(rewardLeft + index * cardWidth);
            const start = Math.max(0, boundary - edgeRadius);
            const end = Math.min(sourceWidth - 1, boundary + edgeRadius);
            let strongest = 0;
            for (let x = start; x <= end; x += 1) {
                strongest = Math.max(strongest, edgeStrength[x]);
            }
            return strongest;
        });
        const score = boundaryStrength.reduce((sum, strength) => sum + strength, 0) / boundaryStrength.length;
        return { cardCount, score };
    });

    const bestCandidate = candidates.sort(
        (left, right) => right.score - left.score || right.cardCount - left.cardCount,
    )[0];
    if (!bestCandidate || bestCandidate.score < 2500) {
        console.warn("[ocr] Could not confidently detect reward card count; defaulting to four.");
        return 4;
    }

    console.info(`[ocr] Detected ${bestCandidate.cardCount} reward cards.`);
    return bestCandidate.cardCount;
}

function createCardCrop(image: HTMLImageElement, cardIndex: number, cardCount: number): HTMLCanvasElement {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const cardWidth = sourceWidth * 0.454 / 4;
    const rewardLeft = (sourceWidth - cardWidth * cardCount) / 2;
    const crop = document.createElement("canvas");
    const sourceX = rewardLeft + cardIndex * cardWidth;
    const sourceY = sourceHeight * 0.39;
    const sourceCropWidth = cardWidth * 0.98;
    const sourceCropHeight = sourceHeight * 0.05;
    const scale = 8;

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

function createBinarizedCrop(crop: HTMLCanvasElement): HTMLCanvasElement {
    const context = crop.getContext("2d");
    if (!context) {
        console.error("[ocr] Could not read OCR canvas pixels.");
        throw new Error("Could not preprocess an OCR image.");
    }

    const imageData = context.getImageData(0, 0, crop.width, crop.height);
    const histogram = new Uint32Array(256);
    const luminanceValues = new Uint8Array(crop.width * crop.height);
    for (let pixel = 0; pixel < luminanceValues.length; pixel += 1) {
        const index = pixel * 4;
        const luminance = Math.round(
            imageData.data[index] * 0.2126
            + imageData.data[index + 1] * 0.7152
            + imageData.data[index + 2] * 0.0722,
        );
        luminanceValues[pixel] = luminance;
        histogram[luminance] += 1;
    }

    const pixelCount = luminanceValues.length;
    let totalLuminance = 0;
    for (let level = 0; level < histogram.length; level += 1) {
        totalLuminance += level * histogram[level];
    }

    let backgroundWeight = 0;
    let backgroundLuminance = 0;
    let threshold = 127;
    let strongestSeparation = 0;
    for (let level = 0; level < histogram.length; level += 1) {
        backgroundWeight += histogram[level];
        if (backgroundWeight === 0) continue;
        const foregroundWeight = pixelCount - backgroundWeight;
        if (foregroundWeight === 0) break;

        backgroundLuminance += level * histogram[level];
        const backgroundMean = backgroundLuminance / backgroundWeight;
        const foregroundMean = (totalLuminance - backgroundLuminance) / foregroundWeight;
        const separation = backgroundWeight * foregroundWeight * (backgroundMean - foregroundMean) ** 2;
        if (separation > strongestSeparation) {
            strongestSeparation = separation;
            threshold = level;
        }
    }

    const binarized = document.createElement("canvas");
    binarized.width = crop.width;
    binarized.height = crop.height;
    const binarizedContext = binarized.getContext("2d");
    if (!binarizedContext) {
        console.error("[ocr] Could not create binarized OCR canvas.");
        throw new Error("Could not preprocess an OCR image.");
    }

    for (let pixel = 0; pixel < luminanceValues.length; pixel += 1) {
        const value = luminanceValues[pixel] > threshold ? 0 : 255;
        const index = pixel * 4;
        imageData.data[index] = value;
        imageData.data[index + 1] = value;
        imageData.data[index + 2] = value;
        imageData.data[index + 3] = 255;
    }
    binarizedContext.putImageData(imageData, 0, 0);
    return binarized;
}

async function recognizeCards(
    image: HTMLImageElement,
    workers: OcrWorker[],
    cardCount: number,
    onProgress: (progress: OcrProgress) => void,
): Promise<OcrCardResult[]> {
    return Promise.all(Array.from({ length: cardCount }, async (_, cardIndex) => {
        const worker = workers[cardIndex];
        try {
            onProgress({ card: cardIndex + 1, totalCards: cardCount, status: "Recognizing reward", progress: 0 });
            const crop = createCardCrop(image, cardIndex, cardCount);
            const variants = [crop, createBinarizedCrop(crop)];
            const attempts = [];
            for (const variant of variants) {
                const result = await worker.recognize(variant.toDataURL("image/png"));
                const text = result.data.text.trim();
                attempts.push({ text, matches: matchItem(text) });
            }
            const { text, matches } = attempts
                .sort((left, right) => (left.matches[0]?.score ?? Number.POSITIVE_INFINITY)
                    - (right.matches[0]?.score ?? Number.POSITIVE_INFINITY))[0];
            onProgress({ card: cardIndex + 1, totalCards: cardCount, status: "Recognized reward", progress: 1 });
            console.info(`[ocr] Card ${cardIndex + 1} recognized.`, { text });
            return { text, matches };
        } catch (error) {
            console.error(`[ocr] Card ${cardIndex + 1} recognition failed.`, error);
            throw error;
        }
    }));
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
    const cardCount = detectRewardCardCount(image);
    return recognizeCards(image, workers, cardCount, onProgress);
}
