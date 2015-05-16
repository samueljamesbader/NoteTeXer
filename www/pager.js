"use strict";

$.mobile.pushStateEnabled=false;
window.Pager= window.Pager || new function(){
    var self=this;
    self._historyStates=[{}];
    self._historyPointer=0;
    self.stateData={};
    self._counter=-1;
    self._pageHandlers={};

    self.goTo=function(page){
        self._counter++;
        $.mobile.navigate(page+"?"+self._counter.toString());
    };

    self.goBack=function(){
        window.history.back()
    };

    self.navHandler=function(event,data){
        if(data.state.direction=="forward"){
            if((++self._historyPointer)<self._historyStates.length)
                self.stateData=
                    JSON.parse(JSON.stringify(
                        self._historyStates[self._historyPointer]));
            else
                self.stateData={};
        }
        else if(data.state.direction=="back"){
            if((--self._historyPointer)>=0)
                self.stateData=
                    JSON.parse(JSON.stringify(
                        self._historyStates[self._historyPointer]));
            else
                self.stateData={};
        }
        else {
            self._historyPointer++;
            self._historyStates[self._historyPointer]=
                JSON.parse(JSON.stringify(self.stateData));
        }

        var handler=self._pageHandlers[window.location.hash.split("?")[0]];
        if(handler) handler();
    };

    self.registerPageHandler=function(page,handler){
        self._pageHandlers[page]=handler;
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
