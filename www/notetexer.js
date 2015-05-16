"use strict";

var cur_user;
var Item;


function initNoteTeXer(){

    configureParse();
    configureMathJax();
    configurePager();

    splash.init();
    main.init();
    viewBinder.init();
    viewNote.init();
    addLink.init();

    Pager.takeControl("#splashPage");
}

function configureParse(){
    Parse.initialize(
        "BpecqAIXnfUMeHOvOUBbK1VhAUkds9tw9aX2UzXA",
        "Gfyrs59Z5tUBTrQzF4WwJ0tdfgAABgES9urTB6Lo");
    Item=Parse.Object.extend("Item2",
        {defaults: {name:"unnamed", type:"", content:"no content."}});
}

function configureMathJax(){
    // I load MathJax dynamically after the page is created because I've found
    // it to be unreliable just adding it in the header. Maybe something about
    // MathJax not knowing when to start, since it usually just has to wait for
    // the document to be ready, but now has to wait for an app to be ready too?
    // Procedure from: <http://docs.mathjax.org/en/latest/dynamic.html>
    // ... with a tweak from 
    // <http://docs.mathjax.org/en/latest/misc/faq.html#the-mathjax-font-folder
    // -is-too-big-is-there-any-way-to-compress-it>
    // to get rid of the image fonts (this saves tons of space).

    var head = document.getElementsByTagName("head")[0], script;
    script = document.createElement("script");
    script.type = "text/x-mathjax-config";
    script[(window.opera ? "innerHTML" : "text")] =
        "MathJax.Hub.Config({\n" +
        "  tex2jax: { inlineMath: [['$','$'], ['\\\\(','\\\\)']] },\n" + 
        "  imageFont: null,\n"+
        "});";
    head.appendChild(script);
    
    script = document.createElement("script");
    script.type = "text/javascript";
    script.src  = "http://cdn.mathjax.org/mathjax/latest/MathJax.js?"+
        "config=TeX-AMS-MML_HTMLorMML";
    head.appendChild(script);
}

function configurePager(){

    // Hijack link clicks
    $("a.hijack").click(function(e){
        e.preventDefault();
        Pager.goTo("#"+this.href.split("#")[1]);
    });

    Pager.registerPageHandler("#mainpage",main.pageHandler);
    Pager.registerPageHandler("#splashPage",splash.pageHandler);
    Pager.registerPageHandler("#viewBinderPage",viewBinder.pageHandler);
    Pager.registerPageHandler("#viewNotePage",viewNote.pageHandler);
    Pager.registerPageHandler("#addLinkPage",addLink.pageHandler);
}

var main = new function(){
    var self=this;

    self.init=function(){
        $("#mainpage_logout").click(function(e){
            e.preventDefault();
            Parse.User.logOut();
            Pager.goTo("#splashPage");
        });
    };

    self.pageHandler=function(){};
}

