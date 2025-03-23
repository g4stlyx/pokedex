// API handler with in-memory caching functionality

class PokeAPI {
    constructor() {
        this.baseUrl = 'https://pokeapi.co/api/v2';
        this.cacheExpiration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        this.maxCacheSize = 100; // Maximum number of items to cache
        
        // In-memory cache using a JavaScript object
        this.cache = {};
        this.cacheKeys = []; // To track order for cache management
    }

    // Get data from cache or fetch from API
    async getData(endpoint) {
        const cachedData = this.getFromCache(endpoint);
        
        if (cachedData) {
            return cachedData;
        }
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            this.saveToCache(endpoint, data);
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    async getPokemonList(limit = 20, offset = 0) {
        return this.getData(`/pokemon?limit=${limit}&offset=${offset}`);
    }

    async getPokemonDetails(nameOrId) {
        return this.getData(`/pokemon/${nameOrId.toString().toLowerCase()}`);
    }

    // Save data to in-memory cache with timestamp
    saveToCache(key, data) {
        // If cache is at capacity, remove oldest item
        if (this.cacheKeys.length >= this.maxCacheSize) {
            const oldestKey = this.cacheKeys.shift();
            delete this.cache[oldestKey];
        }
        
        // Add new item to cache
        this.cache[key] = {
            data: data,
            timestamp: new Date().getTime()
        };
        
        // Add key to tracking array
        this.cacheKeys.push(key);
    }

    getFromCache(key) {
        const cacheItem = this.cache[key];
        
        if (!cacheItem) {
            return null;
        }
        
        const now = new Date().getTime();
        
        // If cache is expired, remove it and return null
        if (now - cacheItem.timestamp > this.cacheExpiration) {
            delete this.cache[key];
            this.cacheKeys = this.cacheKeys.filter(k => k !== key);
            return null;
        }
        
        return cacheItem.data;
    }

    clearCache() {
        this.cache = {};
        this.cacheKeys = [];
    }
}

// Create a singleton instance
const pokeApi = new PokeAPI();