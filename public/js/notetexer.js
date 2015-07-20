"use strict";

var cur_user;
var glob;
var prodmode=(window.location.origin=="http://notetexer.parseapp.com");


function initNoteTeXer(){
    console.log('Starting NoteTeXer');

    $( "[data-role='panel']" ).panel();
    $("#menuPanel").enhanceWithin();
    $("#menuPanel").panel('open')
    $("#menuPanel").on('panelbeforeopen',function(){
        $("div[data-role='main']").css("padding-left","13.5em");
    });
    $("#menuPanel").on('panelbeforeclose',function(){
        $("div[data-role='main']").css("padding-left","1em");
    });

    var win = $(window),
    height = win.height(),
    width = win.width();

    
    $("body").append($([
        "<style>",
        ".viewNote_footer { visibility: hidden; }",
        "@media screen and (orientation: portrait) and (min-height: "
        + (Math.max(width, height) - 10) + "px)",
        "{ .viewNote_footer { visibility: visible; } }",
        "</style>"
    ].join(" ")));
    


    configureParse();
    configureMathJax();
    configurePager();
    configureFacebook();
    configureSketch();

    monkeyPatchStrings();
    monkeyPatchTextArea();

    Pager.initPages();

    Pager.takeControl("#splashPage");

}

var NotePage;
var Tag;
var Tagging;

function configureParse(){

    if(prodmode)
        Parse.initialize(
            "BpecqAIXnfUMeHOvOUBbK1VhAUkds9tw9aX2UzXA",
            "Gfyrs59Z5tUBTrQzF4WwJ0tdfgAABgES9urTB6Lo");
    else
        Parse.initialize(
            "AwwBjiQvHGPB5AG3vHKRFBkYWeguCQxKw00Xjhgv",
            "PdQ0zew4gYw85fiQGMMmXq0OAAIhnycytkCmPtx3");
    NotePage=Parse.Object.extend("NotePage");
    Tag=Parse.Object.extend("Tag");
    Tagging=Parse.Object.extend("Tagging");
}

function configureMathJax(){

    // Monkeypatch the typeset function onto jQuery elements
    $.fn.typeset=function(callback){
        if(typeof MathJax =="undefined")
            configureMathJax();
        MathJax.Hub.Queue(["Typeset",MathJax.Hub,this.get(0)]);
        if(callback) MathJax.Hub.Queue(callback);
    }
    $.fn.mathremove=function(){
        if(typeof MathJax =="undefined")
            configureMathJax();
        $("#"+this.prop("id")+" .MathJax").map(function(ind,elt){
            MathJax.Hub.getJaxFor(elt).Remove()});
    }
    $.fn.rerender=function(callback){
        if(typeof MathJax =="undefined")
            configureMathJax();
        MathJax.Hub.Queue(["Rerender",MathJax.Hub,this.get(0)]);
        if(callback) MathJax.Hub.Queue(callback);
    }
}


function configurePager(){

    // Hijack link clicks
    $("a.hijack").click(function(e){
        e.preventDefault();
        Pager.goTo("#"+this.href.split("#")[1]);
    });

    Pager.registerPageHandlers({
        "#mainPage": mainPage,
        "#splashPage": splashPage,
        "#viewLinkerPage": viewLinkerPage,
        "#viewNotePage": viewNotePage,
        "#recycledPage": recycledPage,
        "#latexPage": latexPage,
        "#searchPage": searchPage,
        "#aboutPage": aboutPage,
        "#userPage": userPage
    });


    var widthmql=window.matchMedia("(min-width: 800px)");
    var setPanel=function(){
        if (widthmql.matches)
            setTimeout(function(){
                console.log('about to open panel');
                $("#menuPanel").panel('open')
            },0);
        else
            setTimeout(function(){
                console.log('about to open panel');
                $("#menuPanel").panel('close')
            },0);
    };
    Pager.setHandler(setPanel);
    widthmql.addListener(setPanel);
}

function configureFacebook(){
    window.fbAsyncInit = function() {
        Parse.FacebookUtils.init({
            appId      : prodmode?'587019388103546':'594303047375180',
            xfbml      : true,
            version    : 'v2.3'
        });
      };
    var js = document.createElement('script'); js.id = 'facebook-jssdk';
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    $("head")[0].appendChild(js);
}

function configureSketch(){
    $.each(['#f00', '#ff0', '#0f0', '#0ff', '#00f', '#f0f', '#000', '#fff'], function() {
      $('#viewNote_je_imgdoodlepopup .tools').append("<a href='#viewNote_sketch' data-color='" + this + "' style='display:inline-block;width: 19px;height:19px; border: 1px solid black;background-color: " + this + ";'></a> ");
    });
    $.each([3, 5, 10], function() {
      $('#viewNote_je_imgdoodlepopup .tools').append(
          "<a href='#viewNote_sketch' data-size='"+this+"' style='display:inline-block;width: "+(11)+"px;height:"+(11)+"px;border:1px solid black;vertical-align:baseline;padding:4px;position:static;margin: 0px 2px'><span style='display:block;width: "+this+"px; height: "+this+"px; margin:auto;background-color:black;position:static;vertical-align:middle'></span></a>");
    $('#viewNote_sketch').sketch();
  });
}

function monkeyPatchStrings(){
    String.prototype.escapeRegExp = function(){
      return this.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    };
    String.prototype.startsWith = function(prefix) {
        return this.indexOf(prefix.escapeRegExp()) === 0;
    };
    String.prototype.endsWith = function(suffix) {
        return this.match(suffix.escapeRegExp()+"$") == suffix;
    };
    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    };
}

function monkeyPatchTextArea(){
    /*$.fn.selectRange = function(start, end) {
        if(!end) end = start; 
        return this.each(function() {
            if (this.setSelectionRange) {
                this.focus();
                this.setSelectionRange(start, end);
            } else if (this.createTextRange) {
                var range = this.createTextRange();
                range.collapse(true);
                range.moveEnd('character', end);
                range.moveStart('character', start);
                range.select();
            }
        });
    };

    $.fn.getCursorPosition = function() {
        var el = $(this).get(0);
        var pos = 0;
        if('selectionStart' in el) {
            pos = el.selectionStart;
        } else if('selection' in document) {
            el.focus();
            var Sel = document.selection.createRange();
            var SelLength = document.selection.createRange().text.length;
            Sel.moveStart('character', -el.value.length);
            pos = Sel.text.length - SelLength;
        }
        return pos;
    }*/

}

