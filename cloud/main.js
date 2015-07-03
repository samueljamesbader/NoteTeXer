var NotePage=Parse.Object.extend("NotePage");
var Tag=Parse.Object.extend("Tag");
var Tagging=Parse.Object.extend("Tagging");
//var ShareCommand=Parse.Object.extend("ShareCommand");
var Update=Parse.Object.extend("Update");

// Whenever a user is saved, make sure there's a corresponding MainPage
Parse.Cloud.beforeSave(Parse.User, function(request,response){
    var user=request.object;
    var acl=new Parse.ACL();
    acl.setPublicReadAccess(true);
    acl.setPublicWriteAccess(false);
    user.setACL(acl);
    if (!user.get("displayname")
            || user.get("username")!=user.get("displayname").toLowerCase())
        user.set("displayname",user.get("username"));
    response.success();
});

Parse.Cloud.afterSave(Parse.User, function(request){
    var mainpage=request.object.get("mainpage");
    if(!mainpage)
        Parse.Cloud.run("startOffUser");
});

Parse.Cloud.define("startOffUser",function(request,response){

    var startTime=new Date().getTime();

    var acl=new Parse.ACL();
    acl.setReadAccess(request.user.id,true);

    var mainpage=new NotePage({
        name: request.user.get("displayname")+"'s Links",
        content: "",
        type: "linker",
        numLinkedBy: 1});
    mainpage.set("user",request.user);
    mainpage.setACL(acl);

    var tutpage=new NotePage({
        name: "Tutorial",
        content: "",
        type: "linker",
        numLinkedBy: 1});
    tutpage.set("user",request.user);
    tutpage.setACL(acl);


    var demotut=new NotePage();
    //switch (Parse.applicationId) {
        //case "BpecqAIXnfUMeHOvOUBbK1VhAUkds9tw9aX2UzXA":
    demotut.id="gcCPxkBnZZ";
            //break;
        //case "AwwBjiQvHGPB5AG3vHKRFBkYWeguCQxKw00Xjhgv":
            //demotut.id="gcCPxkBnZZ";
            //break;
    //}
    demotut.relation("linksTo").query()
    .each(function(t){
        console.log(t.get('name'));
        tutpage.relation("linksTo").add(t);
    })
    .then(function(res){
        console.log('about to save tp');
        return tutpage.save(null,{useMasterKey: true})
    })
    .then(function(res){
        console.log('about to add tp to mp');
        mainpage.relation("linksTo").add(tutpage);
        return mainpage.save(null,{useMasterKey: true})
    })
    .then(function(res){
        console.log("Saved mainpage");
        return new Parse.Query(Parse.User)
            .equalTo("username","demo")
            .limit(1)
            .find({useMasterKey: true})
    })
    .then(function(d){
        request.user.set("mainpage",mainpage);
        request.user.set("preamble",d[0].get("preamble"));
        request.user.set("autocomplete",d[0].get("autocomplete"));
        request.user.set("shortcuts",d[0].get("shortcuts"));
        return request.user.save();
    })
    .then(function(res){
        console.log("Total time");
        console.log(new Date().getTime()-startTime);
        response.success();
    },function(err){
        response.error(err)
    });
});


Parse.Cloud.define("createNotePage",function(request,response){
    if(! request.params.name) {
        response.error("Must supply a name!");
        return;
    }
    else if(!(request.params.type=="linker" || request.params.type=="note")) {
        response.error("Invalid NotePage type!");
        return;
    }

    new Parse.Query("NotePage")
        .equalTo("user",request.user)
        .equalTo("name",request.params.name)
        .limit(1)
        .find()
    .then(function(res){
        if(res.length)
            return Parse.Promise.error(
                new Parse.Error(Parse.Error.DUPLICATE_VALUE,
                    "A NotePage with that name already exists"));
    })
    .then(function(res){
        var acl=new Parse.ACL();
        acl.setReadAccess(request.user,true);
        var np= new NotePage({
                name: request.params.name,
                content: request.params.content || "",
                type: request.params.type,
                numLinkedBy: 0,
                user: request.user
            });
        np.setACL(acl);
        return np.save(null,{useMasterKey: true});
    })
    .then(function(res){
        response.success(res)
    },function(error){
        response.error(error.message)
    });
});


