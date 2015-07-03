"use strict";

var cur_user;
var glob;
var prodmode=false;


function initNoteTeXer(){

    console.log('Starting NoteTeXer');
    configureParse();
    configureMathJax();
    configurePager();
    configureFacebook();

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
    $.fn.typeset=function(){
        if(typeof MathJax =="undefined")
            configureMathJax();
        MathJax.Hub.Queue(["Typeset",MathJax.Hub,this.get(0)]);
    }
    $.fn.rerender=function(){
        if(typeof MathJax =="undefined")
            configureMathJax();
        MathJax.Hub.Queue(["Rerender",MathJax.Hub,this.get(0)]);
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
        "#addLinkPage": addLinkPage,
        "#recycledPage": recycledPage,
        "#latexPage": latexPage,
        "#searchPage": searchPage,
        "#aboutPage": aboutPage,
        "#userPage": userPage
    });
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
    $.fn.selectRange = function(start, end) {
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
    }

}

function listFiller(listElt,makeClickHandler,makeDeleteHandler){
    return function(items){
        listElt.html("");
        var item_ids=[];
        if (items.length==0) 
            listElt.append($("<div style='text-align: center; margin: auto'>(No notes found)</div>"));
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
        self.renderPage();
        Pager.stateData.addToNP=null;
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
        localStorage["hasAccount"]=true;
        self.fornew.css("display","none");
        cur_user.fetch()
        .then(function(res){
            try{
                return cur_user.get("mainpage").fetch()}
            catch (err) {
                return Parse.Promise.error(
                    new Parse.Error(Parse.Error.INVALID_POINTER,
                    "Couldn't get mainpage: "+err.message));}
        }).then(
            self.continueToMain
        ,function(error){
            alert(error.message);
            Parse.User.logOut();
            self.fornew.css("display","block");
        });
    };

    self.continueToMain=function(){
        latexPage.renderPage();
        setTimeout(function(){Pager.goTo("#mainPage");},1500);
    };

    self.presentAuth=function(){
        $("#splashPage form").trigger('reset');
        $("#letsgo_signuperror").text("");
        $("#letsgo_loginerror").text("");
        $("#letsgo_fberror").text("");
        $("#resetpass_error").text("");
        if (localStorage["hasAccount"]=="true"){
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
        cur_user=Parse.User.current();
        if(cur_user) self.gotUser();
        else self.fornew.css("display","block");
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
                Parse.Cloud.run("addLink",
                    {fromId: Pager.stateData.addToNP.id,
                        toId: self.cur_linker.id})
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
                return Parse.Cloud.run("addLink",
                    {fromId: self.cur_linker.id, toId: np.id});
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
                    self.renderPage();
                },
                function(){
                    self.renderPage();
                });
        else {
            self.cur_linker=cur_user.get("mainpage");
            self.cur_linker.fetch().then(self.renderPage);
        }
    };
    self.clearPage=function(){
        self.list.html("");
        $("#viewLinkerPage form").trigger("reset");
    };
    self.renderPage=function(){
        $("#viewLinker_title").text(self.cur_linker.get("name"));

        var cur_share=self.cur_linker.getACL().getPublicReadAccess();
        var cur_owner=(self.cur_linker.get('user').id==cur_user.id);
        if(Pager.stateData.addToNP){
            $("#viewLinker_link").parent("li").css("display","block");
            $("#viewLinker_share").parent("li").css("display","none");
            $("#viewLinker_copy").parent("li").css("display","none");
        }
        else if(cur_owner){
            $("#viewLinker_link").parent("li").css("display","none");
            $("#viewLinker_share").parent("li").css("display","block");
            $("#viewLinker_copy").parent("li").css("display","none");
            $("#viewLinker_share").text(cur_share ? "Shared" : "Private");
        }
        else {
            $("#viewLinker_link").parent("li").css("display","none");
            $("#viewLinker_share").parent("li").css("display","none");
            $("#viewLinker_copy").parent("li").css("display","block");
        }

        self.cur_linker.relation("linksTo")
            .query().addAscending("name").find()
        .then(listFiller(
            self.list,
            makeClickHandler,
            cur_owner? makeDeleteHandler: null))
        .then(function(c_ids){Pager.stateData.children_ids=c_ids});

        function makeClickHandler(child){
            return function(e){
                e.preventDefault();
                Pager.stateData.cur_item_id=child.id;
                if(child.get("type")=="linker") Pager.goTo("#viewLinkerPage");
                else if(child.get("type")=="note") Pager.goTo("#viewNotePage");
            }
        };

        function makeDeleteHandler(child){
            return function(e){
                e.preventDefault();
                Parse.Cloud.run("removeLink",
                    {fromId: self.cur_linker.id, toId: child.id})
                    .then(self.renderPage, function(err){alert(err.message)});
            }
        };
    }

};


