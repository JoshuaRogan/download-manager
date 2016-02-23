"use strict";

import DownloaderManager from './downloaderManager.js'
import DownloadQueue from './downloadQueue.js'
import Download from './download.js'
import Debug from './debugger.js'
import Request from './request.js'

import basicrequest from 'request';
import torrequest from 'torrequest';
import fsp from 'fs-promise'; 
import md5 from 'md5';

/*
|--------------------------------------------------------------------------
| How it works
|--------------------------------------------------------------------------
|   - Create download objects from array of urls or downloader JSON file
|   - Create a map of all of the downloads keyed by md5(url)
|   - Create a map of all of the reqiests for each download
|   - Add all downloads to be downloaded to the download manager
|   - While the downloadmanager has more downloads keep firing off requests 
|       - When Request is finished fire requestfinished handler 
|       - After fire downloadedfinished handler - can add additional hook
|   
*/

function Downloader(downloads, config = {}){
    this.initProperties(config);
    this.backupJSONFile(); 

    this.promises.readyToStart = 
        this.initDownloads(downloads)
            .then(()=>{        
                this.initDownloaderManager(); 
                this.initRequests();
                console.log(this);
            });
}



/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
|   
|   
*/
Downloader.prototype.start = function(){
    this.promises.readyToStart.then(()=>{
        // this.downloaderLoop();
    });
}

Downloader.prototype.stop = function(){

}

Downloader.prototype.add = function(url){
    if(url instanceof Download){

    }
}

Downloader.prototype.refresh = function(){
    this.backupJSONFile(); 
}

Downloader.prototype.updateConfig = function(config){

}

Downloader.prototype.info = function(){

}

//Events 
Downloader.prototype.onRequestCompleted = function(status, download, requestData){}
Downloader.prototype.onDownloadCompleted = function(status, download, requestData){}
Downloader.prototype.onAllDownloadsCompleted = function(){}


/*
|--------------------------------------------------------------------------
| Default Values
|--------------------------------------------------------------------------
|   
|   
*/

Downloader.prototype._defaults = {
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
| Initialization / Configuration Methods
|--------------------------------------------------------------------------
|   
|   
*/
Downloader.prototype.initProperties = function(config){
    this.config = Object.assign({}, this._defaults, config);

    //Data Structures
    this.downloaderManager = null; 
    this.downloads = new Map(); //md5(url) -> Download
    this.requests = new Map(); //md5(url) -> Request

    //Status
    this.status = {};
    this.status.waiting = false;        //Wait period for throttling
    this.status.filesystemIO = 0;       //active filesystem 
    this.status.activeRequests = 0;
    this.status.totalRequests = 0; 

    //Promises
    this.promises = {};
    this.promises.readyToStart = null; 

    //Metadata
    this.metadata = {};
    this.metadata.startTime = new Date().getTime();
}

//Either JSON file or array of files
Downloader.prototype.initDownloads = function(downloads){
   if(Array.isArray(downloads)) return this.initDownloadsArray(downloads);
   else return this.initDownloadsJSON(downloads); 
}

//load from array of urls
Downloader.prototype.initDownloadsArray = function(filesArray){
   for(let url of filesArray){
        this.downloads.set(md5(url), new Download(url));
   }

   return Promise.resolve('Files added from array finished.'); 
}

//load from json file
Downloader.prototype.initDownloadsJSON = function(jsonFileLoc){
    //Read and parse the json file
    return this.loadJSONFile()
        .then(() => {
            //Parse the JSON file and create new objects
        })
    
}

//create request objects from the downloads map
Downloader.prototype.initRequests = function(){
    for(let download of this.downloads){
        this.requests.set(download[0], new Request(download[1].url));
    }
}

//create the downloader manager
Downloader.prototype.initDownloaderManager = function(){
    this.downloaderManager = new DownloaderManager(this.downloads);
}

/*
|--------------------------------------------------------------------------
| Request Management Methods
|--------------------------------------------------------------------------
|   
|   
*/


/*
|--------------------------------------------------------------------------
| Downloader Loop
|--------------------------------------------------------------------------
|  Primary loop to keepdownloading files
|   
*/

Downloader.prototype.downloaderLoop = function(){
    while(!this.downloaderManager.isCompleted()){
        if(!this.status.waiting){
            let download = null; 
            let nextUrlHash = this.downloaderManager.getNextAvaiable(); 
            this.downloaderManager.setActive(nextUrlHash);
            //Fire Request
            
                //then based on status
                this.downloadCompleted('success', download); 
                this.downloadCompleted('failed', download); 

                setTimeout(() => {
                    this.downloadCompleted('retry', download); 
                }, download.attempts * this.options.retryPause);

            //Update waiting status
            
        }
    }
}


/*
|--------------------------------------------------------------------------
| Event Handlers
|--------------------------------------------------------------------------
|   
|   
*/

Downloader.prototype.onRequestCompletedBase = function(status, download, requestData){
    this.onRequestCompleted(status, download, requestData);
}

Downloader.prototype.onDownloadCompletedBase = function(status, download, requestData){
    if(status == 'success'){
        //Download Page
        
    }
    else if(status === 'retry'){ //timeout will happen in the downloader loop
        this.downloaderManager.setAvaiable(download.urlHash);
    }
    else if(status === 'failed'){
        this.downloaderManager.setFailed(download.urlHash);
    }

    this.onDownloadCompleted(status, download, requestData); 
}



Downloader.prototype.onAllDownloadsCompletedBase = function(){

    this.onAllDownloadsCompleted(); 
}


/*
|--------------------------------------------------------------------------
| Filesystem 
|--------------------------------------------------------------------------
|   
|   
*/

Downloader.prototype.loadJSONFile = function(){

    return Promise.resolve();
}

Downloader.prototype.updateJSONFile = function(){
    let fileContents = this.toJSON();

    return Promise.resolve(); 
}

Downloader.prototype.backupJSONFile = function(){
    //Use copy from fs-extra (should be avail with fsp)

    return Promise.resolve();
}

//Sync call to see if JSON file exists
Downloader.prototype.JSONFileExists = function(fileloc){


}

//Write the contents of a page
Downloader.prototype.writePage = function(contents, download){

}


/*
|--------------------------------------------------------------------------
| Helpers 
|--------------------------------------------------------------------------
|   
|   
*/

//Restore a downloader from a JSON object
Downloader.prototype.restore = function(json){
    
}

//Convert this downloader to a JSON object
Downloader.prototype.toJSON = function(downloader = this){
    //Turn this into a JSON string
    let json = ''; 
    
    return json;
}







/*
|--------------------------------------------------------------------------
| Tests 
|--------------------------------------------------------------------------
|   
|   
*/


let downloader = new Downloader(['http://google.com', 'http://amazon.com'],{});
downloader.start();

// downloader.promises.readyToStart