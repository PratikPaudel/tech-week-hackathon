import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1';

// Use the Singleton pattern to create the pipeline once.
class PipelineSingleton {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.onmessage = async (event) => {
    try {
        // Retrieve the pipeline. When called for the first time,
        // this will load the model and send progress updates to the main thread.
        const extractor = await PipelineSingleton.getInstance(x => {
            self.postMessage(x);
        });

        // Extract the embedding from the text
        const output = await extractor(event.data.text, { pooling: 'mean', normalize: true });

        // Send the output back to the main thread
        self.postMessage({
            status: 'complete',
            output: Array.from(output.data),
        });

    } catch (e) {
        self.postMessage({
            status: 'error',
            error: e.message,
        });
    }
};
