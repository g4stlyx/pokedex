//* helpers

// Format Pokemon ID to display with leading zeros
function formatPokemonId(id) {
    return `#${id.toString().padStart(3, '0')}`;
}

// Create a type badge element
function createTypeBadge(type) {
    return `<span class="type-badge type-${type}">${type}</span>`;
}

// Get proper image URL for a Pokemon
function getPokemonImageUrl(pokemon) {
    // Try to get official artwork first
    if (pokemon.sprites && pokemon.sprites.other && pokemon.sprites.other['official-artwork'] && 
        pokemon.sprites.other['official-artwork'].front_default) {
        return pokemon.sprites.other['official-artwork'].front_default;
    }
    
    // Fall back to default sprite
    if (pokemon.sprites && pokemon.sprites.front_default) {
        return pokemon.sprites.front_default;
    }
    
    // Fall back to a placeholder
    return 'https://via.placeholder.com/150?text=Pokemon';
}

// Format stat name to be more readable
function formatStatName(statName) {
    return statName
        .replace('-', ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Get URL parameter by name
function getUrlParam(paramName) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(paramName);
}

// Format height from decimeters to meters and feet/inches
function formatHeight(height) {
    const meters = height / 10;
    const feet = Math.floor(meters * 3.28084);
    const inches = Math.round((meters * 3.28084 - feet) * 12);
    return `${meters.toFixed(1)}m (${feet}'${inches}")`;
}

// Format weight from hectograms to kilograms and pounds
function formatWeight(weight) {
    const kg = weight / 10;
    const lbs = Math.round(kg * 2.20462);
    return `${kg.toFixed(1)}kg (${lbs} lbs)`;
}