function listFiller(container,makeClickHandler,makeDeleteHandler){
    var listElt=container.children("ul");
    var rwdElt=container.children("div");
    return function(items){
        listElt.html("");
        rwdElt.html("");
        if (!items) return;
        var item_ids=[];
        if (items.length==0) 
            listElt.append($("<div style='text-align: center;"+
                " margin: auto; margin-top: 40px;'>(No notes found)</div>"));
        else{
            for (var i=0;i<items.length;i++){
                var item=items[i];
                item_ids.push(item.id);

                listElt.append($("<li></li>")
                    .addClass(
                        makeDeleteHandler ? "ui-li-has-alt" : "")
                    .addClass(
                        (i==0)? "ui-first-child":
                        (i==items.length-1)? "ui-last-child": "")
                    .append($("<a href='#'></a>")
                        .addClass(item.get("type")=="linker" ?
                            "ui-btn ui-alt-icon ui-btn-icon-left ui-icon-bars":
                            "ui-btn ui-alt-icon ui-btn-icon-left ui-icon-comment")
                        .click(makeClickHandler(item))
                        .text(item.get("name")))
                    .append(
                        makeDeleteHandler ?
                         $("<a href='#'></a>")
                            .addClass(
                                "ui-btn ui-alt-icon ui-btn-icon-notext ui-icon-delete")
                            .click(makeDeleteHandler(item))
                        : "")
                    );

                rwdElt.append(
                    $("<div class='rwdblock'></div>")
                        .click(makeClickHandler(item))
                        .append($("<a class='rwdspan'></a>")
                            .click(function(e){e.preventDefault()})
                            .text(item.get("name")))
                        .addClass(item.get("type")=="linker" ?
                            "rwdlinker" : "rwdnote")
                    .append($("<a href='#' class='rwddel'></a>")
                        .addClass("ui-btn ui-mini ui-alt-icon"+
                            " ui-btn-icon-notext ui-icon-delete")
                        .click(function(e){makeDeleteHandler(item)(e);e.stopPropagation();}))
                    );

            }
        }
        return Parse.Promise.as(item_ids);
    }

}


//////////
// Pages
//////////

var mainPage = new function(){
    var self=this;

    self.init=function(){
        $("#main_logout").click(function(e){
            e.preventDefault();
            Parse.User.logOut();
            Pager.goTo("#splashPage");
        });
        if(window.innerWidth>700){
            $("#mainPage ul").addClass("ui-listview-inset");
            $("#mainPage ul").addClass("ui-corner-all");
        }
    };

    self.onPage=function(){
        if(!cur_user||cur_user.dirty()){ console.log('mTs');
            Pager.goTo("#splashPage",{},{startPoint:"#mainPage",forceLogin:true});}
        self.renderPage();
        Pager.stateData.addToNP=null;
        Pager.stateData.cur_item_id=null;
    };

    self.renderPage=function(){
        $("#main_title").rerender();
        if ((new Date()-cur_user.createdAt) < 15*60*1000 )
            $("#main_starthere").css("display","inline");
        else
            $("#main_starthere").css("display","none");
        if (!cur_user.get('bio'))
            $("#main_addbio").css("display","inline");
        else
            $("#main_addbio").css("display","none");

    };
}

