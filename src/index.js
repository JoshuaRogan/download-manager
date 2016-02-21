"use strict";

import DownloadQueue from './downloadQueue.js'
import Download from './download.js'
import Debug from './debugger.js'

import basicrequest from 'request';
import torrequest from 'torrequest';
import fsp from 'fs-promise'; 
import md5 from 'md5';

/**
 * Downloader Instance
 *
 * @description
 * Create an async file downloader. That can be run and stopped by maintaining a JSON file 
 * with download status of each file to be downloaded. 
 * 
 * @param {String or Array}  files   Either an array of urls or a json file location
 * @param {Object} options configuration options
 */
function Downloader(files, options = {}){
    //Clone Options
    this.options = Object.create(Downloader.prototype.options);
    this.options = Object.assign(this.options, options);

    //Data Structures
    this.downloadQueue = new DownloadQueue(this.options.timeBetweenRequests);
    this.urlsMap = new Map(); //Access the downloads via the md5 of the url
    this.downloads = []; //Fast array access the downloads

    //Initialize Properties
    this.readyToDownload = false;
    this.readyToDownloadPromise = null;
    this.downloadingInProgress = false;
    this.finished = false;   

    //Status Counters
    this.fileSystemIO = 0; //Active filesystem reads/writes
    this.concurrentRequests = 0; 
    this.downloadsFinished = 0;
    this.totalRequests = 0;
    this.retries = 0; 

    //Debugging Helpers
    if(this.options.useTor) this.networkDebugger = this.torDebugger; 

    //Initalize URLS
    if(Array.isArray(files)){
        this.infoOut('Initializing Downloader from files array');
        this.createDownloads(files); 
        this.readyToDownload = true; 
        this.readyToDownloadPromise = Promise.resolve();
    }
    else{
        this.infoOut('Initializing Downloader from JSON file');
        this.readyToDownloadPromise = this.parseDownloaderFile(files)
            .then(() => {
                //Override JSON file argument options
                this.options = Object.assign(this.options, options);
            }); 
    }

}

//Base Configuration 
Downloader.prototype.options = {
    downloaderFileDir: './',                              
    downloaderFileBackupDir: './data/backups/',    
    downloaderFileLoc: './data/urls.json',      
    downloadsDestination: './data/pages/',        
    maxAttemps: 10,
    maxConcurrentRequests: 50,
    timeBetweenRequests: 500,
    breakInterval: 1000,                      
    breakTime: 1000,                          
    useTor: false,
    update: false,                              
    requestConfig:{
        torHost: "localhost",
        torPort: 9050,
        timeout: 30000                          
    },
    metadata: {

    }
};



/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
|   -startDownloading(options) start downloading the urls
|   -addPage(url) add another page to the urls 
*/

//Activate all downloads
Downloader.prototype.startDownloading = function(options = {}){
    if(this.readyToDownload === false) {
        this.errorOut('Not Ready to download'); 
        throw new Error('Not Ready to download');
    }

    //Combine options
    Object.assign(this.options, options);

    //Create backup
    if(this.options.backup !== false) this.createBackupDownloaderFile();

    //Begin all of the downloads
    this.infoOut('Starting global download process!');
    this.downloadingInProgress = true; 
    this.finished = false;

    for(let download of this.downloads){
        this.startDownload(download);
    }
}

//Only start inactive downloads (ignores update option)
Downloader.prototype.restartDownloading = function(){
    this.infoOut('Restarting Downloader');
    this.downloadingInProgress = true;
    this.finished = false;

    for(let download of this.downloads){
        if(!download.isDownloaded() && !download.isDownloading()) {
            this.startDownload(download);
        }
    }
}

//Add a new page to be downloaded
Downloader.prototype.addPage = function(url, options = {}){
    options = Object.assign({updateJSON: true, addDuplicates: false}, options);
    let hash = md5(url); 

    if(!this.urlsMap.has(hash) || options.addDuplicates){
        let download = new Download(url); 
        this.urlsMap.set(hash, download);
        this.downloads.push(download);

        if(options.updateJSON) this.writeDownloaderFile();

        //Restart downloading if neccessary
        if(!options.init && this.downloadingInProgress !== true){
            this.infoOut('Page added. Need to restart.'); 
            this.restartDownloading();
        }
    }
    else{
        this.infoOut(`The url "${url}" has already been added! Skipping.`, 2, {colorOverride: 'blue', prefix: '[DUPLICATE URL] '});
    }
}

