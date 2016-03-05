"use strict";
import "babel-polyfill";
import winston from 'winston';
import Download from './download.js';
import md5 from 'md5';
import fsp from 'fs-promise';
import emitter from 'event-emitter'; 
import util from 'util'; 

//Data Structures
let downloadsMap = new Map();           // md5(url) => Download
let avaiableQueue = [];                 // Queue of md5(urls) of the next url to try to download

let active = new Set();                 // Active download keys
let finished = new Set();               // Finished download keys
let failed = new Set();                 // Failed download keys

//Status
let activeUpdate = false;               // JSON file update in progress
let needBreak = false;                  // Need to pause
let takingBreak = false;                // Actively pausing
let breakInterval = false;              // Break Interval ID
let isThrottling = false;               // Actively Throttling
let moreUpdates = false;                // Flag if there are more JSON update requests 

//Logging Helpers
winston.loggers.add('logger', {
    console: {
      level: 'silly',
      colorize: true,
      prettyPrint: true,
      label: '',
      showLevel : true
    }
  });
console.info = winston.loggers.get('logger').info;

let config = {                          
    JSONFile: 'node-downloader.json',                              
    backupDir: './_node-downloader/backups/',    
    downloadsDir: './_node-downloader/pages/',             
    maxAttempts: 10,
    maxConcurrentRequests: 50,
    throttle: 500,
    breaks: true,
    breakInterval: 1000,                      
    breakTime: 1000,                          
    useTor: false,
    updateAll: false,
    writeContents: true,                               
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
    filters: [ //Filters for each depth
        function(domAnchor){return domAnchor.href;},
        function(domAnchor){return domAnchor.href;}
    ]
};

/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
|   - download()
|   - clean()
|   - addLinksFromPage()
|   - setConfig()
*/

/**
 * Fire off some downloads 
 * 
 */
function download(urls, options = false){
    if(options !== false) setConfig(options);
    add(urls); 
    startBreakTimer();
}

/**
 * Don't continue downloading where it was left off
 * @return {[type]} [description]
 */
function clean(){

}

/**
 * Download the the url and add links from that page. 
 * - Filter out only certain links
 * - Follow and download those links
 * 
 * @param {[type]} url [description]
 */
function addLinksFromPage(url, config = {}){

}

/**
 * Set the config for this download module
 * @param {Object} config 
 */
function setConfig(options){
    Object.assign(config, options);   
}

/*
|--------------------------------------------------------------------------
| Setup
|--------------------------------------------------------------------------
|   
|   
|   
*/

/**
 * Add urls to this module  
 * @return {[type]} [description]
 */
function add(urls){
    if(Array.isArray(urls)){
        addDownloadsFromArray(urls);
    }
    else{
        if(urls.contains('.json')){
            addDownloadsFromJSON(urls);
        }
        else{
            addDownloadFromString(urls);
        }
    }

}

function addDownloadsFromArray(urls){
    for(let url of urls){
        addDownloadFromUrl(url);
    }
}

function addDownloadsFromJSON(filename){
}

function addDownloadFromString(url){
    addDownloadFromUrl(url);
}

function addDownloadFromUrl(url){
    let key = md5(url); 
    if(!downloadsMap.has(key)){
        let dwn = new Download(url);
        avaiableQueue.push(key);
        downloadsMap.set(key, dwn);
        triggerMore();
    }     
}

function addDownloadFromJSON(obj){

}

/*
|--------------------------------------------------------------------------
| Internal API
|--------------------------------------------------------------------------
| 
|   
|   
*/
function triggerNext(){
    let key = getNextKey();
    if(key !== false){ 
        startDownload(key);
    }
}


function getNextKey(){
    while(avaiableQueue.length){
        let key = avaiableQueue.shift();
        if(!finished.has(key) && !failed.has(key) && !active.has(key)){
            return key;
        }
    }
    return false; 
}

/**
 * Fire more available requests up-to maxConcurrentRequests  
 * 
 */
function triggerMore(){
    if(!allCompleted()){
        let max = config.maxConcurrentRequests > avaiableQueue ? avaiableQueue : config.maxConcurrentRequests;
        for(let i=active.size; i < max; i++){
            triggerNext();
        }
    }
}

