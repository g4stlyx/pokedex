# pokedex + battles web app

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

# TODO:
* all data can be fetched to a db, just to eliminate dependency of the api.
    * since the data is fixed, it could be even stored in a json file to eliminate latency "fetching it from a database" cause.
* ui can be better.
* daha büyük bir şeye çevirmek istenirse map'ler eklenebilir. lav map'inde ateş pokemonu çıkar gibi.
    * bunu yaptıktan sonra pokemon-vortex'e dönüştürmemek için bir sebep kalmıyor.