"use strict";
import "babel-polyfill";

import Download from './download.js';
import md5 from 'md5';
import fsp from 'fs-promise'; 

//Data Structures
let downloadsMap = new Map();       // md5(url) => Download
let avaiableQueue = [];             // Queue of md5(urls) of the next url to try to download
let activeQueue = [];               // Queue of md5(urls) of the next url to try to download

let finished = new Set();           // Finished download keys
let failed = new Set();             // Failed download keys

let config = {
    JSONFileDir: './',                              
    JSONFileDir: 'DownloadManager.json',                              
    backupDir: './_node-downloader/backups/',    
    downloadsDir: './_node-downloader/pages/',             
    maxAttemps: 10,
    maxConcurrentRequests: 50,
    timeBetweenRequests: 500,
    breakInterval: 1000,                      
    breakTime: 1000,                          
    useTor: false,
    updateAll: false,                              
    requestConfig:{
        timeout: 30000              
    },
    torRequestConfig:{
        torHost: "localhost",
        torPort: 9050,
        timeout: 30000  
    }
};

/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
|   - download()
|   - restart()
|   
*/

/**
 * Initalize 
 * @return {[type]} [description]
 */
function download(){

}

/**
 * Don't continue downloading where it was left off
 * @return {[type]} [description]
 */
function restart(){

}


/*
|--------------------------------------------------------------------------
| Setup
|--------------------------------------------------------------------------
|   - init()
|   
|   
*/
/**
 * Setup Inital properties and data structures 
 * @return {[type]} [description]
 */
function init(){
    //Setup the downloads
}


/*
|--------------------------------------------------------------------------
| Intenral API
|--------------------------------------------------------------------------
| 
|   
|   
*/

/**
 * Iterator to get the next key or false if there isn't a good one avaiable but
 * more will be available later.
 *  
 * @yield {String} Key to a ready download object
 */
function* readyKey(){
    while(hasMore()){
        if(avaiableQueue.length){
            let key = activeQueue.shift(); 
            if(shouldDownload(key)){
                yield key; 
            }
        }
        else{
            console.log('Available queue is empty. Wait a bit.'); 
            yield false; 
        }
    }
}


/**
 * 
 * 
 * 
 */
function downloaderLoop(){
    let readyKeys = readyKey();
    
}



/**
 * Trigger the download 
 * @param  {String} key md5 of the url 
 * @return Promise
 */
function startDownload(key){
    let download = downloadsMap.get(key);
    return download.start(); 
}


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
|   - init()
|   
|   
*/

/**
 * Save the contents of a finished download
 * @param  {String} key md5 of the url
 * @return {Promise}    
 */
function writeContents(key){
    let download = downloadsMap.get(key);
    return download.writeContents(); 
}

/**
 * Should we download this key
 * @param  {String} key to match
 * @return {Boolean} 
 */
function shouldDownload(key){
    return availableSet.has(key);
}


/**
 * More downloads not finished or failed avaiable. 
 * @return {Boolean} 
 */
function hasMore(){
    return activeQueue.length > 0 && finished.length + failed.length < downloadsMap.length;
}
















function* getStockPrice(){
    let symbol = yield new Promise();
    let price = yield symbol;
    return price; 
}


//Eventually switch to task.js
function spawn(generator){
    return new Promise((accept, reject) => {
        let onResult = lastPromiseResult => {
            let {value, done} = generator.next(lastPromiseResult);
            if(!done){
                value.then(onResult, reject);
            }
            else{
                accept(value);
            }
        };
        onResult();
    });
}




//Exposed API
module.exports = {
    download: download,
    restart: restart
}