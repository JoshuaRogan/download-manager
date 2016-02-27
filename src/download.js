"use strict";

import md5 from 'md5';

import basicrequest from 'request';
import torrequest from 'torrequest';

function Download(url){
    Download.prototype.count++;

    this.url = url;
    this.urlHash = md5(this.url);

    //Status 
    this.downloaded = false;
    this.downloading = false; 
    this.attempts = 0;
    this.wait = false;
    this.failed = false;
}

Download.prototype.createFromJSON = function(jsonObj){
    Download.prototype.count++;
    let download = Object.create(Download.prototype); 
    Object.assign(download, jsonObj);
    if(!download.urlHash) download.urlHash = md5(download.url);

    download.attempts = 0; 
    download.downloading = false;
    return download; 
}

/*
|--------------------------------------------------------------------------
| Static Variables 
|--------------------------------------------------------------------------
|   
|   
*/
Download.prototype.count = 0;
Download.prototype.maxAttemps = 10;

Download.prototype.attemptsThrottle = 1000;

Download.prototype.config = {};
Download.prototype.setConfig = function(config){
    Download.prototype.config = config;
};

Download.prototype.requestConfig = {};
Download.prototype.setRequestConfig = function(config){
    Download.prototype.requestConfig = config;
};

Download.prototype.useTor = false; 
Download.prototype.setTor = function(boolean = true){
    Download.prototype.useTor = boolean;
};


//Return a cleaned download object
Download.prototype.clean = function(){
    let download = new Download(this.url); 
    return download; 
}

Download.prototype.start = function(){
    return new Promise((resolve, reject) => {
        if(this.failed) {
            this.message = `${this.url} is in fail state.`;
            reject(this); 
        }
        else if(this.downloading) {
            this.message = `${this.url} is already downloading`;
            reject(this);
        }
        else if(this.downloaded){
            this.message = `${this.url} is already downloaded.`;
            reject(this);
        }
        else if(this.waiting){
            this.message = `${this.url} is waiting to try again.`;
            reject(this);
        }
        else if(this.wait){
            if(this.attempts < this.maxAttemps){
                this.waiting = true; 

                setTimeout(()=>{
                    this.wait = false;
                    this.waiting = false; 
                    resolve(this); 
                }, this.attemptsThrottle * this.attempts); 
            }
            else{
                this.failed = true; 
                this.message = `${this.url} has been attemped too many times.`;
                reject(this);
            }
        }
        else{
            this.attempts++;
            this.downloading = true;
            this.startedAt = new Date();
            // let config = Object.assign 

            this.request({uri: this.url}, (err, response, contents) => {
                if(!err){
                    this.finishedAt = new Date();
                    this.success = true;
                    this.downloading = false; 
                    this.downloaded = true; 
                    this.fileContents = contents;   
                    this.response = response; 

                    this.message = 'Completed successfully'; 
                    resolve(this); 
                }
                else{
                    this.success = false;
                    this.downloading = false;
                    this.wait = true;
                    this.message = `${this.url} request failed.`;
                    this.error = err; 

                    reject(this);
                }
            });
        }

    });
}

//Write the contents of this download to the directory
Download.prototype.writeContents = function(dir){
    return new Promise((resolve, reject) => {
        if(!this.downloaded || !this.fileContents) {
            this.message = `${this.url} is not ready to be written!`;
            reject(this);
        }
        else{
            let fileLocation = ''; 
            fsp.writeFile(fileLocation, this.fileContents)
                .then(()=>{
                    this.writtenToFile = true;
                    this.fileLocation = fileLocation;
                    this.message = `Successfull write of ${this.url} to ${fileLocation}`;
                    resolve(this); 
                })
                .catch(err => {
                    this.writtenToFile = false;
                    this.message = `Failed write of ${this.url} to ${fileLocation} \n ${err}`;
                    this.error = err; 
                    reject(this);
                });
        }
    });
}


//Add new properties to this object 
Download.prototype.addProps = function(properties){
    for(let property in properties){
        this[property] = properties[property];
    }
}

/*
|--------------------------------------------------------------------------
| Custom Getters and Setters
|--------------------------------------------------------------------------
|   
|   
*/
Object.defineProperty(Download.prototype, 'request', {
    get: function(){
        return (this.useTor === true) ? torrequest : basicrequest;
    }
});

Object.defineProperty(Download.prototype, 'config', {
    get: function(){
        if(this.hasOwnProperty('config')){
            return Object.assign({}, Download.prototype.config, this.config);
        }
        else return Download.prototype.config; 
    }
});


/*
|--------------------------------------------------------------------------
| Testing
|--------------------------------------------------------------------------
|   
|   
*/
let download = new Download('http://google.com');
download.start().then((download) => console.log(download));


module.exports = Download;