var splashPage = new function(){
    var self=this;
    
    self.init=function(){
        self.fornew=$("#splash_fornew");

        self.initLetsGo();
        self.initResetPass();

        $("#splash_letsgo").click(function(e){
            e.preventDefault();
            self.presentAuth();
        });

    };

    self.initLetsGo=function(){
        self.popupLetsGo=$("#popupLetsGo");
        $("#letsgo_showsignup").click(function(e){
            e.preventDefault();
            $(".login").css("display","none");
            $(".signup").css("display","block");
        });
        $("#login_resetpass").click(function(e){
            e.preventDefault();
            self.popupLetsGo.popup("close");
            self.popupResetPass.popup("open");
        });
        $("#letsgo_loginsubmit").click(function(e){
            e.preventDefault();
            $(".authbtn").parent().addClass("ui-state-disabled");
            var w=$("#letsgo_loginsubmit").width();
            $("#letsgo_loginerror").text("");
            $("#letsgo_loginerror").width(w);
            Parse.User.logIn(
                $("#letsgo_loginun").val().toLowerCase(),
                $("#letsgo_loginpass").val().toLowerCase(),
                {   success: function (user) {
                        cur_user=user;
                        self.popupLetsGo.popup("close");
                        $(".authbtn").parent().removeClass("ui-state-disabled");
                        self.gotUser();
                    },
                    error: function (user,error) {
                        $(".authbtn").parent().removeClass("ui-state-disabled");
                        var w=$("#letsgo_loginsubmit").width();
                        if (error.code==101)
                            error.message="incorrect username and/or password";
                        $("#letsgo_loginerror").text(error.message);
                        $("#letsgo_loginerror").width(w);
                    }
                }
            );
        });
        $("#letsgo_signupsubmit").click(function(e){
            e.preventDefault();
            $(".authbtn").parent().addClass("ui-state-disabled");
            var w=$("#letsgo_signupsubmit").width();
            $("#letsgo_signuperror").text("");
            $("#letsgo_signuperror").width(w);

            var user= new Parse.User();
            user.set("username",$("#letsgo_signupun").val().toLowerCase());
            user.set("displayname",$("#letsgo_signupun").val());
            user.set("password",$("#letsgo_signuppass").val().toLowerCase());
            user.set("email",$("#letsgo_signupemail").val().toLowerCase());
            user.signUp(null,{
                success: function(user) {
                    cur_user=user;
                    self.popupLetsGo.popup("close");
                    $(".authbtn").parent().removeClass("ui-state-disabled");
                    self.gotUser();
                },
                error: function(user,error) {
                    $(".authbtn").parent().removeClass("ui-state-disabled");
                    var w=$("#letsgo_signupsubmit").width();
                    $("#letsgo_signuperror").text(error.message);
                    $("#letsgo_signuperror").width(w);
                }
            });
        });

        $("#fb-connect").click(function(e){
            e.preventDefault();
            $(".authbtn").parent().addClass("ui-state-disabled");
            Parse.FacebookUtils.logIn("public_profile,email",{
                success: function(user){
                    $(".authbtn").parent().removeClass("ui-state-disabled");
                    cur_user=user;
                    self.popupLetsGo.popup("close");
                    self.fbLoggedIn();
                },
                error: function(user,error){
                    $(".authbtn").parent().removeClass("ui-state-disabled");
                    var w=$("#letsgo_fberror").width();
                    $("#letsgo_fberror").text(error.message);
                    $("#letsgo_fberror").width(w);
                }
            })
        });

        $("#letsgo_showlogin").click(function(e){
            e.preventDefault();
            $(".login").css("display","block");
            $(".signup").css("display","none");
            $("#letsgo_logindiv").slideDown();
            $("#letsgo_signupdiv").slideUp();
        });
        $("#letsgo_showsignup").click(function(e){
            e.preventDefault();
            $(".login").css("display","none");
            $(".signup").css("display","block");
            $("#letsgo_logindiv").slideUp();
            $("#letsgo_signupdiv").slideDown();
        });
    };

    self.initResetPass=function(){
        self.popupResetPass=$("#popupResetPass");

        $("#resetpass_login").click(function(e){
            e.preventDefault();
            self.popupResetPass.popup("close");
            self.popupLetsGo.popup("open");
        });
        $("#resetpass_reset").click(function(e){
            e.preventDefault();

            Parse.User.requestPasswordReset(
                $("#resetpass_email").val().toLowerCase(),
                {
                    success: function() {
                        self.popupResetPass.popup("close");
                        self.popupLetsGo.popup("open");
                    },
                    error: function(error) {
                        var w=$("#resetpass_reset").width();
                        $("#resetpass_error").text(error.message);
                        $("#resetpass_error").width(w);
                    }
                }
            );
        });
    };

    self.fbLoggedIn=function(){
        if(!cur_user.existed()){
            FB.api("/me",function(graph){
                return Parse.Cloud.run("fbLoggedIn",
                    {   name: graph.name,
                        email: graph.email
                }).then(self.gotUser,
                    function(err){alert(err.message);});
            });
        }
        else self.gotUser();
    };

    self.gotUser=function(){
        try{
            localStorage["hasAccount"]=true;
        } catch(e){}
        self.fornew.css("display","none");
        $.mobile.loading("show")

        new Parse.Query(Parse.User)
            .include("mainpage")
            .equalTo("objectId",cur_user.id)
            .first()
        .then(function(user){
            if(!user)
                return Parse.Promise.error("Bad user error");
            cur_user=user;
        })
        .then(function(){
            if(!cur_user.get("mainpage")){
                console.log("need to sOU");
                $("#splash_message").html(
                    "<span style='color:green'>"
                    +"Creating your account right now!"
                    +"  This is so exciting!</span>");
                return Parse.Cloud.run("startOffUser")
                .then(function(res){
                    return Parse.Promise.as(res);
                },function(err){
                    if (    err.message=="Execution timed out" ||
                            err.message=="success/error was not called")
                        return runCloudUpdate();
                    else{
                        console.log(err);
                        return Parse.Promise.error(err);
                    }
                })
                .then(function(res){
                    return new Parse.Query(Parse.User)
                        .include("mainpage")
                        .equalTo("objectId",cur_user.id)
                        .first()
                    .then(function(user){
                        cur_user=user;
                    });
                });
            }
        }).then(
            self.continueToMain
        ,function(error){
            if (error.message)
                alert(error.message);
            else
                alert(error);
            Parse.User.logOut();
            self.fornew.css("display","block");
        });
    };

    self.continueToMain=function(){
        $.mobile.loading("hide");
        latexPage.renderPage();
        latexPage.transmitToJaxEditable();

        var startPage=Pager.stateData.startPoint.split('?')[0];
        var startQ=Pager.stateData.startPoint.split('?')[1] || "";

        if(startPage!="#viewNotePage" && startPage!="#viewLinkerPage"){
            startPage="#mainPage";
            startQ="";
        }

        var dataEnc={};
        startQ.split("&").map(function(encpart){
            if(encpart){
                var kv=encpart.split("=");
                if (kv[0]!="pc") dataEnc[kv[0]]=kv[1];
            }
        });
        setTimeout(function(){Pager.goTo(startPage,dataEnc);},1500);
    };

    self.presentAuth=function(){
        $("#splashPage form").trigger('reset');
        $("#letsgo_signuperror").text("");
        $("#letsgo_loginerror").text("");
        $("#letsgo_fberror").text("");
        $("#resetpass_error").text("");
        if (localStorage && localStorage["hasAccount"]=="true"){
            $(".login").css("display","block");
            $(".signup").css("display","none");
            $("#letsgo_logindiv").slideDown(0);
            $("#letsgo_signupdiv").slideUp(0);
        }
        else{
            $(".login").css("display","none");
            $(".signup").css("display","block");
            $("#letsgo_logindiv").slideUp(0);
            $("#letsgo_signupdiv").slideDown(0);
        }

        setTimeout(function(){self.popupLetsGo.popup("open");},500);
    };

    self.onPage=function(){
        //console.log("on splash"+window.location.hash);
        $("#splash_message").text("");
        console.log("startpoint:");
        console.log(Pager.stateData.startPoint.split("?")[0]);
        cur_user=Parse.User.current();
        if(cur_user && !cur_user.dirty()) self.gotUser();
        else
            if (!Pager.stateData.forceLogin && $.inArray(
                    Pager.stateData.startPoint.split("?")[0],
                    ["#viewNotePage","#viewLinkerPage"])!=-1){
                console.log('c2m w/o u');
                cur_user=new Parse.User();
                self.continueToMain();
            }
            else{
                cur_user=new Parse.User();
                self.fornew.css("display","block");

                if(Pager.stateData.forceLogin) {
                    console.log('inFL');
                    if($.inArray(Pager.stateData.startPoint.split("?")[0],
                            ["#viewNotePage","#viewLinkerPage"])!=-1)
                        $("#splash_message").html("Hi! Sorry to bother you, "+
                            "but you are not logged in, and the owner of that "+
                            "note has not made it public.<br/>Nonetheless, "+
                            "feel free to click either link above and explore!");
                }
            }
    };

}


