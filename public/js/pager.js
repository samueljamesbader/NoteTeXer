"use strict";

$.mobile.pushStateEnabled=false;
window.Pager= window.Pager || new function(){
    var self=this;
    self._historyStates=[{}];
    self._historyPointer=0;
    self.stateData={};
    self._counter=-1;
    self._pageHandlers={};
    self._historyAnchors={};

    self.initPages=function(){
        for (var page in self._pageHandlers) 
            if (self._pageHandlers.hasOwnProperty(page)) 
                self._pageHandlers[page].init();
    };

    self.goTo=function(page){
        self._counter++;
        console.log(page+"?"+self._counter.toString());
        $.mobile.navigate(page+"?"+self._counter.toString(),{});
    };

    self.goBack=function(){
        window.history.back()
    };

    self.goBackTo=function(anchor){

       var target=self._historyAnchors[anchor];
       if (target){
           self._historyPointer=target+1;
           window.history.go(target-self._historyPointer-1);
       }

    };

    self.anchor=function(name){
        self._historyAnchors[name]=self._historyPointer;
    };

    self.navHandler=function(event,data){
        var page=window.location.hash;
        var hash=window.location.hash.split("?")[0];
        var prevPointer=self._historyPointer;

        // Use *our* history to determine whether this move is forward or
        // backward, because relying on data.state.direction fails
        // sometimes in Google Chrome (haven't found a pattern or reason)

        // If this is a forward move
        if(     (self._historyStates.length-1>=prevPointer+1) && 
                (page==self._historyStates[prevPointer+1][0])){
            self._historyPointer=prevPointer+1;
            self.stateData=
                JSON.parse(JSON.stringify(
                    self._historyStates[self._historyPointer][1]));
        }
        // If this is a backward move
        else if(prevPointer>=1
                && (self._historyStates[prevPointer-1][0]==page)){
            self._historyPointer=prevPointer-1;
            self.stateData=
                JSON.parse(JSON.stringify(
                    self._historyStates[self._historyPointer][1]));
        }
        // If this is neither
        else {
            self._historyPointer=prevPointer+1;
            self._historyStates[self._historyPointer]=[
                page,
                JSON.parse(JSON.stringify(self.stateData))
            ];
        }

        var handler=self._pageHandlers[hash];
        if(handler) handler.onPage();
    };

    self.registerPageHandlers=function(pageHandlers){
        self._pageHandlers=pageHandlers;
    };

    self.takeControl=function(page){
        $( window ).on( "navigate", self.navHandler);

        var curLoc=window.location.hash.split("?");
        if (curLoc.length==2 && curLoc[1]==0 && curLoc[0]==page)
            self._counter++;
        self.goTo(page);
    };

};

Pager=window.Pager;
