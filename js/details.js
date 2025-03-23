// DOM elements
const loadingSpinner = document.getElementById('loadingSpinner');
const pokemonDetails = document.getElementById('pokemonDetails');
const pokemonImage = document.getElementById('pokemonImage');
const pokemonName = document.getElementById('pokemonName');
const pokemonTypes = document.getElementById('pokemonTypes');
const pokemonStats = document.getElementById('pokemonStats');
const pokemonHeight = document.getElementById('pokemonHeight');
const pokemonWeight = document.getElementById('pokemonWeight');
const pokemonAbilities = document.getElementById('pokemonAbilities');
const pokemonMoves = document.getElementById('pokemonMoves');

// init -useEffect in reactJS-
document.addEventListener('DOMContentLoaded', () => {
    loadPokemonDetails();
});

// ?name=gastly
async function loadPokemonDetails() {
    const pokemonName = getUrlParam('name');
    
    if (!pokemonName) {
        showError('No Pokemon specified.');
        return;
    }
    
    try {
        const pokemon = await pokeApi.getPokemonDetails(pokemonName);
        displayPokemonDetails(pokemon);
    } catch (error) {
        showError(`Failed to load details for ${pokemonName}`);
        console.error('Error loading Pokemon details:', error);
    }
}

function displayPokemonDetails(pokemon) {
    document.title = `${pokemon.name.toUpperCase()} | Pokemon Details`;

    // image and name
    pokemonImage.src = getPokemonImageUrl(pokemon);
    pokemonImage.alt = pokemon.name;
    pokemonName.textContent = `${pokemon.name} ${formatPokemonId(pokemon.id)}`;
    
    // types
    pokemonTypes.innerHTML = pokemon.types.map(type => 
        createTypeBadge(type.type.name)
    ).join('');
    
    // stats
    pokemonStats.innerHTML = pokemon.stats.map(stat => `
        <div class="mb-2">
            <div class="d-flex justify-content-between">
                <strong>${formatStatName(stat.stat.name)}</strong>
                <span>${stat.base_stat}/255</span>
            </div>
            <div class="progress stat-bar">
                <div class="progress-bar bg-success" role="progressbar" 
                     style="width: ${(stat.base_stat / 255) * 100}%" 
                     aria-valuenow="${stat.base_stat}" aria-valuemin="0" aria-valuemax="255">
                </div>
            </div>
        </div>
    `).join('');
    
    // physical attributes
    pokemonHeight.textContent = formatHeight(pokemon.height);
    pokemonWeight.textContent = formatWeight(pokemon.weight);
    
    // abilities
    pokemonAbilities.innerHTML = pokemon.abilities.map(ability => 
        `<li class="text-capitalize">${ability.ability.name.replace('-', ' ')}
         ${ability.is_hidden ? '<span class="text-muted">(Hidden)</span>' : ''}</li>`
    ).join('');
    
    // moves (show first 20 only)
    const movesList = pokemon.moves.slice(0, 20).map(move => 
        `<span class="badge bg-light text-dark p-2 m-1">${move.move.name.replace('-', ' ')}</span>`
    ).join('');
    pokemonMoves.innerHTML = `
        <div>${movesList}</div>
        <p class="text-muted mt-2">Showing ${Math.min(20, pokemon.moves.length)} of ${pokemon.moves.length} moves</p>
    `;
    
    // Show content, hide spinner
    loadingSpinner.style.display = 'none';
    pokemonDetails.style.display = 'flex';
}

function showError(message) {
    loadingSpinner.style.display = 'none';
    document.querySelector('.container').innerHTML += `
        <div class="alert alert-danger" role="alert">
            ${message}
            <br>
            <a href="index.html" class="alert-link">Return to Pokemon list</a>
        </div>
    `;
}