Parse.Cloud.define("addLink",function(request,response){
    if(!(request.params.fromId && request.params.toId)) {
        response.error("Must give a 'toId' and 'fromId' to make a link!");
        return;
    }
    
    var fromObj;
    var toObj;
    new Parse.Query("NotePage").get(request.params.fromId)
    .then(function(res){
        fromObj=res;
        return new Parse.Query("NotePage").get(request.params.toId)
    })
    .then(function(res){
        toObj=res;
        return fromObj.relation("linksTo").query()
            .equalTo("objectId",toObj.id)
            .limit(1)
            .find()
    })
    .then(function(res){
        if(res.length) return Parse.Promise.error("This link already exists");
    })
    .then(function(res){
        return addLink(fromObj,toObj,request.user);
    })
    .then(function(res){
        response.success();
    },function(error){
        response.error(error);
    });

});
function addLink(fromObj,toObj,user){
    return (function(){
        if(toObj.get("user").id==user.id){
            console.log('one of mine');
            return new Update({note: toObj, change: "recount"})
                .save(null,{useMasterKey: true});
        }
        else return Parse.Promise.as();
    })()
    .then(function(res){
        console.log('at the relation part');
        fromObj.relation("linksTo").add(toObj);
        return fromObj.save(null,{useMasterKey: true});
    })
};

Parse.Cloud.define("removeLink",function(request,response){
    if(!(request.params.fromId && request.params.toId))
        response.error("Must give a 'toId' and 'fromId' to make a link!");

    var fromObj;
    var toObj;
    new Parse.Query("NotePage").get(request.params.fromId)
    .then(function(res){
        fromObj=res;
        return fromObj.relation("linksTo").query()
            .equalTo("objectId",request.params.toId)
            .limit(1)
            .find();
    })
    .then(function(res){
        if(!res.length)
            return Parse.Promise.error("This link does not exist.");
        else
            toObj=res[0];
    })
    .then(function(res){
        return removeLink(fromObj,toObj,request.user);
    })
    .then(function(res){
        response.success();
    },function(error){
        response.error(error);
    });

});

function removeLink(fromObj,toObj,user){
    return (function(){
        if(toObj.get("user").id==user.id){
            return new Update({note: toObj, change: "recount"})
                .save(null,{useMasterKey: true});
        }
        else return Parse.Promise.as();
    })()
    .then(function(res){
        fromObj.relation("linksTo").remove(toObj);
        return fromObj.save(null,{useMasterKey: true});
    })
};

Parse.Cloud.define("renameNotePage",function(request,response){
    if(!(request.params.noteId && request.params.newName)){
        response.error("Must give a note Id and a new name");
        return;
    }

    new Parse.Query(NotePage).get(request.params.noteId)
    .then(function(res){
        notePage=res;
        if(notePage.get("user").id!=request.user.id)
            return Parse.Promise.error("You don't own this note.");
        else {
            notePage.set("name",request.params.newName);
            return notePage.save(null, {useMasterKey:true});
        }
    })
    .then(function(res){
        response.success();
    },function(error){
        response.error(error);
    });
    
});

Parse.Cloud.define("editText",function(request,response){
    var notePage;

    new Parse.Query(NotePage).get(request.params.noteId)
    .then(function(res){
        notePage=res;
        if(notePage.get("user").id!=request.user.id)
            return Parse.Promise.error("You don't own this note.");
        else {
            return new Update({
                    note:notePage,
                    change:"retag",
                    details:request.params.newTags})
                .save(null,{useMasterKey:true})
            .then(function(res){
                if(notePage.get("content")!=request.params.newText){
                    notePage.set("content",request.params.newText);
                    return new Update({note:new NotePage({objectId: notePage.id}),change:"editText"})
                        .save(null,{useMasterKey:true})
                    .then(function(res){
                        return notePage.save(null, {useMasterKey:true});
                    });
                }
                else return Parse.Promise.as();
            })
        }
    })
    .then(function(res){
        response.success('Edits saved');
    },function(error){
        response.error(error);
    });
});