var viewLinkerPage = new function(){
    var self=this;
    self.init=function(){
        self.list=$("#viewLinker_list");
        self.addbtn=$("#viewLinker_add");
        self.addbtn.click(function(e){
            e.preventDefault();
            $("#new_name").val("");
            $("#new_submitwrapper").addClass("ui-state-disabled");
            $("#popupAdd").popup("open");
            setTimeout(
                function() {self.addbtn.removeClass("ui-btn-active")},100);
        });
        $("#viewLinker_title").click(function(e){
            $("#renameLinker_newname").val( self.cur_linker.get("name"));
            $("#popupRenameLinker").popup("open",{y:0});
        });
        $("#viewLinker_link").click(function(e){
            e.preventDefault();
            if(Pager.stateData.addToNP.type=="linker")
                Parse.Cloud.run("linksTo",
                    {   fromId: Pager.stateData.addToNP.id,
                        toId: self.cur_linker.id,
                        linksTo: true
                    })
                .then(function(){
                    Pager.goBackTo("addTo")
                },function(error){
                    alert(error.message);
                });
            else
                Pager.goBackTo("addTo",
                {   toPage:
                        {id:self.cur_linker.id,
                        type:self.cur_linker.get("type"),
                        name:self.cur_linker.get("name")}});
        });
        $("#viewLinker_copy").click(function(e){
            Parse.Cloud.run("copyNotePage",{noteId:self.cur_linker.id})
            .then(function(res){
                Pager.stateData.cur_item_id=res.id;
                Pager._historyStates[Pager._historyPointer][1].cur_item_id=res.id;
                self.cur_linker=res;
                self.renderPage();
                runCloudUpdate();
            },
            function(err){
                alert(err.message);
            });
        });
        $("#viewLinker_share").click(function(e){
            e.preventDefault();
            var cur_share=($("#viewLinker_share").text()=="Shared");
            Parse.Cloud.run("shareNotePage",
                {noteId:self.cur_linker.id, share: !cur_share})
            .then(function(res){
                if (cur_share)
                    $("#viewLinker_share").text("Private");
                else
                    $("#viewLinker_share").text("Shared");
                runCloudUpdate();
            },
            function(error){
                alert(error.message);
            });
        });

        self.initPopupAdd();
        self.initPopupNew();
        self.initPopupRename();
        self.clearPage();
    };
    self.initPopupAdd=function(){
        self.popupAdd=$("#popupAdd");
        $("#popupAdd_new").click(function(e){
            e.preventDefault();
            self.popupAdd.popup("close");
            self.popupNew.popup("open");
        });
        $("#popupAdd_existing").click(function(e){
            e.preventDefault();
            self.popupAdd.popup("close");
            Pager.anchor("addTo");
            Pager.stateData.addToNP=
                {id:self.cur_linker.id,type:"linker"};
            Pager.goTo("#searchPage");
        });

    };
    self.initPopupNew=function(){
        self.popupNew=$("#popupNew");
        self.newName=$("#popupNew_name");
        self.submitWrapper=$("#popupNew_submitwrapper");
        self.newName.on("keyup",function(e){
            if(self.newName.val()=="")
                self.submitWrapper.addClass("ui-state-disabled");
            else
                self.submitWrapper.removeClass("ui-state-disabled");
        });
        $("#popupNew_submit").click(function(e){
            e.preventDefault();
            var name=self.newName.val();
            var type=$("input[name='popupNew_radio']:checked").val();

            Parse.Cloud.run("createNotePage",
                {name: name,type: type})
            .then(function(res){
                var np=res;
                return Parse.Cloud.run("linksTo",
                    {fromId: self.cur_linker.id, toId: np.id, linksTo:true});
            })
            .then(function(){
                self.clearPage();
                self.renderPage();
                self.popupNew.popup("close");
            },
            function(err){$("#popupNew_error").text(err.message)}
            );
        });
    };
    self.initPopupRename=function(){
        $("#renameLinker_go").click(function(e){
            e.preventDefault();
            var newName=$("#renameLinker_newname").val();
            Parse.Cloud.run("renameNotePage",
                {noteId:self.cur_linker.id, newName: newName})
            .then(function(res){
                self.cur_linker.set('name',newName);
                $("#viewLinker_title").text(newName);
                $("#popupRenameLinker").popup("close");
            },function(err){
                alert(err.message);
            });
        });
    };
    self.onPage=function(){
        self.clearPage();
        if(Pager.stateData.cur_item_id)
            new Parse.Query(NotePage).get(Pager.stateData.cur_item_id)
                .then(function(result){
                    self.cur_linker=result;
                    Pager.stateData.cur_item_id=null;
                    self.renderPage();
                },
                function(err){
                    if(!cur_user||cur_user.dirty())
                        Pager.goTo("#splashPage",{},
                            {startPoint:"#viewLinkerPage", forceLogin: true});
                    else
                        alert(err.message);
                });
        else {
            if(!cur_user||cur_user.dirty())
                Pager.goTo("#splashPage",{},
                        {startPoint:"#viewLinkerPage", forceLogin: true});
            else {
                self.cur_linker=cur_user.get("mainpage");
                self.cur_linker.fetch().then(self.renderPage);
            }
        }
    };
    self.clearPage=function(){
        listFiller(self.list)();
        $.mobile.loading("show")
        $("#viewLinkerPage form").trigger("reset");
    };
    self.renderPage=function(){
        $("#viewLinker_title").text(self.cur_linker.get("name"));

        var cur_share=self.cur_linker.getACL().getPublicReadAccess();
        var cur_owner=(self.cur_linker.get('user').id==cur_user.id);
        if(Pager.stateData.addToNP){
            $("#viewLinker_link").parent("li").css("display","block");
            $("#viewLinker_share").parent("li").css("display","none");
            //$("#viewLinker_copy").parent("li").css("display","none");
        }
        else if(cur_owner){
            $("#viewLinker_link").parent("li").css("display","none");
            $("#viewLinker_share").parent("li").css("display","block");
            //$("#viewLinker_copy").parent("li").css("display","none");
            $("#viewLinker_share").text(cur_share ? "Shared" : "Private");
        }
        else {
            $("#viewLinker_link").parent("li").css("display","none");
            $("#viewLinker_share").parent("li").css("display","none");
            //$("#viewLinker_copy").parent("li").css("display","block");
        }

        self.cur_linker.relation("linksTo")
            .query().addAscending("name").find()
        .then(listFiller(
            self.list,
            makeClickHandler,
            cur_owner? makeDeleteHandler: null))
        .then(function(c_ids){
            Pager.stateData.children_ids=c_ids;
            $.mobile.loading("hide")
        });

        function makeClickHandler(child){
            return function(e){
                e.preventDefault();
                if(child.get("type")=="linker")
                    Pager.goTo("#viewLinkerPage",{cur_item_id:child.id});
                else if(child.get("type")=="note")
                    Pager.goTo("#viewNotePage",{cur_item_id:child.id});
            }
        };

        function makeDeleteHandler(child){
            return function(e){
                e.preventDefault();
                Parse.Cloud.run("linksTo",
                    {fromId: self.cur_linker.id, toId: child.id, linksTo: false})
                    .then(self.renderPage, function(err){alert(err.message)});
            }
        };
    }

};