var splash = new function(){
    var self=this;
    
    self.init=function(){
        self.welcome=$("#splash_welcome");
        self.welcome.css("display","none");

        self.initLoginPopup();
        self.initSignupPopup();
        self.initResetPass();
    };

    self.initLoginPopup=function(){
        self.popupLogin=$("#popupLogin");
        $("#login_signup").click(function(e){
            e.preventDefault();
            self.popupLogin.popup("close");
            self.popupSignup.popup("open");
        });
        $("#login_resetpass").click(function(e){
            e.preventDefault();
            self.popupLogin.popup("close");
            self.popupResetPass.popup("open");
        });
        $("#login_submit").click(function(e){
            e.preventDefault();
            Parse.User.logIn(
                $("#login_un").val().toLowerCase(),
                $("#login_pw").val().toLowerCase(),
                {   success: function (user) {
                        localStorage["hasAccount"]=true;
                        cur_user=user;
                        self.popupLogin.popup("close");
                        self.continueToMain();
                    },
                    error: function (user,error) {
                        var w=$("#login_submit").width();
                        alert(error.code);
                        if (error.code==101)
                            error.message="incorrect username and/or password";
                        $("#login_error").text(error.message);
                        $("#login_error").width(w);
                    }
                }
            );
        });
    };

    self.initSignupPopup=function(){
        self.popupSignup=$("#popupSignup");
        $("#signup_login").click(function(e){
            e.preventDefault();
            $("#popupSignup").popup("close");
            $("#popupLogin").popup("open");
        });
        $("#signup_submit").click(function(e){
            e.preventDefault();

            var user= new Parse.User();
            user.set("username",$("#signup_un").val().toLowerCase());
            user.set("password",$("#signup_pw").val().toLowerCase());
            user.set("email",$("#signup_email").val().toLowerCase());
            user.signUp(null,{
                success: function(user) {
                    localStorage["hasAccount"]=true;
                    cur_user=user;
                    $("#popupSignup").popup("close");
                    self.continueToMain();
                },
                error: function(user,error) {
                    var w=$("#signup_submit").width();
                    $("#signup_error").text(error.message);
                    $("#signup_error").width(w);
                }
            });
        });
    };

    self.initResetPass=function(){
        self.popupResetPass=$("#popupResetPass");

        $("#resetpass_login").click(function(e){
            e.preventDefault();
            self.popupResetPass.popup("close");
            self.popupLogin.popup("open");
        });
        $("#resetpass_reset").click(function(e){
            e.preventDefault();

            Parse.User.requestPasswordReset(
                $("#resetpass_email").val().toLowerCase(),
                {
                    success: function() {
                        self.popupResetPass.popup("close");
                        self.popupLogin.popup("open");
                    },
                    error: function(error) {
                        var w=$("#resetpass_reset").width();
                        $("#resetpass_error").text(error.message);
                        $("#resetpass_error").width(w);
                    }
                }
            );
        });
    }

    self.continueToMain=function(){
        self.welcome.css("display","block");
        setTimeout(function(){Pager.goTo("#mainpage");},1500);
    }

    self.pageHandler=function(){
        self.welcome.css("display","none");
        $("#splashPage form").trigger('reset');
        cur_user=Parse.User.current();
        if(cur_user) self.continueToMain();
        else
            if (localStorage["hasAccount"]=="true")
                setTimeout(function(){self.popupLogin.popup("open");},500);
            else 
                setTimeout(function(){self.popupSignup.popup("open");},500);
    }

}


var viewBinder = new function(){
    var self=this;
    self.init=function(){
        self.list=$("#viewBinder_list");
        self.addbtn=$("#viewBinder_add");
        self.addbtn.click(function(e){
            e.preventDefault();
            $("#new_name").val("");
            $("#new_submitwrapper").addClass("ui-state-disabled");
            $("#popupAdd").popup("open");
            setTimeout(
                function() {self.addbtn.removeClass("ui-btn-active")},100);
        });

        self.initPopupAdd();
        self.initPopupNew();
        self.clearPage();
    };
    self.initPopupAdd=function(){
        self.popupAdd=$("#popupAdd");
        $("#popupAdd_new").click(function(e){
            e.preventDefault();
            self.popupAdd.popup("close");
            self.popupNew.popup("open");
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

            var new_item=new Item({
                name: name,
                user: cur_user,
                type: type
            }).save().then(function(n){
                n.relation("linkedBy").add(self.owner);
                return n.save();
            }).then(function(){
                self.renderPage();
                self.popupNew.popup("close");
            });
        });
    };
    self.pageHandler=function(){
        self.clearPage();
        if(Pager.stateData.cur_item_id)
            new Parse.Query(Item).get(Pager.stateData.cur_item_id)
                .then(function(result){
                    self.owner=self.cur_binder=result;
                    self.renderPage();
                });
        else self.renderPage();
    };
    self.clearPage=function(){
        self.cur_binder=null;
        self.owner=cur_user;
        self.list.html("");
    };
    self.makeClickHandler=function(child){
        return function(e){
            e.preventDefault();
            Pager.stateData.cur_item_id=child.id;
            if(child.get("type")=="binder") Pager.goTo("#viewBinderPage");
            else if(child.get("type")=="note") Pager.goTo("#viewNotePage");
        }
    };
    self.makeDeleteHandler=function(child){
        return function(e){
            e.preventDefault();
            child.relation("linkedBy").remove(self.owner);
            self.owner.save().then(self.renderPage);
        }
    };
    self.renderPage=function(){
        $("#viewBinder_title").text(
            self.cur_binder ? self.cur_binder.get("name") : "Your Notes");
        new Parse.Query(Item).equalTo("linkedBy",self.owner)
            .find().then(fillList);

        function fillList(children){
            self.list.html("");
            var children_ids=Pager.stateData.children_ids=[];
            if (children.length==0) {
                self.list.append("No binders!");
            }
            else{
                for (var c=0;c<children.length;c++){
                    var child=children[c];
                    children_ids.push(child.id);
                    self.list.append($("<li class='ui-li-has-alt'></li>")
                        .addClass(
                            (c==0)? "ui-first-child":
                            (c==children.length-1)? "ui-last-child": "")
                        .append($("<a href='#'></a>")
                            .addClass(child.get("type")=="binder" ?
                                "ui-btn ui-btn-icon-left ui-icon-bars":
                                "ui-btn ui-btn-icon-left ui-icon-comment")
                            .click(self.makeClickHandler(child))
                            .text(children[c].get("name")))
                        .append($("<a href='#'></a>")
                            .addClass(
                                "ui-btn ui-btn-icon-notext ui-icon-delete")
                            .click(self.makeDeleteHandler(child)))
                        );
                }
            }
        }
    }

};


