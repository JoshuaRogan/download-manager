"use strict";

import md5 from 'md5';
import basicrequest from 'request';
import torrequest from 'torrequest';
import fsp from 'fs-promise';
import winston from 'winston';
import util from 'util'; 

function Download(url){
    Download.prototype.count++;

    this.url = url;
    this.urlHash = md5(this.url); 
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

    //Ability to just have a json file with urls
    if(!download.urlHash) download.urlHash = md5(download.url);

    download.attempts = 0; 
    download.downloading = false;
    return download; 
}

//Convert this object to JSON
Download.prototype.toJSON = function(){
    let json = Object.assign({}, this); 
    delete json.response;
    delete json.fileContents;
    return JSON.stringify(json); 
}


/*
|--------------------------------------------------------------------------
| Static Methods and Variables 
|--------------------------------------------------------------------------
|   
|   
*/
Download.prototype.count = 0;
Download.prototype.maxAttemps = 10;
Download.prototype.destination = './downloaded/';

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
            this.startedAt = new Date().getTime();
            this.request({uri: this.url}, (err, response, contents) => {

                if(!err){
                    this.finishedAt = new Date().getTime();
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

Download.prototype.writeContents = function(destination = this.destination){
    return new Promise((resolve, reject) => {
        if(!this.downloaded || !this.fileContents) {
            this.message = `${this.url} is not ready to be written!`;
            reject(this);
        }
        else{
            let fileLocation = destination + this.filename; 
            fsp.writeFile(fileLocation, this.fileContents)
                .then(() => {
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

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
|   
|   
*/

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

Object.defineProperty(Download.prototype, 'filename', {
    get: function(){
        if(this.hasOwnProperty('filename')){
            return this.filename; 
        }

        return this.url.toLowerCase().replace(/([\/]|www|http(s)?|com|[:\.])/g, ''); 
    }
});


/*
|--------------------------------------------------------------------------
| Testing
|--------------------------------------------------------------------------
|   
|   
*/

winston.loggers.add('logger', {
    console: {
      level: 'silly',
      colorize: 'true',
      prettyPrint: true,
      label: '',
      showLevel : true
    }
  });
let logger = winston.loggers.get('logger');



let download = new Download('http://google.com');
// console.log(download.toJSON());
download.start()
    .then((download) => download.writeContents('./data/'))
    .then(logger.info)
//     .catch(winston.log);
// console.log(download.toJSON());
// winston.log('info', 'Hello distributed log files!');
    // winston.loggers.default.colorize = true; 


    // winston.level = 'debug';
    // let test = {hello: 'world', obj: true}; 
    // category1.log(test,test);
    // // category1.debug(test, test);
    // logger.info('Log Message', download);
    // winston.loggers.default.transports[0].colorize = true; 
    // winston.loggers.default.transports[0].prettyPrint = true; 
    // winston.loggers.options.prettyPrint = true; 
    // logger.info(winston.loggers.default.transports[0]);

    // console.log(util.inspect(test, {colors: true}))
    // console.log(util.inspect(test, {colors: true}))
    // console.log(util.inspect(winston, {colors: true}))
    // winston.info(winston.loggers.transports);
    // logger.info('hello', download);
    // logger.info(winston.loggers);

module.exports = Download;
