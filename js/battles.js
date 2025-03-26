// Battle simulator using PokeAPI data

let playerPokemon = null;
let opponentPokemon = null;

// DOM elements
const selectPokemon1Btn = document.getElementById('selectPokemon1');
const selectPokemon2Btn = document.getElementById('selectPokemon2');
const playerPokemonContainer = document.getElementById('player-pokemon');
const opponentPokemonContainer = document.getElementById('opponent-pokemon');
const battleControls = document.getElementById('battle-controls');
const moveButtons = document.getElementById('move-buttons');
const battleLog = document.getElementById('battle-log');

// Event listeners
selectPokemon1Btn.addEventListener('click', selectPlayerPokemon);
selectPokemon2Btn.addEventListener('click', selectOpponentPokemon);

// Functions to fetch Pokemon data and setup battle
async function selectPlayerPokemon() {
    const pokemonName = document.getElementById('pokemon1').value.toLowerCase().trim();
    if (!pokemonName) return;
    
    try {
        // Show loading
        playerPokemonContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-success"></div></div>';
        
        // Fetch Pokemon data
        const pokemon = await fetchPokemonWithMoves(pokemonName);
        playerPokemon = {
            ...pokemon,
            currentHP: pokemon.stats.hp,
            maxHP: pokemon.stats.hp
        };
        
        // Render player Pokemon
        renderPokemon(playerPokemon, playerPokemonContainer, 'player');
        
        checkBattleReady();
    } catch (error) {
        playerPokemonContainer.innerHTML = `<div class="alert alert-danger">Pokemon not found</div>`;
        console.error('Error fetching Pokemon:', error);
    }
}

async function selectOpponentPokemon() {
    const pokemonName = document.getElementById('pokemon2').value.toLowerCase().trim();
    if (!pokemonName) return;
    
    try {
        // Show loading
        opponentPokemonContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-danger"></div></div>';
        
        // Fetch Pokemon data
        const pokemon = await fetchPokemonWithMoves(pokemonName);
        opponentPokemon = {
            ...pokemon,
            currentHP: pokemon.stats.hp,
            maxHP: pokemon.stats.hp
        };
        
        // Render opponent Pokemon
        renderPokemon(opponentPokemon, opponentPokemonContainer, 'opponent');
        
        checkBattleReady();
    } catch (error) {
        opponentPokemonContainer.innerHTML = `<div class="alert alert-danger">Pokemon not found</div>`;
        console.error('Error fetching Pokemon:', error);
    }
}

