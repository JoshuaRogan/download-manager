"use strict";

import md5 from 'md5';
import basicrequest from 'request';
import torrequest from 'torrequest';
import fsp from 'fs-promise';
import {logger} from 'js-utils'; 

let debug = true; 

let options = {
  maxAttemps: 10,
  destDir: './data/',
  tor: false
};


/**
 * Priavte method to make the actual request 
 * 
 * @return {Promise} Resulting request promise 
 */
function makeRequest(download){
  let request = options.tor ? torrequest : basicrequest;

  return new Promise((resolve, reject) => {
    request({uri: download.url}, (err, response, contents) => {
      if(err) {
        reject(err); 
      }
      else{
        resolve(contents); 
      }
    });
  }); 

}



class Download{

  constructor(url, config = {}){
      this.initConfig(config);

      this.url = url;
      this.id = md5(this.url); 
      this.downloaded = false;
      this.downloading = false; 
      this.failed = false;
      this.waiting = false; 
      this.wait = false; 
      this.attempts = 0; 
  }


  initConfig(config){
    this.config = config; 
  }

  start(){
    return new Promise((resolve, reject) => {
      if(this.failed) {
        this.error = 'Download has already failed'; 
        reject(this); 
      }
      else{
         makeRequest(this)
          .then(contents => {
            this.contents = contents; 
            resolve(this);
          })
          .catch(err => {
            this.error = err; 
            reject(this); 
          });  
      }
    });
  }

  clean(){}
  toJSON(){}
  write(){}

  get filename(){
    return `${options.destDir}fuck`;
  }


  static createFromJSON(json){
    let download = new Download('url'); 
    download.fromJSON = true; 
    return download; 
  }
}


let dwn = new Download('https://www.facebook.com'); 
dwn.start(); 
// dwn = Download.createFromJSON('test');


logger(dwn); 

