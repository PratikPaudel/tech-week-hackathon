// Filename: lib/embeddings.ts
import { useAIStore } from './store';

// Use a Singleton pattern to ensure we only create one worker instance.
class WorkerSingleton {
    private static worker: Worker | null = null;

    static getInstance() {
        if (!this.worker) {
            this.worker = new Worker('/embedding-worker.js', {
                type: 'module', // CRITICAL: Set the worker type to 'module'
            });

            // Listen for messages from the worker
            this.worker.onmessage = (event) => {
                const message = event.data;
                const aiState = useAIStore.getState();

                if (message.status === 'progress') {
                    // Update loading progress
                    if (aiState.status !== 'loading') {
                        aiState.setStatus('loading');
                    }
                    aiState.setProgress(message.progress);
                } else if (message.status === 'ready' || (message.status === 'done' && message.file.endsWith('onnx.bin'))) {
                    // Model is loaded and ready
                    if (aiState.status !== 'ready') {
                        aiState.setStatus('ready');
                    }
                }
            };

            this.worker.onerror = (error) => {
                console.error('Web Worker error:', error);
                useAIStore.getState().setStatus('error');
            };
        }
        return this.worker;
    }
}

/**
 * Generates an embedding for the given text using a Web Worker.
 * @param text The text to generate an embedding for.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    const worker = WorkerSingleton.getInstance();

    return new Promise((resolve, reject) => {
        const messageListener = (event: MessageEvent) => {
            if (event.data.status === 'complete') {
                worker.removeEventListener('message', messageListener);
                resolve(event.data.output);
            } else if (event.data.status === 'error') {
                worker.removeEventListener('message', messageListener);
                console.error("Embedding generation failed in worker:", event.data.error);
                reject(new Error(event.data.error));
            }
        };

        const errorListener = (error: ErrorEvent) => {
            worker.removeEventListener('message', messageListener);
            worker.removeEventListener('error', errorListener);
            reject(error.message);
        };

        worker.addEventListener('message', messageListener);
        worker.addEventListener('error', errorListener);

        // Send the text to the worker to start the process
        worker.postMessage({ text });
    });
}

// Cleanup function to terminate the worker
export function cleanupEmbeddings(): void {
    if (WorkerSingleton['worker']) {
        WorkerSingleton['worker'].terminate();
        WorkerSingleton['worker'] = null;
    }
}
