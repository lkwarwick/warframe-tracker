import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

const FALLBACK_IMAGE = "/fallback-icon.png";
const thumbnailCache = new Map<string, Promise<string>>();

function getThumbnailUrl(imageName: string, size: number): Promise<string> {
    const key = `${imageName}|${size}`;
    let thumbnail = thumbnailCache.get(key);
    if (!thumbnail) {
        thumbnail = invoke<Uint8Array>("fetch_thumbnail", { imageName, size }).then((bytes) =>
            URL.createObjectURL(new Blob([bytes], { type: "image/png" })),
        );
        thumbnail.catch(() => thumbnailCache.delete(key));
        thumbnailCache.set(key, thumbnail);
    }
    return thumbnail;
}

interface ThumbnailImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
    imageName?: string;
    size: number;
}

export default function ThumbnailImage({ imageName, size, onError, onLoad, style, ...props }: ThumbnailImageProps) {
    const imageRef = useRef<HTMLImageElement>(null);
    const [src, setSrc] = useState(imageName ? undefined : FALLBACK_IMAGE);
    const sourceKey = `${imageName ?? ""}|${size}`;
    const [loadedSource, setLoadedSource] = useState<string>();

    useEffect(() => {
        let active = true;
        setSrc(imageName ? undefined : FALLBACK_IMAGE);
        if (!imageName) return () => { active = false; };

        const loadThumbnail = () => {
            void getThumbnailUrl(imageName, size).then(
                (thumbnailUrl) => {
                    if (active) setSrc(thumbnailUrl);
                },
                (error: unknown) => {
                    console.error(`Could not load thumbnail for ${imageName}:`, error);
                    if (active) setSrc(FALLBACK_IMAGE);
                },
            );
        };

        const element = imageRef.current;
        if (!element || !("IntersectionObserver" in window)) {
            loadThumbnail();
            return () => { active = false; };
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    observer.disconnect();
                    loadThumbnail();
                }
            },
            { rootMargin: "200px" },
        );
        observer.observe(element);
        return () => {
            active = false;
            observer.disconnect();
        };
    }, [imageName, size]);

    return (
        <img
            {...props}
            ref={imageRef}
            src={src}
            style={{ ...style, visibility: loadedSource === sourceKey ? style?.visibility : "hidden" }}
            onLoad={(event) => {
                setLoadedSource(sourceKey);
                onLoad?.(event);
            }}
            onError={(event) => {
                if (event.currentTarget.getAttribute("src") !== FALLBACK_IMAGE) {
                    setSrc(FALLBACK_IMAGE);
                }
                onError?.(event);
            }}
        />
    );
}