var viewNote = new function(){
    var self=this;

    self.init=function(){
        self.footer=$("#viewNote_footer");
        self.inp=$("#viewNote_input");
        self.editbtn=$("#viewNote_edit");
        self.content=$("#viewNote_content")

        $("#viewNote_preview").click(function(e){
            e.preventDefault();
            self.content.html(self.inp.val()); 

            // See http://docs.mathjax.org/en/latest/typeset.html
            MathJax.Hub.Queue(["Typeset",MathJax.Hub,self.content.get(0)]);
        });
        $("#viewNote_save").click(function(e){
            e.preventDefault();
            self.cur_note.set("content",self.inp.val());
            self.cur_note.save()
            self.footer.css("display","none");
            self.inp.css("display","none");
        });
        self.editbtn.click(function(e){
            e.preventDefault();
            if(self.editbtn.text()=="Edit"){
                self.footer.css("display","block");
                self.inp.css("display","block");
                self.inp.trigger("keyup");
                self.editbtn.text("Cancel");
            }
            else if(self.editbtn.text()=="Cancel"){
                self.footer.css("display","none");
                self.inp.css("display","none");
                self.editbtn.text("Edit");
                self.inp.val(self.inp.text());
            }
        });
    }

    self.pageHandler=function(){
        self.clearPage();
        if(Pager.stateData.cur_item_id)
            new Parse.Query(Item).get(Pager.stateData.cur_item_id)
                .then(function(result){
                    self.cur_note=result;
                    self.renderPage();
                });
    }

    self.clearPage=function(){
        self.inp.val("");
        self.inp.text("");
        self.content.html("");
        if(self.editbtn.text()=="Cancel")
            self.editbtn.click();
    }

    self.renderPage=function(){
        $("#viewNote_title").text( self.cur_note.get("name"));
        self.inp.text( self.cur_note.get("content"));
        self.inp.val(  self.cur_note.get("content"));
        $("#viewNote_preview").click();
    }
}

////////////////


var addLink = new function(){
    var self=this;

    self.init=function(){
        self.list=$("#addLink_list");
    };

    self.pageHandler=function(){
        self.clearPage();
        if(Pager.stateData.cur_item_id)
            new Parse.Query(Item).get(Pager.stateData.cur_item_id)
                .then(function(result){
                    self.owner=self.cur_binder=result;
                    self.renderPage();
                });
        else self.renderPage();
    };

    self.clearPage=function(){
        self.owner=cur_user;
        self.cur_binder=null;
        self.list.html("");
    };

    self.makeClickHandler=function(child){
        return function(e){
            e.preventDefault();
            alert("adding "+child.get("name"));
            child.owner.relation("linkedBy").add(self.owner);
            self.owner.save().then(Pager.goBack);
        }
    };
    self.renderPage=function(){
        console.log(self.owner.id);
        var query=new Parse.Query(Item);
        query.equalTo("user",cur_user);
        query.select("name");
        query.find().then(fillList);
    
        function fillList(children){
            console.log(Pager.stateData.children_ids);
            console.log("children:");
            console.log(children);
            if (children.length==0) {
                self.list.append("No notes or binders!");
            }
            else{
                for (var c=0;c<children.length;c++){
                    console.log(c);
                    var child=children[c];
                    if ($.inArray(child.id,Pager.stateData.children_ids)!=-1)
                        continue;
                    self.list.append($("<li class='ui-field-contain'></li>")
                        .addClass(
                            (c==0)? "ui-first-child":
                            (c==children.length-1)? "ui-last-child":
                            "")
                        .addClass("ui-li-has-alt")
                        .append($("<a href='#'></a>")
                            .addClass(child.get("type")=="binder" ?
                                "ui-btn ui-btn-icon-left ui-icon-bars":
                                "ui-btn ui-btn-icon-left ui-icon-comment")
                            .click(self.makeClickHandler(child))
                            .text(children[c].get("name")))
                        );
                }
            }
        }
    }
}

//////////////////



$(window).load(initNoteTeXer);