//Reset all of the Download objects & update the json file
Downloader.prototype.clean = function(){
    this.infoOut('Downloader JSON file being cleaned for fresh downloads and metadata.');

    //Downloads must be loaded
    if(this.readyToDownload === false) {
        this.errorOut('Downloads not set'); 
        throw new Error('Downloads not set');
    }

    //Backup the old file
    this.createBackupDownloaderFile();

    //Clean each download
    for(let download of this.downloads){
        download.clean();
    }

    //Update the JSON file
    return this.writeDownloaderFile(true);
}



/*
|--------------------------------------------------------------------------
| Internal API - Just organizational difference 
|--------------------------------------------------------------------------
|   - startDownload(download) - check if this download should be downloaded then trigger the request 
|   - loadDownloaderFile() 
|   - writeDownloaderFile() 
|   - createDownloads(urls) - create all of the download objects 
|   - finish(properties) - tasks when everything is completed
*/

//Base Start Download
Downloader.prototype.startDownload = function(download){
    //Check Download to see if we should start
    
    if(this.shouldDownload(download)){
        this.downloaderDebug(`Started Download`);
        this.concurrentRequests++;
        download.start(); //Simply adds properties of start time and status

        //How to make the request 
        let requestConfig = Object.create(this.options.requestConfig);
        requestConfig.url = download.url; 

        //Create the request 
        let promise = new Promise((resolve, reject) => {
            this.totalRequests++;

            this.networkDebugger(`Request (${this.concurrentRequests} / ${this.options.maxConcurrentRequests}) [total = ${this.totalRequests}] created to ${requestConfig.url}`);

            this.request(requestConfig, (err, response, contents) => {
                this.downloadsFinished++; //always mark finished

                if(!err){
                    this.concurrentRequests--;
                    this.networkDebugger(`Finished request ${requestConfig.url}`);
                    this.downloadedHandler(true, download, contents);
                    this.writeDownloaderFile();
                    resolve(true);
                }
                else{
                    this.concurrentRequests--;
                    this.networkDebugger(`Request failed for ${requestConfig.url} - ${err}.`);
                    this.networkDebugger(`Attempt ${download.attempts} of ${this.options.maxAttemps}`);
                    download.finish(false, {retrying: true}); 

                    //Retry the same download later 
                    if(download.attempts < this.options.maxAttemps){
                        this.retries++; 
                        setTimeout(()=>{
                            this.retries--;
                            this.networkDebugger('Retrying request');
                            this.startDownload(download);
                        }, download.attempts * this.options.breakInterval);
                        reject('Request failed but retrying...');
                    }
                    else{
                       this.networkDebugger(`Max attempts for ${requestConfig.url}`);
                       this.downloadedHandler(false, download); 
                       reject('Request failed. Retries limit reached!');
                    }
                }
            });
        })
        .catch((err) => this.errorOut(`Start Download Error - ${err}`));
        return promise; 
    }
     
}

//Parse the downloader.json and update this instance (Only needs to have a property called downloads that contain URL properties)
Downloader.prototype.parseDownloaderFile = function(downloaderFileLoc){   
    //Load and JSON file
    return this.loadDownloaderFile()
        .then((json)=>{
            this.infoOut2('Parsing json file from ' + this.options.downloaderFileLoc);
            json = JSON.parse(json);
            this.allOut(json);

            //Sync this instance
            if(json.options instanceof Object){
                let opt = Object.assign({}, this.options.__proto__, this.options, json.options);
                this.options = opt; 
            }
            if(json.downloads){
                this.infoOut2('Updating downloaded data structures from loaded json file.');

                for(let downloadUrlHash in json.downloads){
                    let download = Download.prototype.createFromJSON(json.downloads[downloadUrlHash]);
                    this.downloads.push(download); 
                    this.urlsMap.set(downloadUrlHash, download); 
                }

                this.readyToDownload = true; 
            }
            else{
                this.errorOut('No Downloads found in JSON file'); 
            }

        })
        .catch(err => this.errorOut(err));

}