Parse.Cloud.define("copyNotePage",function(request,response){
    console.log("startTime");
    var startTime=new Date().getTime();
    var other;
    var mine;
    var numLinks=0;
    new Parse.Query(NotePage).get(request.params.noteId)
    .then(function(theother){
        other=theother;
        mine=new NotePage({
            name: other.get('name'),
            content: other.get('content'),
            type: other.get('type'),
            user: request.user});
        var acl=new Parse.ACL();
        acl.setReadAccess(request.user.id,true);
        mine.setACL(acl);

        return other.relation("linksTo").query()
        .each(function(target){
            mine.relation("linksTo").add(target);
        })
    })
    .then(function(res){
        return mine.save(null,{useMasterKey: true})
    })
    .then(function(res){
        var taggings=[];
        return new Parse.Query(Tagging)
            .equalTo("note",other)
            .include("tag")
        .each(function(tag){
            taggings.push(new Tagging({tag:tag.get("tag"),note:mine}));
        })
        .then(function(res){
                return Parse.Object.saveAll(taggings,{useMasterKey:true});
        });
    })
    .then(function(res){
        return new Update({note: mine, change:"finishCopy", details: other.id}).save(null,{useMasterKey:true});
    })
    .then(function(res){
        console.log("Took time");
        console.log(new Date().getTime()-startTime);
        response.success(mine);
    },function(error){
        response.error(error);
    });
});

Parse.Cloud.define("deleteNotePage",function(request,response){
    var toDel;
    new Parse.Query("NotePage")
        .get(request.params.objId)
    .then(function(res){
        toDel=res;

        if(request.user.id!=toDel.get("user").id)
            return Parse.Promise.error("You don't own this note.");
    })
    .then(function(res){
        return new Parse.Query("NotePage")
            .equalTo("linksTo",toDel.id)
            .limit(1)
            .find()
    }).then(function(res){
        if(res.length)
            return Parse.Promise.error(
                "A page links to this one, can't delete");
    })
    .then(function(res){
        return toDel.relation("linksTo").query()
        .each(function(res){
            return Parse.Cloud.run("removeLink",
                {fromId: toDel.id, toId: res.id})});
    })
    .then(function(res){
        return new Parse.Query(Tagging)
            .equalTo("note",toDel)
            .each(function(tagging){
                return tagging.destroy({useMasterKey:true})})
    })
    .then(function(res){
        return toDel.destroy({useMasterKey: true});
    })
    .then(function(res){
        response.success()
    },
    function(error){
        response.error(error);
    });
});

Parse.Cloud.define("shareNotePage",function(request,response){
    console.log('snp');
    new Parse.Query("NotePage").get(request.params.noteId)
    .then(function(res){
        page=res;
        if(page.get("user").id!=request.user.id)
            return Parse.Promise.error("You don't own this note");
        else {
            page.getACL().setPublicReadAccess(request.params.share);
            return page.save(null,{useMasterKey:true})
        }
    })
    .then(function(page){
        console.log('abttomakeshareupdate');
        return new Update(
            {note: page, change: request.params.share ? "share" : "unshare"})
            .save(null,{useMasterKey: true})
    })
    .then(function(res){
        response.success("Succeeded");
    },function(error){
        response.error(error);
    });

});

Parse.Cloud.beforeSave("NotePage",function(request,response){
    request.object.set("lowercase_name",
        request.object.get("name").toLowerCase());
    response.success();
});

Parse.Cloud.afterDelete(Parse.User,function(request){
    Parse.Cloud.useMasterKey();
    new Parse.Query(NotePage)
    .equalTo("user",request.object)
    .each(function(res){res.destroy();});
});

Parse.Cloud.beforeDelete("NotePage",function(request,response){
    new Parse.Query("Tagging")
        .equalTo("note",request.object)
    .each(function(tagging){
        return tagging.destroy({useMasterKey:true})
    })
    .then(function(res){
        response.success();
    },function(err){
        response.error(err)
    });
});


Parse.Cloud.beforeDelete("Tagging",function(request,response){
    console.log('deleting');
    console.log(request.object);
    var tag;
    new Parse.Query(Tag).get(request.object.get('tag').id)
    .then(function(thetag){
        tag=thetag;
        console.log('tag');
        console.log(tag);
        return new Parse.Query(Tagging)
            .equalTo("tag",tag)
            .limit(2)
            .find()
    })
    .then(function(res){
        if (res.length==1)
            return tag.destroy({useMasterKey:true})
    })
    .then(function(res){
        response.success();
    },
    function(err){
        response.error(err.message);
    });
});

function addTag(note,tagname){
    return new Parse.Query(Tag)
        .equalTo("name",tagname)
        .limit(1)
        .find()
    .then(function(res){
        if(res.length)
            return Parse.Promise.as(res[0]);
        else
            return new Tag({name: tagname})
                .save(null,{useMasterKey:true});
    })
    .then(function(tag){
        return new Tagging({tag:tag,note:note})
            .save(null,{useMasterKey:true});
    });
}


