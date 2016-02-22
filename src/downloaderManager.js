"use strict";

import md5 from 'md5';

import Download from './download.js';// only for testing

/**
 * DownloaderManager Instance
 *
 * @description
 * Manager of the downloader file that stores the states of all of the downloads by 
 *     the hash of their url. 
 * Only should pass in downloads that you want to be downloaded. i.e. if they are already 
 * in a downloaded state they will still be in the queue until marked ass successfull or failed
 * 
 * @param {Iterable}  downloads  iterable object of initial downloads
 */
function DownloaderManager(downloads = []){
    
    //Sets of urlHashes  
    this.allDownloads = new Set();             //All of the downloadstoo late
    this.avaiableDownloads = new Set();        //Waiting to be downloaded but not failed
    this.activeDownloads = new Set();          //Downloads being requested or written to file (not completed)
    this.successfulDownloads = new Set();      //Keys of downloads completed successfully  
    this.failedDownloads = new Set();          //Keys of completely downloads

    //Array of urlHashes
    this.queue = [];                           //Keys of downloads in the queue (will contain duplicates)

    //Add the hashes to the appropriate maps
    this.addDownloads(downloads); 
}

/**
 * Initialize the sets from an iterable object of downloads
 * @param  {Iterable} downloads list of Download Objects
 */
DownloaderManager.prototype.addDownloads = function(downloads){
    for(let download of downloads){
        this.allDownloads.add(download.urlHash); 
        this.avaiableDownloads.add(download.urlHash); 
        this.queue.push(download.urlHash);
    }
}


/**
 * Add a download 
 * @param {Download} download 
 */
DownloaderManager.prototype.add = function(download){
    this.allDownloads.add(download.urlHash);
    this.avaiableDownloads.add(download.urlHash); 
}

/**
 * Add a download 
 * @param {Download} download 
 */
DownloaderManager.prototype.queue = function(download){
    this.allDownloads.add(download.urlHash); 
}


/*
|--------------------------------------------------------------------------
| Accessors
|--------------------------------------------------------------------------
|   
|   
*/

/**
 * Get the next download key in the avaiable downloads set
 * 
 * @return {String or Boolean}    either the url hash or false
 */
DownloaderManager.prototype.getNextAvaiable = function(){
    while(this.queue.length > 0){
        let urlHash = this.queue.pop();
        if(this.avaiableDownloads.has(urlHash)){
            return urlHash;
        }
    }
    return false; 
}

/**
 * Move items that are in all but not in active, success, or failed
 * 
 */
DownloaderManager.prototype.updateQueue = function(){
    for(let urlHash of this.allDownloads){
        if(!this.activeDownloads.has(urlHash) && !this.successfulDownloads.has(urlHash) && 
            !this.failedDownloads.has(urlHash)){
            this.queue.push(urlHash); 
        } 
    }
}


/*
|--------------------------------------------------------------------------
| Change Status of Downloads
|--------------------------------------------------------------------------
| - Update the state of the maps to reflect changes
|   
*/
DownloaderManager.prototype.setAvaiable = function(urlHash){
    this.avaiableDownloads.add(urlHash);
    this.activeDownloads.delete(urlHash);
    this.successfulDownloads.delete(urlHash);
    this.failedDownloads.delete(urlHash);
    this.queue.push(urlHash);
    return urlHash; 
}

DownloaderManager.prototype.setActive = function(urlHash){
    this.avaiableDownloads.delete(urlHash);
    this.activeDownloads.add(urlHash);
    this.successfulDownloads.delete(urlHash);
    this.failedDownloads.delete(urlHash);
    return urlHash; 
}

DownloaderManager.prototype.setSuccess = function(urlHash){
    this.avaiableDownloads.delete(urlHash);
    this.activeDownloads.delete(urlHash);
    this.successfulDownloads.add(urlHash);
    this.failedDownloads.delete(urlHash);
    return urlHash; 
}

DownloaderManager.prototype.setFailed = function(urlHash){
    this.avaiableDownloads.delete(urlHash);
    this.activeDownloads.delete(urlHash);
    this.successfulDownloads.delete(urlHash);
    this.failedDownloads.add(urlHash);
    return urlHash; 
}

/*
|--------------------------------------------------------------------------
| State of DownloaderManager
|--------------------------------------------------------------------------
| isCompleted() - Is everything success or failed from alldownloads.
|   
*/

DownloaderManager.prototype.isCompleted = function(update = true){
    if(this.activeDownloads.size > 0){
        return false;
    }

    if(this.allDownloads.size !== (this.successfulDownloads.size + this.failedDownloads.size)){
        if(this.avaiableDownloads.size > 0){
            if(this.update) this.updateQueue();
        }   
        return false; 
    }

    return true; 
}

DownloaderManager.prototype.info = function(){
    return {
        successCount: this.successfulDownloads.size,
        failedCount: this.failedDownloads.size,
        queueLength: this.queue.length,
        isCompleted: this.isCompleted(false),
        DownloaderManager: this
    }
}

/*
|--------------------------------------------------------------------------
| Test & Debug
|--------------------------------------------------------------------------
|   
*/

// let downloads = [];
// downloads.push(new Download('http://google.com')); 
// downloads.push(new Download('http://facebook.com')); 
// downloads.push(new Download('http://amazon.com')); 


// let downloaderManager = new DownloaderManager(downloads); 

// let nextqueue = downloaderManager.getNextAvaiable();
// let nextqueue2 = downloaderManager.getNextAvaiable();
// let nextqueue3 = downloaderManager.getNextAvaiable();

// downloaderManager.setActive(nextqueue);
// downloaderManager.setSuccess(nextqueue2);
// downloaderManager.setFailed(nextqueue3);

// console.log(downloaderManager.info());


module.exports = DownloaderManager; 