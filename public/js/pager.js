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

    self.goTo=function(page,dataEnc,data){
        self._counter++;
        /*console.log(page+"?"+self._counter.toString());
        $.mobile.navigate(page+"?"+self._counter.toString(),{});*/

        var qstring="?pc="+self._counter.toString();
        for (var k in dataEnc)
            if (dataEnc.hasOwnProperty(k))
                qstring+="&"+k+"="+dataEnc[k];
        for (var k in data)
            if (data.hasOwnProperty(k))
                self.stateData[k]=data[k];

        //console.log(page+qstring);
        $.mobile.navigate(page+qstring,{});
        
    };

    self.goBack=function(){
        window.history.back()
    };

    self.goBackTo=function(anchor,dataUpdate){
        console.log('gbt');
        var target=self._historyAnchors[anchor];
        if (target){
           for ( var k in dataUpdate)
               if (dataUpdate.hasOwnProperty(k))
                   self._historyStates[target][1][k]=dataUpdate[k];

           self._historyPointer=target+1;
           //console.log('historystates')
           //console.log(self._historyStates);
           window.history.go(target-self._historyPointer-1);
        }

    };

    self.anchor=function(name){
        self._historyAnchors[name]=self._historyPointer;
    };

    self.navHandler=function(event,data){
        if (self.extraHandler)
            self.extraHandler();
        var page=window.location.hash;
        var hash=window.location.hash.split("?")[0];
        var qstring=window.location.hash.split("?")[1]||"";
        var prevPointer=self._historyPointer;
        //console.log("nH "+page);
        $("body").css("display","block");

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
            qstring.split("&").slice(1).map(function(str){
                var kv=str.split("=");
                self._historyStates[self._historyPointer][1][kv[0]]=kv[1];
                self.stateData[kv[0]]=kv[1];
            });
        }

        var handler=self._pageHandlers[hash];
        if(handler) handler.onPage();
    };

    self.registerPageHandlers=function(pageHandlers){
        self._pageHandlers=pageHandlers;
    };

    self.takeControl=function(page){
        //console.log('taking control');
        $.mobile.loading("hide");
        $( window ).on( "navigate", self.navHandler);

        var curLoc=window.location.hash.split("?");
        if (curLoc.length==2 && curLoc[1]=="pc=0" && curLoc[0]==page)
            self._counter++;
        self.stateData.startPoint=window.location.hash;
        self.goTo(page);
    };

    self.setHandler=function(f){
        self.extraHandler=f;
    };

};

Pager=window.Pager;
