import { Document } from "../models/Document.js";

interface BufferItem {
    content: string;
    debounceTimer: NodeJS.Timeout | null;
    maxWaitTimer: NodeJS.Timeout | null;
    lastSaveAt: number;
}

class DocumentBufferService {
    private buffers: Map<string, BufferItem> = new Map(); // Store temporary buffers for each document

    private DEBOUNCE_DELAY = 3000;
    private MAX_WAIT_DELAY = 10000;

    public getBufferCount(): number {
        return this.buffers.size;
    }

    public updateDocument(docId: string, newContent: string){
        if(!this.buffers.has(docId)){
            this.buffers.set(docId, {
                content: newContent,
                debounceTimer: null,
                maxWaitTimer: null,
                lastSaveAt: Date.now()
            })
        }

        const item = this.buffers.get(docId)!;
        item.content = newContent; // Update the new content into the RAM

        // If the max wait timer has not been set, set it and flush it to the database
        if(!item?.maxWaitTimer) {
            item.maxWaitTimer = setTimeout(async () => {
                await this.flush(docId);
            }, this.MAX_WAIT_DELAY);
        }

        // Clear the old debounceTimer and set a new one
        if(item.debounceTimer) clearTimeout(item.debounceTimer);
        item.debounceTimer = setTimeout(async () => {
            await this.flush(docId);
        }, this.DEBOUNCE_DELAY);
    }

    // Flush the buffer to the database
    private async flush(docId: string){
        const item = this.buffers.get(docId);
        if (!item) return;

        // Clear the debounceTimer and maxWaitTimer to avoid double flushing
        if(item.debounceTimer) clearTimeout(item.debounceTimer);
        if(item.maxWaitTimer) clearTimeout(item.maxWaitTimer);

        try {
            // Update the document in the database
            await Document.findByIdAndUpdate(docId, {
                content: item.content,
                updatedAt: Date.now()
            });
            item.lastSaveAt = Date.now();
            console.log(`[Database] Đã lưu thành công Document ${docId} xuống MongoDB.`);
        } catch (error) {
            console.error(`[Database Error] Error updating document ${docId}: ${error}`);
        } finally {
            this.buffers.delete(docId);
        }
    }

    // In case the server restarts or crashed, flush all documents
    public async flushAll() {
        console.log(`[System] Flushing all documents...`);
        const promises = Array.from(this.buffers.keys()).map((docId) => this.flush(docId));
        await Promise.all(promises);
        console.log('[System] All documents flushed.');
    }
}

export const documentBuffer = new DocumentBufferService();