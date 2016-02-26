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
    this = download; 
    return this; 
}

Download.prototype.start = function(){
    return new Promise((resolve, reject) => {
        this.attempts++;

        if(this.failed) {
            reject({message:`${this.url} is in fail state.`}); 
        }
        else if(this.downloading) {
            reject({message:`${this.url} is already downloading`}); 
        }
        else if(this.downloaded){
            reject({message:`${this.url} is already downloaded.`});
        }
        else if(this.waiting){
            reject({message:`${this.url} is waiting to try again.`});
        }
        else if(this.wait){
            if(this.attempts < this.maxAttemps){
                this.waiting = true; 
                setTimeout(()=>{
                    this.wait = false;
                    this.waiting = false; 
                    resolve(this); 
                }, 1000 * this.attempts); 
            }
            else{
                this.failed = true; 
                reject({message: `${this.url} has been attemped too many times.`});
            }
        }
        else{
            this.downloading = true;
            this.startedAt = new Date(); 

            this.request(this.requestConfig, (err, response, contents) => {
                if(!err){
                    this.finishedAt = new Date();
                    this.success = true;
                    this.downloading = false; 
                    this.downloaded = true; 
                    this.fileContents = contents;   
                    this.response = response;   
                    // this.contentsHash = md5(contents);

                    resolve({urlHash: this.urlHash, success: true}); 
                }
                else{
                    this.success = false;
                    this.downloading = false;
                    this.wait = true;   
                    reject({message: `${this.url} request failed.`, error: err});
                }
            });
        }

    });
}

//Write the contents of this download to the destination
Download.prototype.writeContents(dest) = function(){
    return new Promise((resolve, reject) => {
        if(!this.downloaded) reject(`${this.url} isn't downloaded yet!`);
        else if(!this.fileContents) reject(`${this.url} doesn't have contents!`);
        else{
            console.log(this.fileContents);
        }
    });
}


//Add new properties to this object 
Download.prototype.addProps = function(properties){
    for(let property in properties){
        this[property] = properties[property];
    }
}

Object.defineProperty(this, 'request', {
    get: function(){
        return (this.useTor === true) ? torrequest : basicrequest;
    }
});

Object.defineProperty(this, 'config', {
    get: function(){
        if(this.hasOwnProperty('config')){
            return Object.assign({}, Download.prototype.config, this.config);
        }
        else return Download.prototype.config; 
    }
});


module.exports = Download;