//Read and load the _downloader.json file
Downloader.prototype.loadDownloaderFile = function(){
    this.fileSystemIO++;

    let filename = this.options.downloaderFileLoc;
    this.fileSystemDebug(`Loading downloader JSON file from ${filename}.`);

    let promise = fsp.readFile(filename)
        .then((data)=>{
            this.fileSystemIO--;
            this.fileSystemDebug('JSON file finished reading');
            return data
        })
        .catch((err) => {
            this.fileSystemIO--;
            this.errorOut(err);
        });

    return promise; 
}

//Quick backup of previous downloader json file
Downloader.prototype.createBackupDownloaderFile = function(){
    return fsp.readFile(this.options.downloaderFileLoc)
        .then((data) => {
            let backupJSONFile = this.options.downloaderFileBackupDir + 'downloader-' + new Date().getTime() + '.bak.json';
            fsp.writeFile(backupJSONFile, data)
                .then(() => this.infoOut(`Backup JSON file saved to ${backupJSONFile}`))
                .catch((err) => this.errorOut(`Write error ${err}`));
        })
        .catch(err => this.errorOut(`Read error ${err}`));
}

//Could be done much better 
Downloader.prototype.writeDownloaderFile = function(last = false){
    this.fileSystemIO++;

    //Only perform the last write
    let filename = this.options.downloaderFileLoc;

    this.fileSystemDebug(`Writing downloader JSON File to ${filename}.`);

    let json = {
        last_updated: new Date(),
        options: Object.assign({}, this.options.__proto__, this.options),
        downloads: {}
    };

    if(last){
        json.completedAt  = new Date().getTime();
        json.downloadsFinished = this.downloadsFinished;
        json.totalRequestsMade = this.totalRequests;
    }

    for(let download of this.downloads){
        json.downloads[md5(download.url)] = download;
    }

    let content = JSON.stringify(json, null, 2);

    let promise = fsp.writeFile(filename, content)
        .then(() => this.fileSystemIO--)
        .then(() => this.fileSystemDebug('JSON file finished writing'))
        .then(() => {if(last) this.infoOut('Wrote downloader JSON for the last time.');})
        .then(() => {if(!last) this.checkIfFinished();})
        .catch(err => {
                if(!last) this.checkIfFinished();
                this.fileSystemIO--;
                this.errorOut(err);
            }
        );

    return promise; 
}

//Generate all of the downloads objects from a url 
Downloader.prototype.createDownloads = function(urls){
    for(let url of urls){
        this.addPage(url, {updateJSON: false, init: true}); 
    }
}

//Update the download file and add additional meta data
Downloader.prototype.finish = function(properties = {}){
    if(!this.finished){
        this.successOut('Finalized Tasks');
        this.finished = true;
        this.downloadingInProgress = false;

        properties = Object.assign({
            finishedAt: new Date().getTime()
        }, properties);

        this.finishHook(properties);
        this.writeDownloaderFile(true); 
    }
}



//What to do with the downloaded file
Downloader.prototype.downloadedHandler = function(status, download, filecontents = '', writeToFile = true){
    download.finish(status);
    if(status === true){ 
        let meta = {};
        meta.contentsHashMD5 = md5(filecontents); 
        
        if(writeToFile === true){

            //Use the md5 hash to see if the file has changed otherwise don't write
            if(download.contentsHashMD5 === meta.contentsHashMD5){
                this.infoOut(`Equal MD5 hash for ${download.url}. No need to write the contents of the file.`);
                return download;   
            }

            let dir = this.options.downloadsDestination;
            meta.fileLocation = dir + download.url.replace(/[^a-z0-9]|https|http|com|www/gi, '') + '-' + meta.contentsHashMD5;

            this.fileSystemDebug(`START Writing of ${meta.fileLocation}`);
            this.fileSystemIO++;
            let promise = fsp.writeFile(meta.fileLocation, filecontents)
                .then(() => this.fileSystemIO--)
                .then(() => this.fileSystemDebug(`DONE Write of ${meta.fileLocation}`))
                .then(() => {
                    download.addProps({writtenToFile: true});
                    this.writeDownloaderFile();
                    this.checkIfFinished();
                })
                .catch(err => {
                    this.fileSystemIO--
                    this.errorOut(err);
                    this.checkIfFinished();
                });

            
        }
        download.addProps(meta);
    }
    download = this.downloadedHandlerHook(status, download, filecontents);   //Hook in to do more tasks 
    
    if(writeToFile === false) this.checkIfFinished();

    return download; 
}



