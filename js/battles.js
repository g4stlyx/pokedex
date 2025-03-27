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
const restartBattleBtn = document.getElementById('restart-battle');
const randomPokemon1Btn = document.getElementById('randomPokemon1');
const randomPokemon2Btn = document.getElementById('randomPokemon2');

// event listeners
document.addEventListener('DOMContentLoaded', () => {
    selectPokemon1Btn.addEventListener('click', selectPlayerPokemon);
    selectPokemon2Btn.addEventListener('click', selectOpponentPokemon);
    randomPokemon1Btn.addEventListener('click', selectRandomPlayerPokemon);
    randomPokemon2Btn.addEventListener('click', selectRandomOpponentPokemon);
    restartBattleBtn.addEventListener('click', restartBattle);
});

async function selectPlayerPokemon() {
    const pokemonName = document.getElementById('pokemon1').value.toLowerCase().trim();
    if (!pokemonName) return;
    
    try {
        playerPokemonContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-success"></div></div>';
        
        const pokemon = await fetchPokemonWithMoves(pokemonName);
        playerPokemon = {
            ...pokemon,
            currentHP: pokemon.stats.hp * 3, // Multiplied by 3 for longer battles
            maxHP: pokemon.stats.hp * 3      // Multiplied by 3 for longer battles
        };
        
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
        opponentPokemonContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-danger"></div></div>';
        
        const pokemon = await fetchPokemonWithMoves(pokemonName);
        opponentPokemon = {
            ...pokemon,
            currentHP: pokemon.stats.hp * 3, // Multiplied by 3 for longer battles
            maxHP: pokemon.stats.hp * 3      // Multiplied by 3 for longer battles
        };
        
        renderPokemon(opponentPokemon, opponentPokemonContainer, 'opponent');
        
        checkBattleReady();
    } catch (error) {
        opponentPokemonContainer.innerHTML = `<div class="alert alert-danger">Pokemon not found</div>`;
        console.error('Error fetching Pokemon:', error);
    }
}