var viewNotePage = new function(){
    var self=this;

    self.init=function(){
        self.footer=$("#viewNote_footer");
        self.editbtn=$("#viewNote_edit");
        self.content=$("#viewNote_content");
        self.tagsinp=$("#viewNote_tags");
        self.je=JaxEditable(self.content,{
            toolbar:$("#viewNote_toolbar"),
            imgEventHandler:function(e){
                var thisimage=$(this);
                var timer=0;
                function updateImage(){
                    clearTimeout(timer);
                    timer = setTimeout(function(){
                        thisimage.width($("#imgrepopup_width").val());
                        thisimage.height($("#imgrepopup_height").val());
                    },500);
                };
                $("#imgrepopup_width").val(thisimage.width());
                $("#imgrepopup_height").val(thisimage.height());
                $("#viewNote_je_imgrepopup").popup('open');
                $("#imgrepopup_width").on("input",updateImage);
                $("#imgrepopup_height").on("input",updateImage);
            }
        });
        $("#viewNote_je_imgrepopup submit").click(function(){
            e.preventDefault();
            $("#viewNote_je_imgrepopup").popup('click');
        });
        $("#viewNote_toolbar").find(".je-icon-save").click(function(e){
            e.preventDefault();
            $("#viewNote_content .MathJax_Display").dblclick();
            $("#viewNote_content .MathJax").dblclick();

            $("#viewNote_je_savingpopup").text("saving...");
            $("#viewNote_je_savingpopup").popup("open");
            Parse.Cloud.run("editText",
                {noteId: self.cur_note.id,
                newText: self.content.html(),
                newTags: self.tagsinp.val()})
            .then(function(res){
                self.footer.css("display","block");
                $("#viewNote_tagsp").html(self.tagsinp.val());
                $(".whenEditingNote").css("display","none");
                $(".whenViewingNote").css("display","block");
                self.editbtn.text("Edit");
                runCloudUpdate();

                $("#viewNote_je_savingpopup").text("saved!");
                setTimeout(function(){
                    $("#viewNote_je_savingpopup").popup("close");},300);
            },function(error){
                alert(error.message);
            });
            self.relatex();
        });
        (function(){
            var range;
            $("#viewNotePage").find(".je-icon-imgupload").click(function(e){
                e.preventDefault();
                window.open("http://postimage.org/index.php?mode=website&areaid="+"0"+"&hash=1&lang="+"english"+"&code=&content=&forumurl="+escape(window.location.origin+"/plugins/postimage/handleimageupload.html"),"postimage","resizable=yes,width=500,height=400");
            })
            $("#viewNotePage").find(".je-icon-imgwww").click(function(e){
                e.preventDefault();
                $("#viewNote_imgsrc").val("");
                range=rangy.getSelection().getRangeAt(0)
                setTimeout(function(){
                    $('#viewNote_je_imgwwwpopup').popup('open');},
                    200);
            });
            (function(){
                var timer = 0;
                $("#viewNote_imgsrc").on("input",function(e){
                    clearTimeout (timer);
                    timer = setTimeout(function(){
                        $("#viewNote_je_imgwwwpopup img")
                            .prop("src",$("#viewNote_imgsrc").val())},
                        500);
                });
            })();
            $("#viewNote_imgwwwsubmit").click(function(e){
                e.preventDefault();
                $("#viewNote_je_imgwwwpopup").popup("close");
                self.je.insertImage($("#viewNote_imgsrc").val(),range);
            });
            $("#viewNotePage").find(".je-icon-imgdoodle").click(function(e){
                e.preventDefault();
                range=rangy.getSelection().getRangeAt(0)
                setTimeout(function(){
                    $('#viewNote_je_imgdoodlepopup').popup('open');},
                    200);
            });
            $("#viewNote_imgdoodlesubmit").click(function(e){
                e.preventDefault();
                $("#viewNote_je_imgdoodlepopup").popup("close");
                self.je.insertImage($("#viewNote_sketch").get(0).toDataURL(),range);
            });
        })();

        $("#viewNote_insert").click(function(e){
            e.preventDefault();
            $("#popupInsert").popup("open");
        });

        $("#viewNote_share").click(function(e){
            e.preventDefault();
            var cur_share=($("#viewNote_share").text()=="Shared");
            Parse.Cloud.run("shareNotePage",
                {noteId:self.cur_note.id, share: !cur_share})
            .then(function(res){
                if (cur_share)
                    $("#viewNote_share").text("Private");
                else
                    $("#viewNote_share").text("Shared");
                runCloudUpdate();
            },
            function(error){
                alert(error.message);
            });
        });

        $("#viewNote_title").click(function(e){
            $("#renameNote_newname").val( self.cur_note.get("name"));
            $("#popupRenameNote").popup("open",{y:0});
        });
        $("#renameNote_go").click(function(e){
            e.preventDefault();
            var newName=$("#renameNote_newname").val();
            Parse.Cloud.run("renameNotePage",
                {noteId:self.cur_note.id, newName: newName})
            .then(function(res){
                self.cur_note.set('name',newName);
                $("#viewNote_title").text(newName);
                $("#popupRenameNote").popup("close");
            },function(err){
                alert(err.message);
            });
        });
        $("#viewNote_link").click(function(e){
            e.preventDefault();
            console.log('vnl');
            if(Pager.stateData.addToNP.type=="linker"){console.log('tl');
                Parse.Cloud.run("linksTo",
                    {   fromId: Pager.stateData.addToNP.id,
                        toId: self.cur_note.id,
                        linksTo: true
                    })
                .then(function(){
                    Pager.goBackTo("addTo",{})
                },function(error){
                    alert(error.message);
                });}
            else{
                console.log('abouttogobackto');
                Pager.goBackTo("addTo",
                    {   toPage:
                            {id:self.cur_note.id,
                            type:self.cur_note.get("type"),
                            name:self.cur_note.get("name")}});
            }
        });

    }

    /*self.preview=function(){
        var cont=self.inp.val();

        var firstline=cont.split('\n')[0];
        var htmlmode=firstline.match(/\[html\]/);
        var latexmode=!(firstline.match(/\[nolatex\]/));
        var previewmode=!(firstline.match(/\[nopreview\]/));
        if(htmlmode||(!latexmode)||(!previewmode))
            cont=cont.substring(cont.indexOf('\n')+1);

        //console.log(cont);
        //console.log([htmlmode,latexmode,previewmode]);
        if(previewmode || self.editbtn.text()=="Edit"){
            $("#viewNote_contentwrap").css("display","block");

            $("#viewNote_macros").text(
                (self.cur_note.get("user").get("preamble")||"")
                    .replace(/\\endgroup/g,"\\\\end group"));
            $("#viewNote_begingroup").text("$\\begingroup$");
            $("#viewNote_endgroup").text("$\\endgroup$");

            if(!htmlmode)
                cont=$("<div></div>").text(cont).html()
                    .replace(/\n/g,"<br/>")
                    .replace(/''''(.+?)''''/g,
                        "<h3 style='margin-top:0px;margin-bottom:0'>$1</h3>")
                    .replace(/'''(.+?)'''/g,"<strong>$1</strong>")
                    .replace(/''(.+?)''/g  ,"<em>$1</em>");
            cont=cont
                .replace(/\[\[([^\|]+)\|([^\|]+)\|([^\]]+)\]\]/g,
                    '<a class="internal" href="#view$1Page?id=$2">$3</a>')
                .replace(/\\endgroup/g,"\\\\end group");
            self.content.html(cont); 
            $("#viewNote_content a:not(.internal)")
                .prop("target","_blank");
            $(".internal").click(function(e){
                e.preventDefault();
                try {
                    Pager.stateData.cur_item_id=$(this).prop("href").split("=")[1];
                    Pager.goTo($(this).prop("href").split("?")[0]);
                } catch(e) {
                    alert("Invalid link!  Maybe this page was deleted"+
                        " or maybe you you should try recreating the link?");
                }
            });

            if(latexmode) self.relatex();
        }
        else
            $("#viewNote_contentwrap").css("display","none");
    }*/

    self.relatex=function(){
        self.je.reLatex();
    }
    
    self.onPage=function(){
        $("#viewNote_je_savingpopup")
            .popup("option","positionTo",".je-icon-save");
        self.clearPage();
        new Parse.Query(NotePage)
            .include("user").get(Pager.stateData.cur_item_id)
        .then(function(result){
            self.cur_note=result;
            return new Parse.Query(Tagging)
                .equalTo("note",self.cur_note)
                .include("tag")
                .find();
        }).then(function(result){
            console.log("res");
            console.log(result);
            glob=result;
            self.cur_tags=result.map(function(t){return t.get('tag').get('name')});
            Pager.stateData.cur_item_id=null;
            self.renderPage();
        },
        function(error){
            if(!cur_user||cur_user.dirty())
                Pager.goTo("#splashPage",{},
                        {startPoint:"#viewNotePage", forceLogin: true});
            else
                alert(error.message);
        });
    }

    self.clearPage=function(){
        $.mobile.loading("show")
        self.content.html("");
        $("#viewNote_tagsp").html("");
        $("#viewNote_ownerp").html("");
        $(".whenEditingNote").css("display","none");
        $(".whenViewingNote").css("display","block");
        if(self.editbtn.text()=="Cancel")
            self.editbtn.click();
    }

    self.renderPage=function(){
        $("#viewNote_title").text( self.cur_note.get("name"));
        self.tagsinp.val(self.cur_tags.join("; "));
        $("#viewNote_tagsp").html(self.tagsinp.val());
        $("#viewNote_ownerp").html(
                "<strong>Owner</strong>: "
                +self.cur_note.get("user").get("displayname"));
        $("#viewNote_content").html( self.cur_note.get("content"));
        self.je.handle();
        $("#viewNote_macros").text(
            (self.cur_note.get("user").get("preamble")||"")
                .replace(/\\endgroup/g,"\\\\end group"));
        $("#viewNote_begingroup").text("$\\begingroup$");
        $("#viewNote_endgroup").text("$\\endgroup$");
        self.relatex();

        var cur_share=self.cur_note.getACL().getPublicReadAccess();
        var cur_owner=(self.cur_note.get('user') &&
                self.cur_note.get('user').id==cur_user.id);
        if (cur_owner)
            self.editbtn.css("display","block")
        else
            self.editbtn.css("display","none")
        if(Pager.stateData.addToNP){
            $("#viewNote_link").parent("li").css("display","block");
            $("#viewNote_share").parent("li").css("display","none");
            //$("#viewNote_copy").parent("li").css("display","none");
        }
        else if(cur_owner){
            $("#viewNote_link").parent("li").css("display","none");
            $("#viewNote_share").parent("li").css("display","block");
            //$("#viewNote_copy").parent("li").css("display","none");
            $("#viewNote_share").text(cur_share?"Shared" : "Private");
        }
        else {
            $("#viewNote_link").parent("li").css("display","none");
            $("#viewNote_share").parent("li").css("display","none");
            //$("#viewNote_copy").parent("li").css("display","block");
        }

        if(Pager.stateData.noteState){
            console.log('has nS');
            var text=Pager.stateData.noteState.text;
            var pos=Pager.stateData.noteState.pos;
            var textBefore=text.substring(0,pos);
            var textAfter=text.substring(pos);
            var linkText=
                Pager.stateData.toPage ?
                    Pager.stateData.toPage.type.capitalize()+"|"+
                    Pager.stateData.toPage.id+
                    "|"+Pager.stateData.toPage.name+"]]"
                    : "";
            //self.inp.val(textBefore+linkText+textAfter);
            self.editbtn.click();
            //self.inp.selectRange(pos+linkText.length);
            Pager.stateData.noteState=null;
            Pager.stateData.toPage=null;
            Pager._historyStates[Pager._historyPointer][1].noteState=null;
            Pager._historyStates[Pager._historyPointer][1].toPage=null;
        }

        $.mobile.loading("hide");
        self.content.focus();
    }
}