var viewNotePage = new function(){
    var self=this;

    self.init=function(){
        self.footer=$("#viewNote_footer");
        self.editfooter=$("#viewNote_editfooter");
        self.inp=$("#viewNote_input");
        self.editbtn=$("#viewNote_edit");
        self.content=$("#viewNote_content");
        self.tagsinp=$("#viewNote_tags");

        $("#viewNote_copy").click(function(e){
            Parse.Cloud.run("copyNotePage",{noteId:self.cur_note.id})
            .then(function(res){
                Pager.stateData.cur_item_id=res.id;
                Pager._historyStates[Pager._historyPointer][1].cur_item_id=res.id;
                self.cur_note=res;
                self.renderPage();
            },
            function(err){
                alert(err.message);
            });
        });

        (function(){

            // For tracking xx -> insert
            var prevKey=-1;
            var prevKeyTime=0;
            var xKeyCode=88;
            var jKeyCode=74;
            var kKeyCode=75;
            var lbracKeyCode=219;

            // For tracking live preview
            var prevText=self.inp.val();
            var prevdelay = (function(){
              var timer = 0;
              return function(callback, ms){
                clearTimeout(timer);
                timer = setTimeout(callback, ms);
              };
            })();

            // keyup in the note input
            self.inp.on("keyup",function(e){

                // Ignore arrow keys
                if([37,38,39,40].indexOf(e.keyCode)!=-1)
                    return;

                var text=self.inp.val();
                var pos=self.inp.getCursorPosition();

                // For tracking xx -> insert
                var now = new Date().getTime();
                if (prevKey==xKeyCode && e.keyCode==prevKey && (now-prevKeyTime)<1000){
                    self.inp.val(text.substr(0,pos-2)+text.substr(pos));
                    self.inp.selectRange(pos-2);
                    prevKey=-1;
                    $("#popupInsert").popup("open");
                    return;
                }
                if (prevKey==jKeyCode && e.keyCode==prevKey && (now-prevKeyTime)<1000){
                    self.inp.val(text.substr(0,pos-2)+text.substr(pos));
                    self.inp.selectRange(pos-2);
                    self.nextAnchor();
                    prevKey=-1;
                    return;
                }
                if (prevKey==kKeyCode && e.keyCode==prevKey && (now-prevKeyTime)<1000){
                    var textBefore=text.substr(0,pos-2).replace(/\/\#\//g,"");
                    var textAfter=text.substr(pos).replace(/\/\#\//g,"");
                    self.inp.val(textBefore+textAfter);
                    self.inp.selectRange(textBefore.length);
                    prevKey=-1;
                    return;
                }
                if (prevKey==lbracKeyCode && e.keyCode==prevKey && (now-prevKeyTime)<1000){
                    Pager._historyStates[Pager._historyPointer][1].noteState={text:text,pos:pos};
                    Pager.stateData.addToNP={
                        id:self.cur_note.id,
                        type:"note",
                        text:text, pos:pos};
                    Pager.stateData.children_ids=[];
                    Pager.anchor("addTo");
                    Pager.goTo("#searchPage");
                }
                prevKey=e.keyCode;
                prevKeyTime=now;

                // For shortcuts
                var shortcutMatch=text.substring(0,pos)
                    .match(latexPage.shortregex);
                if (shortcutMatch){
                    var shortcut=shortcutMatch[0];
                    var rep=latexPage.shorts[shortcut];
                    if (rep){
                        var posbefore=pos-shortcut.length;
                        var posafter=posbefore+rep.length;
                        self.inp.val(
                                text.substring(0,posbefore)
                                +rep
                                +text.substring(pos));
                        if (rep.indexOf("/#/")>0){
                            self.inp.selectRange(posbefore);
                            self.nextAnchor();
                        }
                        else
                            self.inp.selectRange(posafter);
                   }
                }
                

                if(prevText!=self.inp.val()){
                    prevText=self.inp.val();
                    prevdelay(function(){
                        if (self.inp.val()!=self.content.html()){
                            self.preview();
                        }
                    },1000);
                }
        })})();

        // Apply jQuery Text Complete for this input
        (function(){

            // I implement my own memoization routine rather than use
            // the one built into jQuery Text Complete, because I want
            // to be able to clear the cache if the user changes their
            // auto-complete preferences.
            var memo={};
            var memsearch=function(term,callback){
                if (!memo[term])
                    memo[term]=
                        latexPage.latexmath.filter(function(elt,ind,arr){
                            return elt.startsWith(term);});
                callback(memo[term]);
            };
            self.memclear=function(){
                memo={};
            };

            // Autocomplete selected commands starting with a backslash
            self.inp.textcomplete([{
                match: /\\(\w*)$/,
                search: memsearch,
                replace: function(value){
                    var sp=value.indexOf("/#/");
                    if (sp==-1)
                        return "\\"+value;
                    else
                        return ["\\"+value.substring(0,sp),
                            value.substring(sp+3)];
                },
                index: 1,
                cache: false
        }])})();

        $("#viewNote_insert").click(function(e){
            e.preventDefault();
            $("#popupInsert").popup("open");
        });

        $("#viewNote_save").click(function(e){
            e.preventDefault();
            Parse.Cloud.run("editText",
                {noteId: self.cur_note.id, newText: self.inp.val(), newTags: self.tagsinp.val()})
            .then(function(res){
                self.editfooter.css("display","none");
                self.footer.css("display","block");
                $("#viewNote_tagsp").html("<strong>Tags</strong>: "+self.tagsinp.val());
                $(".whenEditingNote").css("display","none");
                $(".whenViewingNote").css("display","block");
                self.editbtn.text("Edit");
                self.preview();
            },function(error){
                alert(error.message);
            });
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
            },
            function(error){
                alert(error.message);
            });
        });
        self.editbtn.click(function(e){
            e.preventDefault();
            if(self.editbtn.text()=="Edit"){
                self.footer.css("display","none");
                self.editfooter.css("display","block");
                $(".whenEditingNote").css("display","block");
                $(".whenViewingNote").css("display","none");
                self.inp.trigger("keyup");
                self.editbtn.text("Cancel");
            }
            else if(self.editbtn.text()=="Cancel"){
                self.editfooter.css("display","none");
                self.footer.css("display","block");
                $(".whenEditingNote").css("display","none");
                $(".whenViewingNote").css("display","block");
                self.editbtn.text("Edit");
                self.inp.val(self.inp.text());
                self.preview();
            }
        });


        (function(){
            var toPos=self.inp.getCursorPosition();
            $("#popupInsert").on("popupafteropen",function(){
                $("#popupInsert form").trigger("reset");

                self.inp.on("focus",function(e){
                    e.preventDefault();
                    self.inp.off("focus");
                    self.inp.selectRange(toPos);
                });
            });
            $("#popupInsert select").on("change",function(e){
                e.preventDefault();
                self.insert($(this).val());
                self.preview();
                $("#popupInsert").popup("close");
                self.inp.focus();
                self.inp.on("click",function(e){
                    e.preventDefault();
                    self.inp.off("click");
                    self.inp.selectRange(toPos);
                });


            });
            self.insert=function(toInsert){
                var posbefore=self.inp.getCursorPosition();
                var posafter=posbefore+toInsert.length;
                var text=self.inp.val();
                self.inp.val(text.substr(0,posbefore)
                        +toInsert
                        +text.substr(posbefore));
                if (toInsert.indexOf("/#/")>0){
                    self.inp.selectRange(posbefore);
                    self.nextAnchor();
                }
                else
                    self.inp.selectRange(posafter);
                self.preview();
            }
        })();

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
                Parse.Cloud.run("addLink",
                    {   fromId: Pager.stateData.addToNP.id,
                        toId: self.cur_note.id})
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

    self.nextAnchor=function(){
        var toPos=self.inp.val().indexOf("/#/",self.inp.getCursorPosition());
        if (toPos>0)
            self.inp.selectRange(toPos,toPos+3);
    }

    self.preview=function(){
        var cont=self.inp.val();

        var firstline=cont.split('\n')[0];
        var htmlmode=firstline.match(/\[html\]/);
        var latexmode=!(firstline.match(/\[nolatex\]/));
        var previewmode=!(firstline.match(/\[nopreview\]/));
        if(htmlmode||(!latexmode)||(!previewmode))
            cont=cont.substring(cont.indexOf('\n')+1);

        console.log(cont);
        console.log([htmlmode,latexmode,previewmode]);
        if(previewmode || self.editbtn.text()=="Edit"){
            $("#viewNote_contentwrap").css("display","block");
            if(!htmlmode)
                cont=$("<div></div>").text(cont).html()
                    .replace(/\n/g,"<br/>")
                    .replace(/''''(.+?)''''/g,"<h3 style='margin-bottom:0'>$1</h3>")
                    .replace(/'''(.+?)'''/g,"<strong>$1</strong>")
                    .replace(/''(.+?)''/g  ,"<em>$1</em>");
            cont=cont
                .replace(/\[\[([^\|]+)\|([^\|]+)\|([^\]]+)\]\]/g,
                    '<a class="internal" href="#view$1Page?id=$2">$3</a>');
            self.content.html(cont); 
            if(latexmode)
                self.content.typeset();
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
        }
        else
            $("#viewNote_contentwrap").css("display","none");
    }
    
    self.onPage=function(){
        self.clearPage();
        new Parse.Query(NotePage).include("user").get(Pager.stateData.cur_item_id)
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
            self.renderPage();
        },
        function(error){
            alert(error.message);
        });
    }

    self.clearPage=function(){
        self.inp.val("");
        self.inp.text("");
        self.content.html("");
        $(".whenEditingNote").css("display","none");
        $(".whenViewingNote").css("display","block");
        if(self.editbtn.text()=="Cancel")
            self.editbtn.click();
    }

    self.renderPage=function(){
        $("#viewNote_title").text( self.cur_note.get("name"));
        self.tagsinp.val(self.cur_tags.join("; "));
        $("#viewNote_tagsp")
            .html("<strong>Tags</strong>: "+self.tagsinp.val());
        $("#viewNote_ownerp")
            .html("<strong>Owner</strong>: "+self.cur_note.get("user").get("displayname"));

        var cur_share=self.cur_note.getACL().getPublicReadAccess();
        var cur_owner=(self.cur_note.get('user').id==cur_user.id);
        if (cur_owner)
            self.editbtn.css("display","block")
        else
            self.editbtn.css("display","none")
        if(Pager.stateData.addToNP){
            $("#viewNote_link").parent("li").css("display","block");
            $("#viewNote_share").parent("li").css("display","none");
            $("#viewNote_copy").parent("li").css("display","none");
        }
        else if(cur_owner){
            $("#viewNote_link").parent("li").css("display","none");
            $("#viewNote_share").parent("li").css("display","block");
            $("#viewNote_copy").parent("li").css("display","none");
            $("#viewNote_share").text(cur_share?"Shared" : "Private");
        }
        else {
            $("#viewNote_link").parent("li").css("display","none");
            $("#viewNote_share").parent("li").css("display","none");
            $("#viewNote_copy").parent("li").css("display","block");
        }
        self.inp.text( self.cur_note.get("content"));
        self.inp.val(  self.cur_note.get("content"));

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
            self.inp.val(textBefore+linkText+textAfter);
            self.editbtn.click();
            self.inp.selectRange(pos+linkText.length);
            Pager.stateData.noteState=null;
            Pager.stateData.toPage=null;
            Pager._historyStates[Pager._historyPointer][1].noteState=null;
            Pager._historyStates[Pager._historyPointer][1].toPage=null;
        }



        self.preview();
    }
}

