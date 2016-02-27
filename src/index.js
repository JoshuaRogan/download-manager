"use strict";
import "babel-polyfill";

import Download from './download.js';
import md5 from 'md5';
import fsp from 'fs-promise';
import emitter from 'event-emitter'; 

//Data Structures
let downloadsMap = new Map();       // md5(url) => Download
let avaiableQueue = [];             // Queue of md5(urls) of the next url to try to download

let active = new Set();             // Active download keys
let finished = new Set();           // Finished download keys
let failed = new Set();             // Failed download keys
let addingMore = false;             // Adding more from another source

let moreUpdates = false;            // More updates to the json file requested
let activeUpdate = false;           // Update in progress

//Status 
let takeBreak = false;              

let config = {
    JSONFileDir: './',                              
    JSONFileDir: 'downloadmanager.json',                              
    backupDir: './_node-downloader/backups/',    
    downloadsDir: './_node-downloader/pages/',             
    maxAttempts: 10,
    maxConcurrentRequests: 50,
    throttle: 500,
    breaks: false
    breakInterval: 1000,                      
    breakTime: 1000,                          
    useTor: false,
    updateAll: false,
    immediateWrite: false,                               
    requestConfig:{
        timeout: 30000              
    },
    torRequestConfig:{
        torHost: "localhost",
        torPort: 9050,
        timeout: 30000  
    }
};

let linksConfig = {
    followLinks: false, 
    maxDepth: 4,
    filters: [ //Filters at each depth
        function(link){return link;},
        function(link){return link;}
    ]
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
    init(); 
    startBreakTimer()
}

/**
 * Don't continue downloading where it was left off
 * @return {[type]} [description]
 */
function restart(){

}

/**
 * Download the the url and add links from that page. 
 * - Filter out only certain links
 * - Follow and download those links
 * 
 * @param {[type]} url [description]
 */
function addLinksFromPage(url, config = {}){
    addingMore = true; 
    addingMore = false; 
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
    
    //Setup static vars 
}


/*
|--------------------------------------------------------------------------
| Intenral API
|--------------------------------------------------------------------------
| 
|   
|   
*/
function triggerNext(){
    if(avaiableQueue.length){
        let key = avaiableQueue.shift();
        active.set(key); 
        startDownload();
    }
}

/**
 * Fire off upto maxconcurrent requests 
 * 
 * 
 */
function initialLoop(){
    let max = config.maxConcurrentRequests > avaiableQueue ? avaiableQueue : config.maxConcurrentRequests;
    for(let i=active.length; i < max; i++){
        triggerNext();
    }
}


function downloadAccepted(download){
    active.delete(download.urlHash);
    finished.set(download.urlHash);
    triggerNext(); 
}

/**
 * Download failed to finish. If the status is failed it won't be 
 * attempted again. Otherwise add it back to the queue for try again later.
 * 
 * @param  {Download} download the download that reject
 * @return {[type]}          [description]
 */
function downloadRejected(download){
    active.delete(download.urlHash);

    if(download.failed === true){
        failed.set(download.urlHash);
    }
    else{
        avaiableQueue.push(download.urlHash);
        triggerNext(); 
    }
}




/**
 * Trigger the download 
 * @param  {String} key md5 of the url 
 * @return Promise
 */
function startDownload(key){
    let download = downloadsMap.get(key);
    downloadsStart++;

    return 
         throttle()
        .then(takeBreak)
        .then(download.start)
        .then(downloadAccepted, downloadRejected); 
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
 * Timer to activate breaks
 * 
 */
function startBreakTimer(){
    if(config.break){
        setInterval(() =>{
            takeBreak = true; 
        }, config.breakInterval)
    }
}

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
 * Take a break after so many requests
 * 
 * @return {Promise} [description]
 */
function takeBreak(){
    return new Promise((resolve, reject) => {
        if(!takeBreak || !config.break || config.breakTime === 0){
            resolve(); 
        }
        takeBreak = false; 
        setTimeout(resolve, config.breakTime); 
    });
}

/**
 * Save the contents of a finished download.
 * 
 * @param  {String} key md5 of the url
 * @return {Promise}    
 */
function writeContents(key){
    let download = downloadsMap.get(key);
    return download.writeContents(); 
}

/**
 * Update this JSON file.
 *   
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
    return !addingMore && activeQueue.length > 0 && finished.length + failed.length < downloadsMap.length;
}

/*
|--------------------------------------------------------------------------
| CLI Helpers
|--------------------------------------------------------------------------
|   
|   
|   
*/

function isCLI(){return true;}

//Update progress bar and overall progress/status information
function updateProgress(){} 

//New Y/N promst to continue (such as adding lots of new links)
function newPrompt(){}

function newMessage(){}
function newWarning(){}
function newError(){}


/*
|--------------------------------------------------------------------------
| Events
|--------------------------------------------------------------------------
|   
|   
|   
*/
function onDownloadStart(){}
function onDownloadFinished(){}
function onDonloadFailed(){}
function onRejected(){}


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