var recycledPage = new function(){
    var self = this;

    self.init=function(){
        self.list=$("#recycled_list");
    };

    self.onPage=function(){
        if(!cur_user||cur_user.dirty())
            Pager.goTo("#splashPage",{},
                    {startPoint:"#recycledPage"});
        else{
            self.clearPage();
            self.renderPage();
        }
    };

    self.clearPage=function(){
        listFiller(self.list)();
        $.mobile.loading("show")
    };


    self.renderPage=function(){
        new Parse.Query(NotePage)
        .equalTo("user",cur_user)
        .equalTo("lost",true)
        .select("name")
        .select("type")
        .find()
        .then(function(res){
            listFiller(self.list,makeClickHandler,makeDeleteHandler)(res);
            $.mobile.loading("hide");
        });

        function makeClickHandler(item){
            return function(e){
                e.preventDefault();
                if(item.get("type")=="linker")
                    Pager.goTo("#viewLinkerPage",{cur_item_id:item.id});
                else if(item.get("type")=="note")
                    Pager.goTo("#viewNotePage",{cur_item_id:item.id});
            }
        }

        function makeDeleteHandler(item){
            return function(e){
                e.preventDefault();
                Parse.Cloud.run("deleteNotePage", {objId: item.id})
                    .then(self.renderPage,function(err){alert(err.message)});
            }
        }
    
    }
};

