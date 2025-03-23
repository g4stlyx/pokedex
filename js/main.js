// Global variables for pagination
let currentOffset = 0;
const limit = 20;

// DOM elements
const pokemonCardsContainer = document.getElementById('pokemonCards');
const loadingSpinner = document.getElementById('loadingSpinner');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');

// init
document.addEventListener('DOMContentLoaded', () => {
    loadPokemonList();
    
    // Event listeners
    prevBtn.addEventListener('click', loadPreviousPage);
    nextBtn.addEventListener('click', loadNextPage);
    searchButton.addEventListener('click', searchPokemon);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchPokemon();
        }
    });
});

// Load Pokemon list with current pagination
async function loadPokemonList() {
    showLoading(true);
    
    try {
        const response = await pokeApi.getPokemonList(limit, currentOffset);
        console.log(`Got list response with ${response.results.length} Pokemon`);
        updatePaginationButtons(response);

        pokemonCardsContainer.innerHTML = '';
        
        let successCount = 0;
        for (const pokemon of response.results) {
            try {
                console.log(`Fetching details for ${pokemon.name}...`);
                const details = await pokeApi.getPokemonDetails(pokemon.name);
                const pokemonCard = createPokemonCard(details);
                pokemonCardsContainer.appendChild(pokemonCard);
                successCount++;
            } catch (err) {
                console.error(`Error loading details for ${pokemon.name}:`, err);
            }
        }
        console.log(`Successfully loaded ${successCount} of ${response.results.length} Pokemon`);
    } catch (error) {
        showError('Failed to load Pokemon list. Please try again later.');
        console.error('Error loading Pokemon list:', error);
    } finally {
        showLoading(false);
    }
}

function createPokemonCard(pokemon) {
    const cardCol = document.createElement('div');
    cardCol.className = 'col-md-3 col-sm-6 mb-4';

    const typesBadges = pokemon.types.map(type => 
        createTypeBadge(type.type.name)
    ).join('');
    
    cardCol.innerHTML = `
        <div class="card pokemon-card h-100" data-name="${pokemon.name}">
            <div class="text-center p-3">
                <img src="${getPokemonImageUrl(pokemon)}" alt="${pokemon.name}" 
                     class="card-img-top pokemon-card-img">
            </div>
            <div class="card-body text-center">
                <h5 class="card-title text-capitalize">${pokemon.name}</h5>
                <p class="text-muted">${formatPokemonId(pokemon.id)}</p>
                <div>${typesBadges}</div>
            </div>
        </div>
    `;
    
    const card = cardCol.querySelector('.pokemon-card');
    card.addEventListener('click', () => {
        window.location.href = `pokemon.html?name=${pokemon.name}`;
    });
    
    return cardCol;
}

function updatePaginationButtons(response) {
    prevBtn.disabled = !response.previous;
    nextBtn.disabled = !response.next;
}

function loadPreviousPage() {
    if (currentOffset - limit >= 0) {
        currentOffset -= limit;
        loadPokemonList();
        window.scrollTo(0, 0);
    }
}

function loadNextPage() {
    currentOffset += limit;
    loadPokemonList();
    window.scrollTo(0, 0);
}

function showLoading(isLoading) {
    loadingSpinner.style.display = isLoading ? 'block' : 'none';
}

function showError(message) {
    pokemonCardsContainer.innerHTML = `
        <div class="col-12 text-center">
            <div class="alert alert-danger" role="alert">
                ${message}
            </div>
        </div>
    `;
}

//TODO: sadece ismi/id'yi direkt girince çalışıyor, gerçek bir arama (filtreleme) eklenebilir.
async function searchPokemon() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) return;
    
    showLoading(true);
    
    try {
        const pokemonDetails = await pokeApi.getPokemonDetails(searchTerm);
        
        // If successful, navigate to the detail page
        window.location.href = `pokemon.html?name=${pokemonDetails.name}`;
    } catch (error) {
        showError(`No Pokemon found with name "${searchTerm}"`);
        console.error('Error searching Pokemon:', error);
        showLoading(false);
    }
}