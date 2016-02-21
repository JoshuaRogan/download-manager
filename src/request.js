"use strict";

import Debug from './debugger.js'
import md5 from 'md5';
import basicrequest from 'request';
import torrequest from 'torrequest';

function Request(type, config){
    this.timesRequested = 0;
    this.requestSent = false; 
    this.timesFailed = 0; 
    this.success = false; 
    this.urlHash = md5(config.url);
    this.url = config.url;
}

/**
 * Fire the request and return a promise
 * @return Promise
 */
Request.prototype.send = function(){
    if(this.requestSent){
        throw new Error("Only can send the same request once"); 
    }
    else{
        this.requestSent = true; 
        this.timesRequested++;

        return new Promise(
            (resolve, reject) => {
                basicrequest(this.config, (err, response, contents) => {
                    if(!err){
                        this.success = true;
                        this.requestSent = false;  
                        resolve(contents); 
                    }
                    else{
                        this.timesFailed++;
                        this.success = false;
                        this.requestSent = false;  
                        reject(err);
                    }
                });
            }
        );
    }
}


module.exports = Request;