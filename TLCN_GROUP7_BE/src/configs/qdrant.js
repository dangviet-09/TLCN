const { QdrantClient } = require('@qdrant/js-client-rest');

// Qdrant configuration
const QDRANT_CONFIG = {
    host: process.env.QDRANT_HOST || 'localhost',
    port: process.env.QDRANT_PORT || 6333,
    apiKey: process.env.QDRANT_API_KEY,
};

class QdrantConfig {
    constructor() {
        // Chuẩn hóa host: Cắt bỏ http:// hoặc https:// nếu có
        const host = QDRANT_CONFIG.host.replace(/^https?:\/\//, '');
        // Tự động nhận diện: Nếu host là cloud (chứa qdrant.tech/qdrant.io) thì dùng https
        const protocol = (host.includes('qdrant.tech') || host.includes('qdrant.io')) ? 'https' : 'http';

        this.client = new QdrantClient({
            url: `${protocol}://${host}:${QDRANT_CONFIG.port}`,
            apiKey: QDRANT_CONFIG.apiKey,
            checkCompatibility: false // Skip version check
        });

        this.collections = {
            CAREER_PATHS: 'career_paths',
            LESSONS: 'lessons',
            TESTS: 'tests'
        };
    }

    async initializeCollections() {
        try {
            for (const [key, collectionName] of Object.entries(this.collections)) {
                await this.createCollectionIfNotExists(collectionName);
            }
        } catch (error) {
            console.error('Error initializing Qdrant collections:', error);
            throw error;
        }
    }

    async createCollectionIfNotExists(collectionName) {
        try {
            const collections = await this.client.getCollections();
            const exists = collections.collections?.some(c => c.name === collectionName);

            if (!exists) {
                await this.client.createCollection(collectionName, {
                    vectors: {
                        size: 1024, // Cohere embed-multilingual-v3.0 vector size
                        distance: 'Cosine'
                    }
                });
            }
        } catch (error) {
            console.error(`Error creating collection ${collectionName}:`, error);
            throw error;
        }
    }

    async testConnection() {
        try {
            // Thử lấy danh sách collections để test kết nối
            await this.client.getCollections();
            console.log('✅ Qdrant Database connected successfully');
            return true;
        } catch (error) {
            console.error('❌ Qdrant connection failed:', error.message);
            return false;
        }
    }

    getClient() {
        return this.client;
    }
}

module.exports = new QdrantConfig();