"use strict";

//https://nodejs.org/api/readline.html#readline_readline_clearline_stream_dir
//https://github.com/baryon/tracer
//https://www.npmjs.com/package/node-status

import colors from 'colors';
import util from 'util';
// import readline from 'readline';

// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout
// });

colors.setTheme({
  normal: 'white',
  debug: 'green',
  more: 'blue',
  all: 'magenta',
  warning: ['red', 'underline'],
  error: 'red'
});

const LEVEL_TO_COLOR = [
    [1, "debug"],
    [2, "more"],
    [3, "all"]
];

const LEVEL_TO_PREFIX = [
    [1, "[DEBUG] "],
    [2, "[INFO] "],
    [3, "[ALL] "]
];

const LEVEL_TO_COLOR_FUNCTION = [
    [1, colors.debug],
    [2, colors.more],
    [3, colors.all]
];

function Debug(debugLevel = 0, options = {}){
    Debug.prototype.numDebuggers++;
    this.options = Object.create(Debug.prototype.options);
    this.options = Object.assign({}, this.options.__proto__, {minLevel: 1}, options);
    this.options.debugLevel = debugLevel;
    this.colors = colors; 
}

Debug.prototype.levelCreator = function(debugLevel, minLevel, options = {}){
    Debug.prototype.staticLevel = debugLevel;
    options = Object.assign({}, options, {minLevel: minLevel});  
    let debugObj = new Debug(debugLevel, options);
    debugObj.levelMode = true;
    return debugObj.debug.bind(debugObj); 
}

Debug.prototype.updateLevel = function(debugLevel){
    Debug.prototype.staticLevel = debugLevel;

    if(this instanceof Debug){
        this.options.debugLevel = debugLevel; 
    }
}

Debug.prototype.updateMinLevel = function(minLevel){
    this.options.minLevel = minLevel; 
}

//Properties 
Debug.prototype.options = {
    colorPrefixOnly: true,
    colored: true,
    depth: null,
    showHidden: true
};


Debug.prototype.numDebuggers = 0;
Debug.prototype.staticLevel = false;
Debug.prototype.levelMode = false;
Debug.prototype.levelToColorMap = new Map(LEVEL_TO_COLOR);
Debug.prototype.levelToPrefixMap = new Map(LEVEL_TO_PREFIX);
Debug.prototype.levelToColorFunctionMap = new Map(LEVEL_TO_COLOR_FUNCTION);

Debug.prototype.debug = function(message, minLevel = false, options = {}){
    //Shorthand debugging method second argument is options
    if(minLevel instanceof Object && Object.keys(options).length === 0){
        options = minLevel; 
    }
    else{
        minLevel = (minLevel === false) ? this.minLevel : minLevel;  
    }


    this.tempOptions = {temp: true};
    this.tempOptions = Object.assign({}, this.tempOptions, this.options.__proto__, this.options, {minLevel: minLevel}, options);
    if(this.debugLevel >= this.minLevel || this.tempOptions.always){
        if(typeof message !== 'string' && !(message instanceof String)){
            message = util.inspect(message, {
                showHidden: this.tempOptions.showHidden, 
                depth: this.tempOptions.depth, 
                colors: this.tempOptions.colored
            });
        }

        //CHECK TO SEE IF THE MESSAGE IS OF FROM THE SAME FUNCTION IF SO CLEAR THE LAST ONE
        if(this.tempOptions.colorPrefixOnly === true){
            this.standardOut(message);
        }
        else{
            this.standardOut(this.color(message));
        }
    }

    this.tempOptions = undefined;
    return false; 
    
}



Debug.prototype.standardOut = function(message){
    message = this.prefix + message;
    console.log(message);
    return true; 
}

/*
|--------------------------------------------------------------------------
| Getters & Setters 
|--------------------------------------------------------------------------
|
*/


//Get the prefix
Object.defineProperty(Debug.prototype, "prefix", {
    get: function prefix() {
        let options = (this.tempOptions !== undefined) ? this.tempOptions : this.options; 
        let result = (options.prefix !== undefined) ? options.prefix : (this.levelToPrefixMap.has(this.minLevel)) ? this.levelToPrefixMap.get(this.minLevel) : '';  
        let colorFunction = this.color; 
        return this.color(result); 
    }
});

//get the mininmum level to show this debug message 
Object.defineProperty(Debug.prototype, "minLevel", {
    get: function minLevel() {
        let options = (this.tempOptions !== undefined) ? this.tempOptions : this.options; 
        return (options.minLevel !== undefined) ? options.minLevel : 0; 
    }
});

Object.defineProperty(Debug.prototype, "debugLevel", {
    get: function debugLevel() {
        if(this.levelMode !== false && this.staticLevel !== false){
            return this.staticLevel;
        }
        let options = (this.tempOptions) ? this.tempOptions : this.options;
        return (options.debugLevel !== undefined) ? options.debugLevel : 1;   
    }
});

//Get the color function 
Object.defineProperty(Debug.prototype, "color", {
    get: function color() {  
        let options = (this.tempOptions) ? this.tempOptions : this.options;
        if(options.error){
            return this.colors.error; 
        }
        else if(options.warning){
            return this.colors.warning; 
        }

        if(options.colorOverride){
            if(this.colors[options.colorOverride] !== undefined) return this.colors[options.colorOverride];
        }

        return (this.levelToColorFunctionMap.has(this.minLevel)) ? this.levelToColorFunctionMap.get(this.minLevel) : this.colors.normal;  

    }
});

module.exports = Debug;


/*
|--------------------------------------------------------------------------
| Rewrite as Single Modules
|--------------------------------------------------------------------------
|
*/



















/*
|--------------------------------------------------------------------------
| Testing and Debug
|--------------------------------------------------------------------------
|
*/
// let debug = Debug.prototype.levelCreator(5, 1,{});
// let info = Debug.prototype.levelCreator(5, 2,{});
// let all = Debug.prototype.levelCreator(3, 3,{});
// let fucker = Debug.prototype.levelCreator(3, 3,{prefix: '[FUCKER] '});

// debug('hello from the dbugg');
// info('hello form info');

// let normal = new Debug(5, {colorPrefixOnly: true}); 

// normal.debug('Normal Output');
// normal.debug('hello');
// normal.updateMinLevel(3);
// normal.debug('hello');
// normal.updateLevel(5);
// normal.debug('hello');

// debug(`There are ${Debug.prototype.numDebuggers} debuggers`);