Parse.Cloud.define("fbLoggedIn",function(request,response){
    var displayname=request.params.name;
    var name=displayname.toLowerCase();
    request.user.set('email',request.params.email);

    new Parse.Query(Parse.User).equalTo("username",name).limit(1).find({useMasterKey:true})
    .then(function(res){
        console.log('inq');
        console.log(res);
        if (!res.length)
            request.user.set('displayname',displayname);
        else
            request.user.set('displayname',displayname+" "+request.user.id);
        request.user.set('username',request.user.get('displayname').toLowerCase());
        return request.user.save();
    }).then(function(res){
        response.success();
    },function(err){
        request.user.destroy();
        response.error(err);
    })
});

Parse.Cloud.job("checkUpdates",function(request,status){
    console.log(request.params);
    var startTime=new Date().getTime();
    var loopStartTime=0;
    var maxTime=null;
    try{
        var maxTime=JSON.parse(request.params).maxTime;
    } catch(e){console.log('No maxTime given.');}
    maxTime=maxTime||(900000-3000);

    console.log("maxTime"+maxTime);
    (function updatesLoop(){
        loopStartTime=new Date().getTime();
        //console.log("started a loop");
        myEach(
            new Parse.Query(Update)
                .include("note")
                .addAscending("updatedAt"),
            function(up){
                if (up.get("note"))
                    switch(up.get("change")) {
                        case "share":
                        case "unshare":
                            return updateSharing(up);
                        case "retag":
                            return updateTagging(up);
                        case "editText":
                            return updateLinks(up);
                        case "finishCopy":
                            return finishCopy(up);
                        case "recount":
                            return updateCount(up);
                    }
                else
                    return up.destroy({useMasterKey:true});
            },
            startTime,maxTime,
            {useMasterKey:true}
            )
        .then(function(){
            if ((new Date().getTime()-startTime)>maxTime)
                status.success("running over time");
            //console.log("completed a loop");
            //console.log(loopStartTime);
            //console.log(new Date().getTime());
            while((new Date().getTime()-loopStartTime)<500)
                1+1;
            loopStartTime=new Date().getTime();
            updatesLoop();
        });
    })();


    function updateSharing(sc){
        var note=sc.get("note");
        var toShare=sc.get("change")=="share";
        return (function(){
            //console.log(sc.get("change")+"  "+note.get('name'));
            if (note.get("type")=="linker")
                return note.relation("linksTo").query()
                .each(function(childnote){
                    if(childnote.getACL().getPublicReadAccess()!=toShare
                        && note.get('user').id==childnote.get('user').id)
                        return new Update(
                            { note: childnote, change: sc.get("change")})
                            .save(null,{useMasterKey:true});
                    else
                        return Parse.Promise.as();
                },{useMasterKey:true})
            else
                return Parse.Promise.as();
        })()
        .then(function(){
            if(note.getACL().getPublicReadAccess()!=toShare){
                note.getACL().setPublicReadAccess(toShare);
                return note.save(null,{useMasterKey:true})
            }
            else
                return Parse.Promise.as();
        })
        .then(function(){
            return sc.destroy({useMasterKey:true});
        })
        .then(function(res){
            return Parse.Promise.as(res);
        },
        function(err){
            console.log(err.message);
            return sc.save();
        });
    }

    function updateTagging(up){
        var newTagNames=up.get("details").split(";")
            .map(function(t){return t.replace(/^\s*|\s*$/g,"").toLowerCase()})
            .filter(function(t){return (t!="")});
        return new Parse.Query(Tagging)
            .equalTo("note",up.get("note"))
            .include("tag")
            .find()
        .then(function(res){
            var oldTagNames=res.map(function(t){return t.get("tag").get("name")});
            var destructions=[];
            for(var ot=0; ot<oldTagNames.length; ot++)
                if(newTagNames.indexOf(oldTagNames[ot])==-1)
                    destructions.push(res[ot]);
            var creationPromises=[];
            for(var nt=0; nt<newTagNames.length; nt++)
                if(oldTagNames.indexOf(newTagNames[nt])==-1)
                    creationPromises.push(addTag(up.get("note"),newTagNames[nt]));
            return Parse.Promise.when(
                creationPromises.concat([Parse.Object.destroyAll(destructions,{useMasterKey:true})]));
        })
        .then(function(res){
            return up.destroy({useMasterKey:true});
        })
        .then(function(res){
            return Parse.Promise.as(res);
        },
        function(err){
            console.log(err.message);
            return up.save(null,{useMasterKey:true});
        });
    }

    function updateLinks(up){
        var newLinks=(up.get("note").get("content").match(/\[\[[^\]]+\]\]/g) || [])
            .map(function(ls){return ls.substring(2,ls.length-2).split('|')[0]})
            .filter(onlyUnique);
        console.log('newlinks');
        console.log(newLinks);
        return up.get("note").relation("linksTo").query().find({useMasterKey:true})
        .then(function(res){
            var oldLinks=res.map(function(l){return l.id});
            var removalPromises=[];
            for(var ol=0;ol<oldLinks.length; ol++)
                if(newLinks.indexOf(oldLinks[ol])==-1)
                    removalPromises.push(
                        removeLink(up.get("note"),res[ol],up.get("note").get("user")));
            var additionPromises=[];
            for(var nl=0; nl<newLinks.length; nl++)
                if(oldLinks.indexOf(newLinks[nl])==-1){
                    additionPromises.push(
                        new Parse.Query(NotePage).get(newLinks[nl],{useMasterKey:true})
                        .then(function(toObj){
                            return addLink(up.get("note"),toObj,up.get("note").get("user"))
                        },
                        function(err){
                            if(err.code==Parse.Error.OBJECT_NOT_FOUND){
                                console.log("Linking to unfound id.");
                                return Parse.Promise.as("Linking to unfound id");
                            }
                            else return Parse.Promise.error(err);
                        })
                    );
                }
            return Parse.Promise.when(
                removalPromises.concat(additionPromises));
        })
        .then(function(res){
            return up.destroy({useMasterKey:true});
        })
        .then(function(res){
            return Parse.Promise.as(res);
        },
        function(err){
            console.log(err.message ? err.message : err)
            return up.save(null,{useMasterKey:true});
        });
    };

    function finishCopy(up){
        var mine=up.get("note");
        var other;
        console.log('in fC');
        return new Parse.Query(NotePage).get(up.get("details"))
        .then(function(res){
            other=res;
            var newups=[];
            console.log('about to linkto');
            return other.relation("linksTo").query()
            .each(function(target){
                newups.push(new Update({note:target,change:"recount"}));
                mine.relation("linksTo").add(target);
                return Parse.Promise.as();
            })
            .then(function(res){
                console.log('about to save linkto');
                newups.push(mine);
                return Parse.Object.saveAll(newups);
            })
        })
        /*.then(function(res){     ////////////////////////////////////////////// DON'T DUPLICATE TAGS
            return new Parse.Query(Tagging)
                .equalTo("note",other)
                .include("tag")
            .each(function(tag){
                return new Tagging({tag:tag.get("tag"),note:mine})
                    .save(null,{useMasterKey:true});
            })
        })*/
        .then(function(res){
            return new Parse.Query(NotePage)
                .equalTo("linksTo",other.id)
                .equalTo("user",mine.get("user"))
            .each(function(lf){
                lf.relation("linksTo").remove(other);
                lf.relation("linksTo").add(mine);
                return lf.save(null,{useMasterKey:true});
            },{useMasterKey:true})
        })
        .then(function(res){
            return updateCount(up);
        });
    }

    function updateCount(up){
        note=up.get("note")
        console.log('in uC');
        return new Parse.Query(NotePage)
            .equalTo("linksTo",note)
            .equalTo("user",note.get("user"))
            .limit(10)
            .find()
        .then(function(res){
            note.set("numLinkedBy",res.length);
            return note.save(null,{useMasterKey:true});
        })
        .then(function(res){
            return up.destroy({useMasterKey:true});
        })
        .then(function(res){
            return Parse.Promise.as(res);
        },
        function(err){
            console.log(err.message ? err.message : err)
            return up.save(null, {useMasterKey:true});
        });
    }
});


function myEach(query,callback,startTime,maxTime,options) {   ////////////////////////////////////////////////  LIMITED TO 100 right now!!!
    return query.find(options)
    .then(function(res){
        function f(i){
            if(i<res.length)
                return callback(res[i])
                    .always(function(){
                        if ((new Date().getTime()-startTime)>maxTime)
                            return Parse.Promise.as();
                        else
                            return f(i+1);
                    });
            else return Parse.Promise.as();
        }
        return f(0);
    });
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

//function dontKill(func,killTime,margin){
 //   new
//}