////////////////


var addLinkPage = new function(){
    var self=this;

    self.init=function(){
        self.list=$("#addLink_list");
    };

    self.onPage=function(){
        self.clearPage();
        self.cur_linker=cur_user.get("mainpage");
        if(Pager.stateData.cur_item_id)
            new Parse.Query(NotePage).get(Pager.stateData.cur_item_id)
                .then(function(result){
                    self.cur_linker=result;
                    self.renderPage();
                },
                function(){
                    self.renderPage();
                });
        else
            self.renderPage();
    };

    self.clearPage=function(){
        self.list.html("");
    };

    self.renderPage=function(){
        new Parse.Query(NotePage)
        .equalTo("user",cur_user)
        .select("name")
        .select("type")
        .notContainedIn("objectId",
                Pager.stateData.children_ids.concat(
                    [self.cur_linker.id,cur_user.get("mainpage")]))
        .find()
        .then(listFiller(self.list,makeClickHandler,false));
    
        function makeClickHandler(item){
            return function(e){
                e.preventDefault();
                Parse.Cloud.run("addLink",
                    {fromId: self.cur_linker.id, toId: item.id})
                .then(Pager.goBack,function(error){alert(error.message);});
            }
        }
    }
};

var recycledPage = new function(){
    var self = this;

    self.init=function(){
        self.list=$("#recycled_list");
    };

    self.onPage=function(){
        self.clearPage();
        self.renderPage();
    };

    self.clearPage=function(){
        self.list.html("");
    };


    self.renderPage=function(){
        new Parse.Query(NotePage)
        .equalTo("user",cur_user)
        .equalTo("numLinkedBy",0)
        .select("name")
        .select("type")
        .find()
        .then(listFiller(self.list,makeClickHandler,makeDeleteHandler));

        function makeClickHandler(item){
            return function(e){
                e.preventDefault();
                Pager.stateData.cur_item_id=item.id;
                if(item.get("type")=="linker") Pager.goTo("#viewLinkerPage");
                else if(item.get("type")=="note") Pager.goTo("#viewNotePage");
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
            self.pre_content.html(self.pre_input.val());
            self.pre_content.typeset();
            self.latexmath=
                canonicalLatexMath.concat(
                    self.auto_input.val().split("\n"));

            self.shorts={};
            self.shortregex="(?:";
            var shortlines=self.short_input.val().split("\n");
            var atLeastOne=false;
            for(var l=0; l<shortlines.length; l++) try {
                var splitline=shortlines[l].split(/\s+/,2);
                var shortcut=splitline[0];
                var rep=(splitline.length>1) ? splitline[1] : "";
                if (shortcut=="" || rep=="") continue;
                self.shorts[shortcut]=rep;
                self.shortregex+=
                    (atLeastOne ? "|" : "")
                    +shortcut.escapeRegExp();
                atLeastOne=true;
            } catch (e) {alert(e)}
            self.shortregex+=")$";
            if(atLeastOne) self.shortregex=RegExp(self.shortregex);
            else self.shortregex=false;

            viewNotePage.memclear();
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
            },function(err){
                $("#latex_message")
                    .html("<span style='color:red'>"+err.message+"</span>");
            })
        });
        $("#latexPage form").on("change",function(e){
                $("#latex_message").html("");});

    };

    self.onPage=function(){
        self.renderPage();
    };

    self.renderPage=function(){
        self.pre_input.val(cur_user.get("preamble"));
        self.auto_input.val(cur_user.get("autocomplete"));
        self.short_input.val(cur_user.get("shortcuts"));
        $("#latex_message").html("");
        self.preview.click();
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
        self.clearPage();
        self.renderPage();
        self.memclear();
    };

    self.clearPage=function(){
        self.list.html("");
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
        .then(listFiller(self.list,makeClickHandler,false));
    
        function makeClickHandler(item){
            return function(e){
                e.preventDefault();
                Pager.stateData.cur_item_id=item.id;
                if(item.get("type")=="linker") Pager.goTo("#viewLinkerPage");
                else if(item.get("type")=="note") Pager.goTo("#viewNotePage");
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
        self.renderPage();
    };
    self.renderPage=function(){
        $("#user_name").val(cur_user.get('displayname'));
        $("#user_email").val(cur_user.get('email'));
        $("#user_bio").val(cur_user.get('bio'));
        $("#user_message").html("");
    };
};


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
