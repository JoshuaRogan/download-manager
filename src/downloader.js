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



function Downloader(){
    //Inital Setup
    
    //Backup and write new json file

}

/*
|--------------------------------------------------------------------------
| Public API
|--------------------------------------------------------------------------
|   
|   
*/
Downloader.prototype.start = function(){}
Downloader.prototype.stop = function(){}
Downloader.prototype.add = function(url){}
Downloader.prototype.refresh = function(){}
Downloader.prototype.updateOptions = function(options){}
Downloader.prototype.info = function(){}


/*
|--------------------------------------------------------------------------
| Initialization Methods
|--------------------------------------------------------------------------
|   
|   
*/
Downloader.prototype.initProperties = function(){
    this.downloaderManager = new DownloaderManager(); 
    this.downloads = new Map(); //md5(url) -> Download
}
Downloader.prototype.initDownloads = function(){}
Downloader.prototype.initRequests = function(){}
Downloader.prototype.initDownloaderManager = function(){}

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

Downloader.prototype.downloaderLoop(){
    while(true){
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
        
        

    }
}


/*
|--------------------------------------------------------------------------
| Event Handlers
|--------------------------------------------------------------------------
|   
|   
*/

Downloader.prototype.requestCompleted = function(status, contents, download){
        
}

Downloader.prototype.downloadCompleted = function(status, download){
    if(status == 'success'){

    }
    else if(status === 'retry'){ //timeout will happen in the downloader loop
        this.downloaderManager.setAvaiable(download.urlHash);
    }
    else if(status === 'failed'){
        this.downloaderManager.setFailed(download.urlHash);
    }
    
}

Downloader.prototype.allDownloadsCompleted = function(){

}


/*
|--------------------------------------------------------------------------
| Filesystem 
|--------------------------------------------------------------------------
|   
|   
*/
Downloader.prototype.updateJSONFile = function(){

}

Downloader.prototype.backupJSONFile = function(){

}

Downloader.prototype.JSONFileExists = function(fileloc){

}

Downloader.prototype.writePage = function(contents, download){

}