/**
 * Handle accepted promises.
 * 
 * @param  {Download} download Accepted download object
 */
function downloadAccepted(dwn){
    console.info(`Download "${dwn.url}" has been accepted. Message: "${dwn.message}".`);

    active.delete(dwn.urlHash);
    finished.add(dwn.urlHash);

    if(config.writeContents){
        dwn.writeContents(config.downloadsDir)
        .then(() => console.info(`Write completed. Message: "${dwn.message}".`))
        .catch(() => console.info(`Write failed. Message: "${dwn.message}".`));
    }

}

/**
 * Handle Download failed to finish. If the status is failed it won't be 
 * attempted again. Otherwise add it back to the queue for try again later.
 * 
 * @param  {Download} download the download that reject
 */
function downloadRejected(dwn){
    console.info(`Download "${dwn.url}" has been rejected. Message: "${dwn.message}".`); 

    active.delete(dwn.urlHash);
    if(dwn.failed === true) failed.add(dwn.urlHash);
    else avaiableQueue.push(dwn.urlHash);
}


/**
 * Trigger the download 
 * @param  {String} key md5 of the url 
 * @return Promise
 */
function startDownload(key){
    let dwn = downloadsMap.get(key);
    active.add(key);
    
    return throttle()
        .then(() => takeBreak())
        .then(() => dwn.start())
        .then(() => downloadAccepted(dwn), () => downloadRejected(dwn))
        .then(() => {
            triggerMore();
            updateJSON();
        })
        .catch(console.log);
}




/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
|   
|   
|   
*/

/**
 * Timer to activate breaks
 * 
 */
function startBreakTimer(){
    if(config.breaks){
        breakInterval = setInterval(() =>{
            needBreak = true; 
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
        if(isThrottling || !config.throttle || config.throttle === 0){
            resolve('No Throttling'); 
        }
        else{
            isThrottling = true;
            setTimeout(()=>{
                isThrottling = false;
                resolve('Finished Throttling');
            }, config.throttle);
        }
         
    });
}

/**
 * Take a break after so many requests
 * 
 * @return {Promise} [description]
 */
function takeBreak(){
    return new Promise((resolve, reject) => {
        if(takingBreak || !needBreak || config.breakTime === 0){
            resolve('No Break'); 
        }
        else{
            console.info('Taking a break for' + config.breakTime);
            needBreak = false; 
            takingBreak = true; 
            setTimeout(() => {
                takingBreak = false; 
                needBreak = false;
                resolve('Break Finished');
            }, config.breakTime); 
        }
        
    });
}


/**
 * Update this JSON file.
 *      
 */
function updateJSON(){
    if(!activeUpdate){
        activeUpdate = true; 
        let json = {
            config: config,
            downloads: Array.from(downloadsMap.values())
        };

        fsp.writeFile(config.JSONFile, JSON.stringify(json))
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
 * More downloads not finished or failed avaiable. 
 * @return {Boolean} 
 */
function allCompleted(){
    if(finished.size + failed.size === downloadsMap.size){
        onAllFinished();
        return true; 
    }
    else{
        return false; 
    }
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
|  - Use Event Emitter 
|   
|   
*/

function onDownloadFinished(dwn){
    // dwn.writeContents(config.downloadsDir);
}

function onAllFinished(){
    if(breakInterval) clearInterval(breakInterval);
}



//Exposed API
module.exports = {
    download: download,
    clean: clean,
    addLinksFromPage: addLinksFromPage,
    setConfig: setConfig
}

/*
|--------------------------------------------------------------------------
| Testing
|--------------------------------------------------------------------------
|   
|   
|   
*/



download(['http://google.com', 'http://amazon.com'], {downloadsDir: './data/pages/'});
// console.info(downloadsMap);

// let dwn = new Download('http://google.com');
// console.log(download.toJSON());
// dwn.start()
//     .then((res) => res.writeContents('./data/'))
//     .then(() => console.log(dwn.message))
//     .catch(console.log);