//Determines if we should kick off a request for this Download
Downloader.prototype.shouldDownload = function(download){
    if(download.isDownloading()){
        this.infoOut(`The file ${download.url} is in the process of being downloaded.`);
        this.checkIfFinished();
        return false; 
    }

    if(download.isDownloaded()){
        this.infoOut(`The file ${download.url} is already downloaded.`);
        if(this.options.update === false) {
            this.downloadsFinished++;
            this.checkIfFinished();
            return false; 
        }
        else this.infoOut(`Redownloading the file ${download.url}.`);
    }

    if(this.concurrentRequests >= this.options.maxConcurrentRequests){
        this.networkDebugger(`Max requests (${this.concurrentRequests} / ${this.options.maxConcurrentRequests}) achieved. Will try again.`, 5, {prefix: '[NETWORK - MAX REQUESTS] '});
        let downloadLater = this.startDownload.bind(this, download);
        this.downloadQueue.add(download.url, downloadLater);
        return false; 
    }
    return true; 
    
}

//Determine if there is anything left 
Downloader.prototype.checkIfFinished = function(){
    this.finishedDebugger('i/o ' + this.fileSystemIO);
    this.finishedDebugger('downloadsfinished ' + this.downloadsFinished);
    this.finishedDebugger('downloadqueue ' + this.downloadQueue.names.length);
    this.finishedDebugger('retries ' + this.retries);
    this.finishedDebugger('concurrentRequests ' + this.concurrentRequests);

    if(this.downloadQueue !== undefined) {
        if (this.downloadQueue.names.length > 0) return false;
    }

    if(this.fileSystemIO > 0) return false;
    if(this.retries > 0 ) return false; 
    if(this.concurrentRequests > 0 ) return false; 

    if(this.downloadingInProgress && this.downloadsFinished < this.downloads.length) return false;

    this.finish();
}


//Debuggers
Downloader.prototype.alwaysOut = Debug.prototype.levelCreator(3, 0,{always: true, colorOverride: 'cyan', prefix: '[GENERAL] '});
Downloader.prototype.debugOut = Debug.prototype.levelCreator(3, 1,{});
Downloader.prototype.infoOut = Debug.prototype.levelCreator(3, 2,{});
Downloader.prototype.infoOut2 = Debug.prototype.levelCreator(3, 4,{prefix: '[INFO] ', color: 'cyan'});
Downloader.prototype.allOut = Debug.prototype.levelCreator(3, 4,{});
Downloader.prototype.errorOut = Debug.prototype.levelCreator(3, 1,{error: true, prefix: '[ERROR] ', always: true, colorPrefixOnly: false});
Downloader.prototype.successOut = Debug.prototype.levelCreator(3, 1,{colorOverride: 'green', prefix: '[SUCCESS] '});

Downloader.prototype.fileSystemDebug = Debug.prototype.levelCreator(3, 4,{prefix: '[FILESYSTEM] ', colorOverride: 'cyan'});
Downloader.prototype.downloaderDebug = Debug.prototype.levelCreator(3, 4,{prefix: '[DOWNLOADER] '});
Downloader.prototype.promisesDebug = Debug.prototype.levelCreator(3, 2,{prefix: '[PROMISES] '});
Downloader.prototype.finishedDebugger = Debug.prototype.levelCreator(3, 5,{prefix: '[CHECK IF FINISHED] ', colorOverride: 'magenta'});

