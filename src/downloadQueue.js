"use strict";

import md5 from 'md5';


/**
 * 
 * @param {Number} time [description]
 */
function DownloadQueue(time = 100){
    //Very good use for weak map. Everything will eventually be added back to this on finish
    this.boundFunctions = new Map();    
    this.names = [];                    //Fast access to keys
    this.time = time;
    this.total = 0; 
}

//Only add new functions
DownloadQueue.prototype.add = function(name, boundFunction){
    let index = md5(name);

    if(!this.boundFunctions.has(index)){
        this.total++;
        this.names.push(index); 
        this.boundFunctions.set(index, boundFunction);
        this.delayPopCall();
    }
}

//Wait to pop and call the bound function
DownloadQueue.prototype.delayPopCall = function(){
    if(this.total > 0){
        this.total--;
        setTimeout(() => {
            let index = this.names.pop();
            let bound = this.boundFunctions.get(index);
            this.boundFunctions.delete(index);
            if(bound){
                bound.call(); 
            }
        }, this.time);
    }

}

module.exports = DownloadQueue;