var latexPage = new function() {
    var self=this;
    
    self.init=function(){
        self.pre_input=$("#latex_preInput");
        self.pre_content=$("#latex_preContent");
        self.auto_input=$("#latex_autoInput");
        self.short_input=$("#latex_shortInput");
        self.save=$("#latex_save");
        self.preview=$("#latex_preview");
        self.latexmath=canonicalLatexMath;

        self.preview.click(function(e){
            e.preventDefault();
            self.pre_content.html(
                "$\\begingroup$"
                +self.pre_input.val().replace(/\\endgroup/g,"\\\\end group")
                +"$\\endgroup$");
            self.pre_content.typeset();
            self.latexmath=
                canonicalLatexMath.concat(
                    self.auto_input.val().split("\n")
                    .map(function(s){return s.substring(1)}));

            self.shorts={};
            var shortlines=self.short_input.val().split("\n");
            for(var l=0; l<shortlines.length; l++) try {
                var splitline=shortlines[l].split(/\s+/,2);
                var shortcut=splitline[0];
                var rep=(splitline.length>1) ? splitline[1] : "";
                if (shortcut=="" || rep=="") continue;
                self.shorts[shortcut]=rep;
            } catch (e) {alert(e)}

        });

        self.save.click(function(e){
            self.preview.click();
            cur_user.set("preamble",self.pre_input.val());
            cur_user.set("autocomplete",self.auto_input.val());
            cur_user.set("shortcuts",self.short_input.val());
            cur_user.save()
            .then(function(res){
                $("#latex_message")
                    .html("<span style='color:green'>Changes saved</span>");
                setTimeout(function(){Pager.goTo("#mainPage");},500);
                self.transmitToJaxEditable();
            },function(err){
                $("#latex_message")
                    .html("<span style='color:red'>"+err.message+"</span>");
            })
        });
        $("#latexPage form").on("change",function(e){
                $("#latex_message").html("");});

    };

    self.transmitToJaxEditable=function(){
        viewNotePage.je.setPreamble(self.pre_input.val());
        viewNotePage.je.setAutocompletes(self.auto_input.val().split("\n"));
        viewNotePage.je.setShortcuts(self.shorts,
            {prevLatexPoint:"jj",nextLatexPoint:"kk",reLatex:"yy"});
    }

    self.onPage=function(){
        if(!cur_user||cur_user.dirty())
            Pager.goTo("#splashPage",{},
                    {startPoint:"#latexPage"});
        else{
            $.mobile.loading("show");
            self.renderPage();
        }
    };

    self.renderPage=function(){
        self.pre_input.val(cur_user.get("preamble"));
        self.auto_input.val(cur_user.get("autocomplete"));
        self.short_input.val(cur_user.get("shortcuts"));
        $("#latex_message").html("");
        self.preview.click();
        $.mobile.loading("hide");
    }

};

