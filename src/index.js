"use strict";
import "babel-polyfill";

import Download from './download.js';
import md5 from 'md5';
import fsp from 'fs-promise'; 

//Data Structures
let downloadsMap = new Map();       // md5(url) => Download
let avaiableQueue = [];             // Queue of md5(urls) of the next url to try to download

let active = new Set();             // Active download keys
let finished = new Set();           // Finished download keys
let failed = new Set();             // Failed download keys

let moreUpdates = false;            // More updates to the json file requested
let activeUpdate = false;           // Update in progress

let config = {
    JSONFileDir: './',                              
    JSONFileDir: 'DownloadManager.json',                              
    backupDir: './_node-downloader/backups/',    
    downloadsDir: './_node-downloader/pages/',             
    maxAttempts: 10,
    maxConcurrentRequests: 50,
    throttle: 500,
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
 * @yield {Promise} Promise that will resolve with a key
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

function triggerNext(){
    if(avaiableQueue.length){
        let key = avaiableQueue.shift();
        active.set(key); 
        startDownload();
    }
}

/**
 * 
 * 
 * 
 */
function initialLoop(){
    let max = config.maxConcurrentRequests > avaiableQueue ? avaiableQueue : config.maxConcurrentRequests;
    for(let i=0; i < max; i++){
        triggerNext();
    }
}

//Promises must accept and reject with this
function downloadFinished(download){
    active.delete(download.urlHash);
    finished.set(download.urlHash);
    triggerNext(); 
}

function downloadFailed(download){
    active.delete(download.urlHash);

    if(download.failed === true){
        failed.set(download.urlHash);
    }
    else{
        avaiableQueue.push(download.urlHash);
    }
}




/**
 * Trigger the download 
 * @param  {String} key md5 of the url 
 * @return Promise
 */
function startDownload(key){
    let download = downloadsMap.get(key);

    return 
         throttle()
        .then(download.start)
        .then(downloadFinished, downloadFailed); 
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
 * Promise timeout in between each request 
 * 
 * @return {Promise}  
 */
function throttle(){
    return new Promise((resolve, reject) => {
        if(!config.throttle || config.throttle === 0){
            resolve(); 
        }

        setTimeout(resolve, config.throttle); 
    });
}

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
 * Update this JSON file
 * @param  
 * @return {Promise}    
 */
function updateJSON(){
    if(!activeUpdate){
        activeUpdate = true; 
        fsp.writeFile('filename.json', json)
            .then(() => {
                activeUpdate = false; 
                if(moreUpdates) {
                    moreUpdates = false; 
                    updateJSON();
                }
            });
    }
    else{
        moreUpdates = true; 
    }
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











// function* triggerRequest(download){
//     let finished = yield download.start();

// }

// function triggerLoop(triggerRequest){
//     return new Promise((accept, reject) => {
//         let onResult = lastPromiseResult => {
//             let {value, done} = generator.next(lastPromiseResult);
//             if(!done){
//                 value.then(onResult, reject);
//                 value.catch(err => {
//                     if(!err.)
//                 })
//             }
//             else{
//                 accept(value);
//             }
//         };
//         onResult();
//     });
// }



// function* getStockPrice(){
//     let symbol = yield new Promise();
//     let price = yield new Promise();
//     return price; 
// }






//Exposed API
module.exports = {
    download: download,
    restart: restart
}
