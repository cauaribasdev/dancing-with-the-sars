import { useEffect } from 'react';
import { BrowseImageLayer, useBrowseImage } from './BrowseImageLayer';

export function DailyImageLayer({ passId, opacity, beforeId, onStatus }: { passId: string; opacity: number; beforeId: string; onStatus: (id: string, status: string) => void }) {
    const image = useBrowseImage(passId);
    useEffect(() => onStatus(passId, image.status), [passId, image.status, onStatus]);
    return <BrowseImageLayer image={image} id={'daily-' + passId} opacity={opacity} beforeId={beforeId} />;
}
