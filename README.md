# pokedex + battles + typing game web app

used html, css, bootstrap, and vanilla JS.

* index page: 
    * shows ids, names, images, and types of pokemons at main page.
    * implemented pagination: 20 pokemon for a page.
    * implemented caching: used memory caching. put a maxCacheSize = 100 to prevent excessive memory usage.
    * basic searching functionality: gives details of a pokemon given its id or name.
* details page: 
    * shows the things above + stats, physical properties, abilities, moves etc. in details/pokemon page.
* battles page: 
    * pokemons can be fought based on their stats and abilities. has a nice log box too.
    * option for choosing pokemons randomly added.
    * hp*=3 to make battles longer. 
    * in damage calculation: effectiveness based on types, "random factor" to make things more interesting.
* typing game page:
    * vertical gameplay like a falling-words shooter; player is fixed at the bottom.
    * pokemons spawn at the top and home towards the player; collision = game over.
    * zty.pe-like typing: no text field, you type anywhere. first key locks to the nearest matching pokemon and your progress is shown on its label.
    * speed scales by level; active target slows while being typed.
    * name difficulty scales with level: early levels prefer shorter/simple names, later levels allow longer/hyphenated/punctuated names.