async function fetchPokemonWithMoves(nameOrId) {
    // Fetch basic Pokemon data
    const pokemonData = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`).then(res => res.json());
    
    // Prepare Pokemon object with relevant battle data
    const pokemon = {
        id: pokemonData.id,
        name: pokemonData.name,
        image: pokemonData.sprites.other['official-artwork'].front_default || pokemonData.sprites.front_default,
        types: pokemonData.types.map(t => t.type.name),
        stats: {
            hp: pokemonData.stats.find(s => s.stat.name === 'hp').base_stat,
            attack: pokemonData.stats.find(s => s.stat.name === 'attack').base_stat,
            defense: pokemonData.stats.find(s => s.stat.name === 'defense').base_stat,
            speed: pokemonData.stats.find(s => s.stat.name === 'speed').base_stat
        },
        // Get the first 6 moves (or fewer if the Pokemon has less than 4)
        moves: []
    };
    
    // Fetch move details for the first 6 moves
    const movePromises = pokemonData.moves.slice(0, 6).map(moveEntry => 
        fetch(moveEntry.move.url).then(res => res.json())
    );
    
    const movesData = await Promise.all(movePromises);
    
    pokemon.moves = movesData.map(move => ({
        name: move.name,
        power: move.power || 0,
        type: move.type.name,
        accuracy: move.accuracy || 100,
        damageClass: move.damage_class.name
    }));
    
    return pokemon;
}

// Fix for enemy HP not dropping - updating key functions

// 1. Fix the calculateDamage function to ensure it returns a proper damage value
function calculateDamage(attacker, defender, move) {
    // Simple damage formula based on Pokemon stats and move power
    if (move.power === 0 || !move.power) return 5; // Default minimum damage for moves with no power
    
    // Base damage calculation
    let damage = ((2 * 50 / 5) + 2) * move.power * (attacker.stats.attack / defender.stats.defense) / 50 + 2;
    
    // Type effectiveness (simplified)
    let effectiveness = { multiplier: 1, message: "" };
    
    // Apply random factor (between 0.85 and 1.0)
    damage = damage * (0.85 + Math.random() * 0.15);
    
    // Round to integer
    return Math.max(1, Math.floor(damage)); // Ensure at least 1 damage is done
}

// 2. Fix the useMove function to properly apply damage
function useMove(moveName) {
    const move = playerPokemon.moves.find(m => m.name === moveName);
    if (!move) return;
    
    // Calculate damage - make sure we get a number
    const damage = calculateDamage(playerPokemon, opponentPokemon, move);
    
    // Apply damage - make sure it's reducing the HP
    opponentPokemon.currentHP = Math.max(0, opponentPokemon.currentHP - damage);
    console.log(`Damage dealt: ${damage}, Opponent HP: ${opponentPokemon.currentHP}/${opponentPokemon.maxHP}`);
    
    // Add attack animation
    const opponentElement = opponentPokemonContainer.querySelector('.pokemon-card');
    opponentElement.classList.add('attack-animation');
    setTimeout(() => opponentElement.classList.remove('attack-animation'), 500);
    
    // Update battle log with GREEN color for player moves
    battleLog.innerHTML = `
        <p class="player-move">
            <span class="text-success fw-bold">${capitalizeFirstLetter(playerPokemon.name)}</span> used 
            <span class="text-primary">${capitalizeFirstLetter(move.name.replace('-', ' '))}</span> for 
            <span class="text-success fw-bold">${damage}</span> damage!
        </p>` + battleLog.innerHTML;
    
    // Re-render opponent Pokemon with updated HP
    renderPokemon(opponentPokemon, opponentPokemonContainer, 'opponent');
    
    // Check if battle is over
    if (opponentPokemon.currentHP <= 0) {
        battleLog.innerHTML = `<p class="battle-result"><span class="text-success fw-bold">💥 ${capitalizeFirstLetter(playerPokemon.name)} wins! 🏆</span></p>` + battleLog.innerHTML;
        disableMoveButtons();
        return;
    }
    
    // Opponent's turn
    setTimeout(() => {
        opponentTurn();
    }, 1000);
}

// 3. Fix the opponentTurn function for consistency
function opponentTurn() {
    // Choose a random move for the opponent
    const randomMove = opponentPokemon.moves[Math.floor(Math.random() * opponentPokemon.moves.length)];
    if (!randomMove) return;
    
    // Calculate damage
    const damage = calculateDamage(opponentPokemon, playerPokemon, randomMove);
    
    // Apply damage
    playerPokemon.currentHP = Math.max(0, playerPokemon.currentHP - damage);
    console.log(`Opponent damage dealt: ${damage}, Player HP: ${playerPokemon.currentHP}/${playerPokemon.maxHP}`);
    
    // Add attack animation
    const playerElement = playerPokemonContainer.querySelector('.pokemon-card');
    playerElement.classList.add('attack-animation');
    setTimeout(() => playerElement.classList.remove('attack-animation'), 500);
    
    // Update battle log with RED color for opponent moves
    battleLog.innerHTML = `
        <p class="opponent-move">
            <span class="text-danger fw-bold">${capitalizeFirstLetter(opponentPokemon.name)}</span> used 
            <span class="text-primary">${capitalizeFirstLetter(randomMove.name.replace('-', ' '))}</span> for 
            <span class="text-danger fw-bold">${damage}</span> damage!
        </p>` + battleLog.innerHTML;
    
    // Re-render player Pokemon with updated HP
    renderPokemon(playerPokemon, playerPokemonContainer, 'player');
    
    // Check if battle is over
    if (playerPokemon.currentHP <= 0) {
        battleLog.innerHTML = `<p class="battle-result"><span class="text-danger fw-bold">💥 ${capitalizeFirstLetter(opponentPokemon.name)} wins! 🏆</span></p>` + battleLog.innerHTML;
        disableMoveButtons();
    }
}

// 4. Ensure the renderPokemon function correctly shows HP changes
function renderPokemon(pokemon, container, side) {
    const hpPercentage = (pokemon.currentHP / pokemon.maxHP) * 100;
    const hpColorClass = side === 'player' ? 'player-hp' : 'opponent-hp';
    
    container.innerHTML = `
        <div class="pokemon-card ${side}">
            <h3 class="text-center">${capitalizeFirstLetter(pokemon.name)}</h3>
            <div class="text-center mb-3">
                <img src="${pokemon.image}" alt="${pokemon.name}" class="img-fluid" style="max-height: 150px;">
            </div>
            <div class="types mb-2 d-flex justify-content-center gap-2">
                ${pokemon.types.map(type => `<span class="badge bg-${getTypeColor(type)}">${capitalizeFirstLetter(type)}</span>`).join('')}
            </div>
            <div class="stats">
                <div class="d-flex justify-content-between">
                    <span>HP: ${pokemon.currentHP}/${pokemon.maxHP}</span>
                    ${pokemon.currentHP < pokemon.maxHP * 0.2 ? `<span class="text-danger fw-bold">Low HP!</span>` : ''}
                </div>
                <div class="hp-bar">
                    <div class="hp-bar-fill ${hpColorClass}" style="width: ${hpPercentage}%"></div>
                </div>
                <div>Attack: ${pokemon.stats.attack}</div>
                <div>Defense: ${pokemon.stats.defense}</div>
                <div>Speed: ${pokemon.stats.speed}</div>
            </div>
        </div>
    `;
}

function checkBattleReady() {
    if (playerPokemon && opponentPokemon) {
        battleControls.style.display = 'block';
        renderMoveButtons();
        battleLog.innerHTML = `<p>Battle started! ${capitalizeFirstLetter(playerPokemon.name)} vs ${capitalizeFirstLetter(opponentPokemon.name)}</p>`;
    }
}

function renderMoveButtons() {
    moveButtons.innerHTML = playerPokemon.moves.map(move => 
        `<button class="btn btn-outline-${getTypeColor(move.type)} move-button" data-move="${move.name}">
            ${capitalizeFirstLetter(move.name.replace('-', ' '))}
            ${move.power ? `<span class="badge bg-${getTypeColor(move.type)}">Power: ${move.power}</span>` : ''}
        </button>`
    ).join('');
    
    // Add event listeners to move buttons
    document.querySelectorAll('.move-button').forEach(button => {
        button.addEventListener('click', () => useMove(button.dataset.move));
    });
}

function getTypeEffectiveness(moveType, defenderTypes) {
    // This is a simplified version. In a full game, you'd want to use the complete type chart
    const typeChart = {
        // Super effective relationships (simplified)
        'water': { 'fire': 2, 'ground': 2, 'rock': 2 },
        'fire': { 'grass': 2, 'ice': 2, 'bug': 2, 'steel': 2 },
        'grass': { 'water': 2, 'ground': 2, 'rock': 2 },
        'electric': { 'water': 2, 'flying': 2 },
        // Not very effective relationships (simplified)
        'water': { 'water': 0.5, 'grass': 0.5, 'dragon': 0.5 },
        'fire': { 'fire': 0.5, 'water': 0.5, 'rock': 0.5, 'dragon': 0.5 },
        'grass': { 'fire': 0.5, 'grass': 0.5, 'poison': 0.5, 'flying': 0.5, 'bug': 0.5, 'dragon': 0.5, 'steel': 0.5 },
        'electric': { 'electric': 0.5, 'grass': 0.5, 'dragon': 0.5 }
    };
    
    // Initialize effectiveness
    let multiplier = 1;
    let message = '';
    
    // Check effectiveness against each defender type
    defenderTypes.forEach(defenderType => {
        if (typeChart[moveType] && typeChart[moveType][defenderType]) {
            multiplier *= typeChart[moveType][defenderType];
        }
    });
    
    // Set the appropriate message
    if (multiplier > 1) {
        message = "It's super effective!";
    } else if (multiplier < 1) {
        message = "It's not very effective...";
    } else if (multiplier === 0) {
        message = "It had no effect.";
    }
    
    return { multiplier, message };
}

function disableMoveButtons() {
    document.querySelectorAll('.move-button').forEach(button => {
        button.disabled = true;
    });
}

function getTypeColor(type) {
    const typeColors = {
        normal: 'secondary',
        fire: 'danger',
        water: 'primary',
        electric: 'warning',
        grass: 'success',
        ice: 'info',
        fighting: 'danger',
        poison: 'purple',
        ground: 'warning',
        flying: 'info',
        psychic: 'danger',
        bug: 'success',
        rock: 'secondary',
        ghost: 'purple',
        dragon: 'primary',
        dark: 'dark',
        steel: 'secondary',
        fairy: 'pink'
    };
    
    return typeColors[type] || 'secondary';
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}