var searchPage = new function(){
    var self=this;

    self.init=function(){
        self.list=$("#search_list");
        self.namefilter=$("#search_name");
        self.tagfilter=$("#search_tag");

        var delay = (function(){
          var timer = 0;
          return function(callback, ms){
            clearTimeout (timer);
            timer = setTimeout(callback, ms);
          };
        })();
        self.namefilter.on("keyup",function(){delay(self.renderPage,400)});
        self.tagfilter.on("keyup",function(){delay(self.renderPage,400)});

        // I implement my own memoization routine rather than use
        // the one built into jQuery Text Complete, because I want
        // to be able to clear the cache if the user changes their
        // auto-complete preferences.
        var memo={};
        var memsearch=function(term,callback){
            if (!memo[term]){
                var npQuery=new Parse.Query(NotePage);
                if ($("input[name=search_source]:checked").val()=="mine")
                    npQuery.equalTo("user",cur_user);
                else
                    npQuery.notEqualTo("user",cur_user);
                if (Pager.stateData.addToNP)
                    npQuery.notContainedIn("objectId",
                            Pager.stateData.children_ids.concat(
                                [Pager.stateData.addToNP.id,cur_user.get("mainpage").id]))
                var query=new Parse.Query(Tagging)
                    .include("tag")
                    .matchesQuery("tag",new Parse.Query(Tag)
                        .contains('name',term.replace(/^\s*|\s*$/g,"").toLowerCase()))
                    .matchesQuery("note",npQuery)
                    .limit(10)
                    .find()
                .then(function(tags){
                    memo[term]=tags.map(function(t){return t.get("tag").get("name")});
                    callback(memo[term]);
                });
            }
            else
                callback(memo[term]);
        };
        self.memclear=function(){
            memo={};
        };
        self.tagfilter.textcomplete([{
                match: /([^;]+)$/,
                search: memsearch,
                replace: function(value){
                    return value;
                    delay(self.renderPage,400);
                },
                index: 1,
                cache: false
        }]);

        $("#search_fieldset").height(
            Math.round($("#search_sourceMine").parent().height()*1.5));
        $("input[name=search_source]").click(self.renderPage);
    };

    self.onPage=function(){
        if(!cur_user||cur_user.dirty())
            Pager.goTo("#splashPage",{},
                    {startPoint:"#searchPage"});
        else{
            self.clearPage();
            self.renderPage();
            self.memclear();
        }
    };

    self.clearPage=function(){
        listFiller(self.list)();
        $.mobile.loading("show");
    };

    self.renderPage=function(){
        var namepart=self.namefilter.val().toLowerCase();
        var tags=self.tagfilter.val().toLowerCase().split(";")
            .map(function(t){return t.replace(/^\s*|\s*$/g,"")})
            .filter(function(t){return (t!="")});

        var npQuery=new Parse.Query(NotePage);
        if ($("input[name=search_source]:checked").val()=="mine")
            npQuery.equalTo("user",cur_user);
        else
            npQuery.notEqualTo("user",cur_user);
        npQuery
        .addAscending("name")
        .select("name")
        .select("type")
        .contains("lowercase_name",namepart);
        if (Pager.stateData.addToNP)
            npQuery.notContainedIn("objectId",
                    Pager.stateData.children_ids.concat(
                        [Pager.stateData.addToNP.id,cur_user.get("mainpage").id]));
        
        (function (){
            if (!tags.length)
                return npQuery.find();
            else 
                return new Parse.Query(Tagging)
                .include("note")
                .matchesQuery("tag",new Parse.Query(Tag).containedIn("name",tags))
                .matchesQuery("note",npQuery)
                .find()
                .then(function(tags){
                    return Parse.Promise.as(
                        tags.map(function(t){return t.get('note')}))});
        })()
        .then(function(res){
            listFiller(self.list,makeClickHandler,false)(res);
            $.mobile.loading("hide");
        });
    
        function makeClickHandler(item){
            return function(e){
                e.preventDefault();
                if(item.get("type")=="linker")
                    Pager.goTo("#viewLinkerPage",{cur_item_id:item.id});
                else if(item.get("type")=="note")
                    Pager.goTo("#viewNotePage",{cur_item_id:item.id});
            }
        }
    }
};

var aboutPage= new function(){
    var self=this;
    self.init=function(){};
    self.onPage=function(){
        $("#aboutPage").rerender();
    };
};


var userPage= new function(){
    var self=this;
    self.init=function(){
        $("#userPage form").on("change",function(e){
                $("#user_message").html("");});
        $("#user_save").click(function(e){
            e.preventDefault();
            cur_user.set("displayname",$("#user_name").val());
            cur_user.set("username",$("#user_name").val().toLowerCase());
            cur_user.set("email",$("#user_email").val());
            cur_user.set("bio",$("#user_bio").val());
            cur_user.save()
            .then(function(res){
                $("#user_message")
                    .html("<span style='color:green'>Changes saved</span>");
                setTimeout(function(){Pager.goTo("#mainPage");},500);
            },function(err){
                $("#user_message")
                    .html("<span style='color:red'>"+err.message+"</span>");
            })
        });
    };
    self.onPage=function(){
        if(!cur_user||cur_user.dirty())
            Pager.goTo("#splashPage",{},
                    {startPoint:"#userPage"});
        else
            self.renderPage();
    };
    self.renderPage=function(){
        $("#user_name").val(cur_user.get('displayname'));
        $("#user_email").val(cur_user.get('email'));
        $("#user_bio").val(cur_user.get('bio'));
        $("#user_message").html("");
    };
};

function runCloudUpdate(){
    function doit(){
        console.log('about to run cU');
        return Parse.Cloud.run("checkUpdates")
        .then(function(res){
            return Parse.Promise.as(res);
        },function(err){
            if (err.message=="Execution timed out" ||
                err.message=="success/error was not called")
                return doit();
            else{
                console.log(err);
                return Parse.Promise.error(err);
            }
        });
    }
    return doit();
}


//fordebugging
var x;
function res(prom){
    prom.then(function(r){
        x=r;
        console.log(r);
    },
    function(e){
        console.log(e.message);
    });
}
$(window).load(initNoteTeXer);