async function fetchPokemonWithMoves(nameOrId) {
    const pokemonData = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`).then(res => res.json());
    
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

function calculateDamage(attacker, defender, move) {
    let damage;
    
    if (move.power === 0 || !move.power) {
        damage = 1; // Minimum damage for moves with no power
    } else {
        // Base damage calculation for moves with power
        damage = ((2 * 50 / 5) + 2) * move.power * (attacker.stats.attack / defender.stats.defense) / 50 + 2;
    }
    
    // Get type effectiveness based on move type and defender types
    const effectiveness = getTypeEffectiveness(move.type, defender.types);
    
    // Apply type effectiveness multiplier to damage
    damage = damage * effectiveness.multiplier;
    
    // Apply random factor (between 0.85 and 1.0)
    damage = damage * (0.85 + Math.random() * 0.15);
    
    // Always return the same object structure regardless of move power
    return {
        damage: Math.max(1, Math.floor(damage)), // Ensure at least 1 damage is done
        effectivenessMessage: effectiveness.message,
        effectivenessMultiplier: effectiveness.multiplier
    };
}

function useMove(moveName) {
    const move = playerPokemon.moves.find(m => m.name === moveName);
    if (!move) return;
    
    const damageResult = calculateDamage(playerPokemon, opponentPokemon, move);
    const damage = damageResult.damage;
    
    // Apply damage
    opponentPokemon.currentHP = Math.max(0, opponentPokemon.currentHP - damage);
    console.log(`Damage dealt: ${damage}, Opponent HP: ${opponentPokemon.currentHP}/${opponentPokemon.maxHP}`);
    
    // Re-render opponent Pokemon with updated HP
    renderPokemon(opponentPokemon, opponentPokemonContainer, 'opponent');
    
    // Apply shake animation with a small delay to ensure the element is in the DOM
    setTimeout(() => {
        const opponentElement = opponentPokemonContainer.querySelector('.pokemon-card');
        if (opponentElement) {
            // Force a reflow before adding the animation class
            void opponentElement.offsetWidth;
            
            opponentElement.classList.add('shake-animation');
            
            // Remove the animation class after it completes
            setTimeout(() => {
                opponentElement.classList.remove('shake-animation');
            }, 500);
        }
    }, 50);
    
    // Add effectiveness message if applicable
    const effectivenessMsg = damageResult.effectivenessMessage ? 
        `<span class="${damageResult.effectivenessMultiplier > 1 ? 'text-success' : damageResult.effectivenessMultiplier === 0 ? 'text-danger' : 'text-warning'} fw-bold">${damageResult.effectivenessMessage}</span>` : '';
    
    // Update battle log with GREEN color for player moves
    battleLog.innerHTML = `
        <p class="player-move">
            <span class="text-success fw-bold">${capitalizeFirstLetter(playerPokemon.name)}</span> used 
            <span class="text-primary">${capitalizeFirstLetter(move.name.replace('-', ' '))}</span> for 
            <span class="text-success fw-bold">${damage}</span> damage!
            ${effectivenessMsg}
        </p>` + battleLog.innerHTML;
    
    // Re-render opponent Pokemon with updated HP
    renderPokemon(opponentPokemon, opponentPokemonContainer, 'opponent');
    
    // Check if battle is over
    if (opponentPokemon.currentHP <= 0) {
        // Add victory animation to player Pokémon
        const playerElement = playerPokemonContainer.querySelector('.pokemon-card');
        if (playerElement) {
            playerElement.classList.add('victory-animation');
        }
        
        // Add defeat animation and KO text to opponent Pokémon
        const opponentElement = opponentPokemonContainer.querySelector('.pokemon-card');
        if (opponentElement) {
            opponentElement.classList.add('defeat-animation');
            
            // Add KO text
            const koElement = document.createElement('div');
            koElement.className = 'ko-text';
            koElement.textContent = 'KO!';
            opponentElement.appendChild(koElement);
        }
        
        // Update battle log
        battleLog.innerHTML = `<p class="battle-result"><span class="text-success fw-bold">💥 ${capitalizeFirstLetter(playerPokemon.name)} wins! 🏆</span></p>` + battleLog.innerHTML;
        disableMoveButtons();
        return;
    }
    
    setTimeout(() => {
        opponentTurn();
    }, 1000);
}

// Similarly update the opponentTurn function
function opponentTurn() {
    // Choose a random move for the opponent
    const randomMove = opponentPokemon.moves[Math.floor(Math.random() * opponentPokemon.moves.length)];
    if (!randomMove) return;
    
    // Calculate damage with effectiveness
    const damageResult = calculateDamage(opponentPokemon, playerPokemon, randomMove);
    const damage = damageResult.damage;
    
    // Apply damage
    playerPokemon.currentHP = Math.max(0, playerPokemon.currentHP - damage);
    console.log(`Opponent damage dealt: ${damage}, Player HP: ${playerPokemon.currentHP}/${playerPokemon.maxHP}`);
    
    // Re-render player Pokemon with updated HP
    renderPokemon(playerPokemon, playerPokemonContainer, 'player');
    
    // Apply shake animation with a small delay to ensure the element is in the DOM
    setTimeout(() => {
        const playerElement = playerPokemonContainer.querySelector('.pokemon-card');
        if (playerElement) {
            // Force a reflow before adding the animation class
            void playerElement.offsetWidth;
            
            playerElement.classList.add('shake-animation');
            
            // Remove the animation class after it completes
            setTimeout(() => {
                playerElement.classList.remove('shake-animation');
            }, 500);
        }
    }, 50);
    
    // Add effectiveness message if applicable
    const effectivenessMsg = damageResult.effectivenessMessage ? 
        `<span class="${damageResult.effectivenessMultiplier > 1 ? 'text-danger' : damageResult.effectivenessMultiplier === 0 ? 'text-success' : 'text-warning'} fw-bold">${damageResult.effectivenessMessage}</span>` : '';
    
    // Update battle log with RED color for opponent moves
    battleLog.innerHTML = `
        <p class="opponent-move">
            <span class="text-danger fw-bold">${capitalizeFirstLetter(opponentPokemon.name)}</span> used 
            <span class="text-primary">${capitalizeFirstLetter(randomMove.name.replace('-', ' '))}</span> for 
            <span class="text-danger fw-bold">${damage}</span> damage!
            ${effectivenessMsg}
        </p>` + battleLog.innerHTML;
    
    // Re-render player Pokemon with updated HP
    renderPokemon(playerPokemon, playerPokemonContainer, 'player');
    
    // Check if battle is over
    if (playerPokemon.currentHP <= 0) {
        // Add victory animation to opponent Pokémon
        const opponentElement = opponentPokemonContainer.querySelector('.pokemon-card');
        if (opponentElement) {
            opponentElement.classList.add('victory-animation');
        }
        
        // Add defeat animation and KO text to player Pokémon
        const playerElement = playerPokemonContainer.querySelector('.pokemon-card');
        if (playerElement) {
            playerElement.classList.add('defeat-animation');
            
            // Add KO text
            const koElement = document.createElement('div');
            koElement.className = 'ko-text';
            koElement.textContent = 'KO!';
            playerElement.appendChild(koElement);
        }
        
        // Update battle log
        battleLog.innerHTML = `<p class="battle-result"><span class="text-danger fw-bold">💥 ${capitalizeFirstLetter(opponentPokemon.name)} wins! 🏆</span></p>` + battleLog.innerHTML;
        disableMoveButtons();
    }
}

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
    // Complete type chart with all 18 Pokémon types
    const typeChart = {
        // Normal type
        'normal': {
            'rock': 0.5,
            'ghost': 0,
            'steel': 0.5
        },
        
        // Fire type
        'fire': {
            'fire': 0.5,
            'water': 0.5,
            'grass': 2,
            'ice': 2,
            'bug': 2,
            'rock': 0.5,
            'dragon': 0.5,
            'steel': 2
        },
        
        // Water type
        'water': {
            'fire': 2,
            'water': 0.5,
            'grass': 0.5,
            'ground': 2,
            'rock': 2,
            'dragon': 0.5
        },
        
        // Electric type
        'electric': {
            'water': 2,
            'electric': 0.5,
            'grass': 0.5,
            'ground': 0,
            'flying': 2,
            'dragon': 0.5
        },
        
        // Grass type
        'grass': {
            'fire': 0.5,
            'water': 2,
            'grass': 0.5,
            'poison': 0.5,
            'ground': 2,
            'flying': 0.5,
            'bug': 0.5,
            'rock': 2,
            'dragon': 0.5,
            'steel': 0.5
        },
        
        // Ice type
        'ice': {
            'fire': 0.5,
            'water': 0.5,
            'grass': 2,
            'ice': 0.5,
            'ground': 2,
            'flying': 2,
            'dragon': 2,
            'steel': 0.5
        },
        
        // Fighting type
        'fighting': {
            'normal': 2,
            'ice': 2,
            'poison': 0.5,
            'flying': 0.5,
            'psychic': 0.5,
            'bug': 0.5,
            'rock': 2,
            'ghost': 0,
            'dark': 2,
            'steel': 2,
            'fairy': 0.5
        },
        
        // Poison type
        'poison': {
            'grass': 2,
            'poison': 0.5,
            'ground': 0.5,
            'rock': 0.5,
            'ghost': 0.5,
            'steel': 0,
            'fairy': 2
        },
        
        // Ground type
        'ground': {
            'fire': 2,
            'electric': 2,
            'grass': 0.5,
            'poison': 2,
            'flying': 0,
            'bug': 0.5,
            'rock': 2,
            'steel': 2
        },
        
        // Flying type
        'flying': {
            'electric': 0.5,
            'grass': 2,
            'fighting': 2,
            'bug': 2,
            'rock': 0.5,
            'steel': 0.5
        },
        
        // Psychic type
        'psychic': {
            'fighting': 2,
            'poison': 2,
            'psychic': 0.5,
            'dark': 0,
            'steel': 0.5
        },
        
        // Bug type
        'bug': {
            'fire': 0.5,
            'grass': 2,
            'fighting': 0.5,
            'poison': 0.5,
            'flying': 0.5,
            'psychic': 2,
            'ghost': 0.5,
            'dark': 2,
            'steel': 0.5,
            'fairy': 0.5
        },
        
        // Rock type
        'rock': {
            'fire': 2,
            'ice': 2,
            'fighting': 0.5,
            'ground': 0.5,
            'flying': 2,
            'bug': 2,
            'steel': 0.5
        },
        
        // Ghost type
        'ghost': {
            'normal': 0,
            'psychic': 2,
            'ghost': 2,
            'dark': 0.5
        },
        
        // Dragon type
        'dragon': {
            'dragon': 2,
            'steel': 0.5,
            'fairy': 0
        },
        
        // Dark type
        'dark': {
            'fighting': 0.5,
            'psychic': 2,
            'ghost': 2,
            'dark': 0.5,
            'fairy': 0.5
        },
        
        // Steel type
        'steel': {
            'fire': 0.5,
            'water': 0.5,
            'electric': 0.5,
            'ice': 2,
            'rock': 2,
            'steel': 0.5,
            'fairy': 2
        },
        
        // Fairy type
        'fairy': {
            'fire': 0.5,
            'fighting': 2,
            'poison': 0.5,
            'dragon': 2,
            'dark': 2,
            'steel': 0.5
        }
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
    } else if (multiplier < 1 && multiplier > 0) {
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
        poison: 'indigo',  // requires custom CSS
        ground: 'brown',   // requires custom CSS
        flying: 'info',
        psychic: 'pink',   // requires custom CSS
        bug: 'success',
        rock: 'secondary',
        ghost: 'purple',   // requires custom CSS
        dragon: 'primary',
        dark: 'dark',
        steel: 'secondary',
        fairy: 'pink'      // requires custom CSS
    };
    
    return typeColors[type] || 'secondary';
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

async function selectRandomPlayerPokemon() {
    try {
        playerPokemonContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-success"></div></div>';
        
        const randomId = Math.floor(Math.random() * 1010) + 1;
        
        const pokemon = await fetchPokemonWithMoves(randomId);
        playerPokemon = {
            ...pokemon,
            currentHP: pokemon.stats.hp * 3, // Multiplied by 3 for longer battles
            maxHP: pokemon.stats.hp * 3      // Multiplied by 3 for longer battles
        };
        
        document.getElementById('pokemon1').value = pokemon.name;
        renderPokemon(playerPokemon, playerPokemonContainer, 'player');
        
        checkBattleReady();
    } catch (error) {
        playerPokemonContainer.innerHTML = `<div class="alert alert-danger">Failed to fetch random Pokemon. Please try again.</div>`;
        console.error('Error fetching random Pokemon:', error);
    }
}

async function selectRandomOpponentPokemon() {
    try {
        opponentPokemonContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-danger"></div></div>';
        
        const randomId = Math.floor(Math.random() * 1010) + 1;
        
        const pokemon = await fetchPokemonWithMoves(randomId);
        opponentPokemon = {
            ...pokemon,
            currentHP: pokemon.stats.hp * 3, // Multiplied by 3 for longer battles
            maxHP: pokemon.stats.hp * 3      // Multiplied by 3 for longer battles
        };
        
        document.getElementById('pokemon2').value = pokemon.name;
        renderPokemon(opponentPokemon, opponentPokemonContainer, 'opponent');
        
        checkBattleReady();
    } catch (error) {
        opponentPokemonContainer.innerHTML = `<div class="alert alert-danger">Failed to fetch random Pokemon. Please try again.</div>`;
        console.error('Error fetching random Pokemon:', error);
    }
}

function restartBattle() {
    // Make sure we have Pokémon to restart with
    if (!playerPokemon || !opponentPokemon) return;
    
    // Update battle log
    battleLog.innerHTML = `<p class="text-warning"><strong>Battle restarted!</strong> Pokémon HP restored.</p>` + battleLog.innerHTML;
    
    // restore HP for both Pokémon
    playerPokemon.currentHP = playerPokemon.maxHP;
    opponentPokemon.currentHP = opponentPokemon.maxHP;
    
    // Re-render Pokémon with restored HP
    renderPokemon(playerPokemon, playerPokemonContainer, 'player');
    renderPokemon(opponentPokemon, opponentPokemonContainer, 'opponent');
    
    // Re-enable move buttons
    document.querySelectorAll('.move-button').forEach(button => {
        button.disabled = false;
    });
    
    // Remove victory/defeat animations
    const playerElement = playerPokemonContainer.querySelector('.pokemon-card');
    const opponentElement = opponentPokemonContainer.querySelector('.pokemon-card');
    
    if (playerElement) {
        playerElement.classList.remove('victory-animation', 'defeat-animation');
        const koText = playerElement.querySelector('.ko-text');
        if (koText) koText.remove();
    }
    
    if (opponentElement) {
        opponentElement.classList.remove('victory-animation', 'defeat-animation');
        const koText = opponentElement.querySelector('.ko-text');
        if (koText) koText.remove();
    }
    
    // Add a notification to the battle log
    battleLog.innerHTML = `<p>Battle restarted! ${capitalizeFirstLetter(playerPokemon.name)} vs ${capitalizeFirstLetter(opponentPokemon.name)}</p>` + battleLog.innerHTML;
}