Downloader.prototype.networkDebugger = Debug.prototype.levelCreator(3, 3,{prefix: '[NETWORK] ', colorOverride: 'magenta'});
Downloader.prototype.torDebugger = Debug.prototype.levelCreator(3, 3,{prefix: '[NETWORK-TOR] ', colorOverride: 'magenta'});

Debug.prototype.updateLevel(3); 



/*
|--------------------------------------------------------------------------
| Getters
|--------------------------------------------------------------------------
|
*/

//Allow regular and tor requests
Object.defineProperty(Downloader.prototype, "request", {
    get: function request() {
        if(!this.requestType){
            if(this.options.useTor) this.requestType = torrequest;
            else this.requestType = basicrequest;
        }
        return this.requestType;  
    }
});



/*
|--------------------------------------------------------------------------
| Hooks
|--------------------------------------------------------------------------
|
*/

//Can perform additional tasks after a file is downloaded 
Downloader.prototype.downloadedHandlerHook = function(status, download, filecontents){
    return download; 
}

Downloader.prototype.finishHook = function(){
     
}




/*
|--------------------------------------------------------------------------
| Private
|--------------------------------------------------------------------------
|
*/




/*
|--------------------------------------------------------------------------
| Testing and Debug
|--------------------------------------------------------------------------
|
*/

// let downloader = new Downloader(
//     [   
//         'https://www.google.com/', 
//         'http://www.baseball-reference.com/route.cgi?player=1&mlb_ID=623406',  
//         'http://motherfuckingwebsite.com/',
//         'https://developer.mozilla.org/en-US/Learn/HTML/Introduction_to_HTML/Document_and_website_structure#'
//     ], 
//     {
//         downloaderFileLoc: './data/urls.json',
//         downloadsDestination: './data/pages/',
//         debugLevel: 2,
//         useTor: false, 
//         maxConcurrentRequests: 10
//     }
// );

// downloader.writeDownloaderFile();



function createJSONFile(doNothing = false, startDownload = false, writeJSON = false){
    if(doNothing) return Promise.resolve();

    return fsp.readFile('./data/baseballRefUrls.json')
        .then(data => {

            let urls = JSON.parse(data).urls;
            urls = urls.slice(0,15);
            urls = urls.map((urlObj) => 'http://www.baseball-reference.com' + urlObj.url);

            let downloader = new Downloader(
                urls, 
                {
                    downloaderFileDir: './data/',
                    downloaderFileBackupDir: './data/backups/',
                    downloaderFileLoc: './data/urls.json',
                    downloadsDestination: './data/pages/',
                    useTor: true, 
                    maxConcurrentRequests: 50
                }
            );

            downloader.readyToDownloadPromise
                    .then(()=> {if(writeJSON) downloader.writeDownloaderFile()})
                    .then(()=> {if(startDownload) downloader.startDownloading()})
                    .catch(err => console.log(err));
        })
        .catch(err => console.log(err));
}

createJSONFile(false, false, true)
    .then(() => {
        let downloader = new Downloader(
        './data/urls.json', 
        {
            downloaderFileDir: './data/',
            downloaderFileBackupDir: './data/backups/',
            downloaderFileLoc: './data/urls.json',
            downloadsDestination: './data/pages/',
            useTor: false, 
            maxConcurrentRequests: 50
        });

        downloader.readyToDownloadPromise
            .then(() => downloader.clean())
            .then(() => downloader.startDownloading());
    });


// createJSONFile(false);



// );

// downloader.readyToDownloadPromise
//     .then(() => downloader.clean())
//     .then(() => downloader.startDownloading());




// //Essentially have the producer and consumer problem here


// downloader.readyToDownloadPromise
//     // .then(() => downloader.clean())
//     .then(() => downloader.startDownloading({update: false}));

//Add urls later
// let newUrls = ['https://simplebac.com/', 'https://amazon.com'];
// downloader.finishHook = function(){
//    if(newUrls.length) downloader.addPage(newUrls.pop());
// };



module.exports = Downloader; 